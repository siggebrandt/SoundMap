import { useEffect, useRef, useState } from "react";

const COLOR = "rgba(255, 126, 182, 0.55)"; // används av både linje och kärna
const INNER_COLOR = "rgba(255, 126, 182, 0.10)";
const CORE_COLOR = "rgba(194, 155, 255, 0.18)";
const SIZE = 100;
const POINTS = 48; // måste vara jämnt
const MIN_R = 100;
const MAX_R = 240;
const INNER_BASE_SCALE = 0.75;
const INNER_MOTION = 1;
const SMOOTH = 0.35;
const INNER_SMOOTH = 0.8;
const LINE_WIDTH = 0;

// Formen på linjen
const BIN_LO = 30; // lägsta frekvensbin (~65 Hz)
const BIN_HI = 300; // högsta frekvensbin (~6,5 kHz)
const INNER_BIN_LO = 6;
const INNER_BIN_HI = 30;
const CORE_BIN_LO = 1;
const CORE_BIN_HI = 6;
const CORE_BASE_SCALE = 0.48;
const TILT = 0.5; // var 1.2
const FLOOR = 0.45; // allt under denna nivå (0–1) räknas som tyst
const CURVE = 2.0; // >1 trycker ner små värden så toppar sticker ut
const GAIN = 0.7; // total förstärkning av utslagen
// =========================

const AXIS_MAX = MAX_R + 50;

// Härledda värden: måste ligga efter konstanterna ovan
const HALF = POINTS / 2;
const createBandRanges = (binLo, binHi) =>
  Array.from({ length: HALF + 1 }, (_, b) => {
    const f = (x) => binLo * Math.pow(binHi / binLo, x / (HALF + 1));
    const s = Math.floor(f(b));
    const e = Math.max(s + 1, Math.floor(f(b + 1)));
    return [s, e];
  });
const bandRanges = createBandRanges(BIN_LO, BIN_HI);
const innerBandRanges = createBandRanges(INNER_BIN_LO, INNER_BIN_HI);
const coreBandRanges = createBandRanges(CORE_BIN_LO, CORE_BIN_HI);

const getBandValues = (freq, ranges) =>
  ranges.map(([s, e], b) => {
    let sum = 0;
    for (let k = s; k < e; k++) sum += freq[k];

    let value = sum / (e - s) / 255;
    value = Math.max(0, (value - FLOOR) / (1 - FLOOR));
    value = Math.pow(value, CURVE);
    value *= (1 + TILT * (b / HALF)) * GAIN;
    return Math.min(1, value);
  });

export default function Beat({ src = "/music/track.mp3" }) {
  const elRef = useRef(null);
  const waveRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line no-undef
    const Wave =
      typeof CircularAudioWave !== "undefined" ? CircularAudioWave : null;
    if (!Wave) {
      console.error("CircularAudioWave saknas, laddas scriptet i index.html?");
      return;
    }

    const el = elRef.current;
    const wave = new Wave(el, { loop: true });
    wave.minChartValue = MIN_R;
    wave.maxChartValue = MAX_R;

    const opt = wave.chartOption;
    opt.radiusAxis.max = AXIS_MAX;
    opt.backgroundColor = "transparent";
    opt.polar.backgroundColor = "transparent";

    // Fyll området innanför vågformen och behåll en tydlig ytterlinje.
    opt.series[0].data = Array.from({ length: 361 }, (_, a) => [MIN_R, a]);
    opt.series[0].smooth = SMOOTH;
    opt.series[0].areaStyle = {
      color: COLOR,
      opacity: 1,
    };
    opt.series[0].lineStyle = {
      color: COLOR,
      width: LINE_WIDTH,
      shadowColor: COLOR,
      shadowBlur: 12,
    };

    // Ingen yttre linje, och dölj originalkärnan
    opt.series[1].lineStyle = { opacity: 0, width: 0, shadowBlur: 0 };
    opt.series[2].symbolSize = 0;
    opt.series.push({
      coordinateSystem: "polar",
      name: "inner-wave",
      type: "line",
      showSymbol: false,
      smooth: INNER_SMOOTH,
      areaStyle: {
        color: INNER_COLOR,
        opacity: 1,
      },
      lineStyle: {
        color: INNER_COLOR,
        width: LINE_WIDTH,
        shadowColor: INNER_COLOR,
        shadowBlur: 12,
      },
      data: Array.from({ length: 361 }, (_, a) => [
        MIN_R * INNER_BASE_SCALE,
        a,
      ]),
      silent: true,
      hoverAnimation: false,
      z: 3,
    });
    opt.series.push({
      coordinateSystem: "polar",
      name: "core-wave",
      type: "line",
      showSymbol: false,
      smooth: INNER_SMOOTH,
      areaStyle: {
        color: CORE_COLOR,
        opacity: 1,
      },
      lineStyle: {
        color: CORE_COLOR,
        width: LINE_WIDTH,
        shadowColor: CORE_COLOR,
        shadowBlur: 12,
      },
      data: Array.from({ length: 361 }, (_, a) => [
        MIN_R * CORE_BASE_SCALE,
        a,
      ]),
      silent: true,
      hoverAnimation: false,
      z: 4,
    });

    wave._generateWaveData = function (freq) {
      const bandVal = getBandValues(freq, bandRanges);
      const innerBandVal = getBandValues(freq, innerBandRanges);
      const coreBandVal = getBandValues(freq, coreBandRanges);

      // 2. Spegla runt cirkeln: band 0 (bas) nederst, högsta bandet överst
      const data = [];
      const innerData = [];
      const coreData = [];
      let maxR = 0;
      for (let j = 0; j < POINTS; j++) {
        const d = Math.abs(j - HALF); // 0 = nederst, HALF = överst
        const r =
          bandVal[d] * (this.maxChartValue - this.minChartValue) +
          this.minChartValue;
        if (r > maxR) maxR = r;
        data.push([r, (360 / POINTS) * j]);
        const innerR =
          this.minChartValue * INNER_BASE_SCALE +
          innerBandVal[d] *
            (this.maxChartValue - this.minChartValue) *
            INNER_BASE_SCALE *
            INNER_MOTION;
        innerData.push([innerR, (360 / POINTS) * j]);
        const coreR =
          this.minChartValue * CORE_BASE_SCALE +
          coreBandVal[d] *
            (this.maxChartValue - this.minChartValue) *
            CORE_BASE_SCALE;
        coreData.push([coreR, (360 / POINTS) * j]);
      }
      data.push([data[0][0], 360]); // stäng cirkeln (samma värde som j=0, ingen spets)
      innerData.push([innerData[0][0], 360]);
      coreData.push([coreData[0][0], 360]);
      this.chartOption.series[3].data = innerData;
      this.chartOption.series[4].data = coreData;

      return { maxR, data };
    };

    waveRef.current = wave;
    let cancelled = false;
    wave.loadAudio(src).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      wave._init = () => {};
      wave.playing = false;
      wave.sourceNode.onended = null;
      try {
        wave.sourceNode.stop();
      } catch {}
      try {
        wave.context.close();
      } catch {}
      wave.destroy();
      waveRef.current = null;
      setReady(false);
      setStarted(false);
    };
  }, [src]);

  const handlePlay = async () => {
    const wave = waveRef.current;
    if (!wave || !ready || started) return;
    await wave.context.resume();
    wave.play();
    setStarted(true);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handlePlay}
        disabled={!ready || started}
        aria-label={ready ? "Play beat" : "Loading beat"}
        style={{
          position: "relative",
          width: SIZE,
          height: SIZE,
          background: "transparent",
          transform: "translate(var(--beat-offset-x), var(--beat-offset-y))",
          border: 0,
          padding: 0,
          cursor: ready && !started ? "pointer" : "default",
        }}
      >
        <div ref={elRef} style={{ width: "100%", height: "100%" }} />
      </button>
      {!ready && <p role="status">Laddar ljud...</p>}
    </div>
  );
}
