import { useEffect, useRef, useState } from "react";

// ====== Justera här ======
const COLOR = "#ff7eb6"; // används av både linje och kärna
const SIZE = 600;
const POINTS = 48; // måste vara jämnt
const MIN_R = 100;
const MAX_R = 240;
const SMOOTH = 0.35;
const LINE_WIDTH = 2;

const CORE_MODE = "ring"; // "solid" = fylld, "ring" = genomskinlig med ring
const CORE_SCALE = 0.8;
const PULSE = 0.18;
const GLOW = 60;
const BASS_BINS = 10;

// Formen på linjen
const BIN_LO = 30; // lägsta frekvensbin (~65 Hz)
const BIN_HI = 300; // högsta frekvensbin (~6,5 kHz)
const TILT = 0.5; // var 1.2
const FLOOR = 0.35; // allt under denna nivå (0–1) räknas som tyst
const CURVE = 1.8; // >1 trycker ner små värden så toppar sticker ut
const GAIN = 1.0; // total förstärkning av utslagen
// =========================

const AXIS_MAX = MAX_R + 50;
const INNER_PX = (SIZE / 2) * (MIN_R / AXIS_MAX);
const CORE_PX = Math.round(INNER_PX * 2 * CORE_SCALE);

// Härledda värden: måste ligga efter konstanterna ovan
const HALF = POINTS / 2;
const bandRanges = Array.from({ length: HALF + 1 }, (_, b) => {
  const f = (x) => BIN_LO * Math.pow(BIN_HI / BIN_LO, x / (HALF + 1));
  const s = Math.floor(f(b));
  const e = Math.max(s + 1, Math.floor(f(b + 1)));
  return [s, e];
});

export default function Beat({ src = "/music/track.mp3" }) {
  const elRef = useRef(null);
  const coreRef = useRef(null);
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

    // Linje: samma färg som kärnan, ingen gradient
    opt.series[0].data = Array.from({ length: 361 }, (_, a) => [MIN_R, a]);
    opt.series[0].smooth = SMOOTH;
    opt.series[0].lineStyle = {
      color: COLOR,
      width: LINE_WIDTH,
      shadowColor: COLOR,
      shadowBlur: 12,
    };

    // Ingen yttre linje, och dölj originalkärnan
    opt.series[1].lineStyle = { opacity: 0, width: 0, shadowBlur: 0 };
    opt.series[2].symbolSize = 0;

    // Mjukad nivå (0–1) som driver kärnan
    let level = 0;

    wave._generateWaveData = function (freq) {
      // 1. Ett värde (0–1) per frekvensband, logaritmiskt fördelade
      const bandVal = bandRanges.map(([s, e], b) => {
        let sum = 0;
        for (let k = s; k < e; k++) sum += freq[k];

        let v = sum / (e - s) / 255; // 0–1
        v = Math.max(0, (v - FLOOR) / (1 - FLOOR)); // ta bort "golvet"
        v = Math.pow(v, CURVE); // gör toppar tydligare
        v = v * (1 + TILT * (b / HALF)) * GAIN; // tilt efter grinden, så brus inte förstärks
        return Math.min(1, v);
      });

      // 2. Spegla runt cirkeln: band 0 (bas) nederst, högsta bandet överst
      const data = [];
      let maxR = 0;
      for (let j = 0; j < POINTS; j++) {
        const d = Math.abs(j - HALF); // 0 = nederst, HALF = överst
        const r =
          bandVal[d] * (this.maxChartValue - this.minChartValue) +
          this.minChartValue;
        if (r > maxR) maxR = r;
        data.push([r, (360 / POINTS) * j]);
      }
      data.push([data[0][0], 360]); // stäng cirkeln (samma värde som j=0, ingen spets)

      // 3. Kärnan (oförändrad)
      let bass = 0;
      for (let k = 0; k < BASS_BINS; k++) bass += freq[k];
      bass = bass / BASS_BINS / 255;
      level = bass > level ? bass : level * 0.9;

      const core = coreRef.current;
      if (core) {
        core.style.transform = `translate(-50%, -50%) scale(${1 + level * PULSE})`;
        core.style.setProperty("--lvl", level.toFixed(3));
      }

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
    if (!wave) return;
    await wave.context.resume();
    wave.play();
    setStarted(true);
  };

  const light = `color-mix(in srgb, ${COLOR}, white 45%)`;
  const soft = `color-mix(in srgb, ${COLOR} 30%, transparent)`;
  const faint = `color-mix(in srgb, ${COLOR} 12%, transparent)`;

  const innerStyle =
    CORE_MODE === "ring"
      ? {
          background: `radial-gradient(circle, ${faint} 0%, ${soft} 100%)`,
          border: `2px solid ${COLOR}`,
          boxShadow: `0 0 calc(10px + var(--lvl, 0) * ${GLOW}px) ${COLOR},
                      inset 0 0 calc(10px + var(--lvl, 0) * ${GLOW / 2}px) ${COLOR}`,
        }
      : {
          background: `radial-gradient(circle at 35% 30%, ${light}, ${COLOR} 65%)`,
          boxShadow: `0 0 calc(15px + var(--lvl, 0) * ${GLOW}px) ${COLOR}`,
        };

  return (
    <div>
      <style>{`
        @keyframes coreBreathe {
          0%, 100% { transform: scale(1);    filter: brightness(1); }
          50%      { transform: scale(1.04); filter: brightness(1.12); }
        }
      `}</style>

      <div
        style={{
          position: "relative",
          width: SIZE,
          height: SIZE,
          background: "#111",
        }}
      >
        <div ref={elRef} style={{ width: "100%", height: "100%" }} />

        {/* Yttre div: styrs av ljudet. Inre div: lugn "andning" hela tiden. */}
        <div
          ref={coreRef}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: CORE_PX,
            height: CORE_PX,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            willChange: "transform",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              animation: "coreBreathe 3.5s ease-in-out infinite",
              ...innerStyle,
            }}
          />
        </div>
      </div>

      <button onClick={handlePlay} disabled={!ready || started}>
        {ready ? "Play" : "Laddar ljud..."}
      </button>
    </div>
  );
}
