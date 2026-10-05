import { useEffect, useRef } from "react";
import CircularAudioWave from "circular-audio-wave/dist/circular-audio-wave.min.js";

export default function Beat({ src = "/music/madagascar.mp3" }) {
  const elRef = useRef(null);
  const waveRef = useRef(null);

  useEffect(() => {
    waveRef.current = new CircularAudioWave(elRef.current, { loop: true });
    waveRef.current.loadAudio(src);
  }, [src]);

  return (
    <div>
      <div ref={elRef} style={{ width: 500, height: 500 }} />
      <button onClick={() => waveRef.current?.play()}>Play</button>
    </div>
  );
}
