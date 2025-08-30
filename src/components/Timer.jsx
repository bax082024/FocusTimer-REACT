import { useEffect, useMemo, useRef, useState } from "react";

const MODES = {
  focus: { label: "Focus", color: "var(--accent)" },
  short: { label: "Short", color: "var(--accent-2)" },
  long:  { label: "Long",  color: "var(--accent-3)" },
};

export default function Timer({
  settings,
  onSessionComplete,
  soundOn = true, 
}) {
  const [mode, setMode] = useState("focus");
  const [isRunning, setIsRunning] = useState(false);
  const [cycle, setCycle] = useState(1);
  const totalSec = useMemo(() => minsToSec(settings[mode]), [settings, mode]);
  const [left, setLeft] = useState(totalSec);
  const startedAtRef = useRef(null);

  const audioCtxRef = useRef(null);
  function ensureCtx() {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtxRef.current = new Ctx();
    }
    audioCtxRef.current.resume?.();
    return audioCtxRef.current;
  }

  function beepPattern() {
    if (!soundOn) return;
    const ctx = ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    const play = (offset, freq, dur = 0.16, gain = 0.9) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(ctx.destination);

      g.gain.setValueAtTime(0.0001, now + offset);
      g.gain.linearRampToValueAtTime(gain, now + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + offset + dur);

      osc.start(now + offset);
      osc.stop(now + offset + dur + 0.02);
    };

    play(0.00, 1046);
    play(0.20, 1318); 
    play(0.40, 1568, 0.22);
  }

  const primedRef = useRef(false);
  function primeAudio() {
    if (primedRef.current) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.01);
    primedRef.current = true;
  }

  useEffect(() => {
    const fn = () => audioCtxRef.current?.resume?.();
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, []);

  useEffect(() => { if (!isRunning) setLeft(totalSec); }, [totalSec, isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  useEffect(() => {
    if (left !== 0 || !isRunning) return;

    try { beepPattern(); } catch {}

    const finished = {
      id: crypto.randomUUID(),
      mode,
      plannedSec: totalSec,
      startedAt: startedAtRef.current ?? Date.now(),
      finishedAt: Date.now(),
    };
    onSessionComplete?.(finished);
    setIsRunning(false);

    if (mode === "focus") {
      const nextCycle = cycle + 1;
      if (nextCycle > settings.cyclesBeforeLong) {
        setMode("long");
        setCycle(1);
      } else {
        setMode("short");
        setCycle(nextCycle);
      }
    } else {
      setMode("focus");
    }

    setTimeout(() => setLeft(minsToSec(settings[
      mode === "focus" ? (cycle + 1 > settings.cyclesBeforeLong ? "long" : "short") : "focus"
    ])), 0);
  }, [left, isRunning]);

  function start() {
    if (left === 0) setLeft(totalSec);
    if (!isRunning) startedAtRef.current = Date.now();
    primeAudio();
    setIsRunning(true);
  }
  function pause() { setIsRunning(false); }
  function reset() { setIsRunning(false); setLeft(totalSec); }

  function switchMode(next) {
    setIsRunning(false);
    setMode(next);
    if (next === "focus") setCycle(1);
  }

  const pct = Math.round(((totalSec - left) / totalSec) * 100);

  return (
    <section className="timer">
      <div className="mode-tabs">
        {Object.entries(MODES).map(([k, v]) => (
          <button
            key={k}
            className={`tab ${mode === k ? "is-active" : ""}`}
            style={{"--tab-color": v.color}}
            onClick={() => switchMode(k)}
            type="button"
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="time" style={{ color: MODES[mode].color }}>
        {fmt(left)}
      </div>

      <div className="progress">
        <div className="progress__bar" style={{ width: `${pct}%`, background: MODES[mode].color }} />
      </div>

      <div className="controls">
        {!isRunning ? (
          <button className="btn btn--primary" onClick={start}>Start</button>
        ) : (
          <button className="btn" onClick={pause}>Pause</button>
        )}
        <button className="btn btn--ghost" onClick={reset}>Reset</button>
      </div>

      <div className="cycle">Cycle: {cycle}/{settings.cyclesBeforeLong}</div>
    </section>
  );
}

const minsToSec = (m) => Math.max(1, Math.round(m)) * 60;
const pad = (n) => (n < 10 ? "0" + n : "" + n);
function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${pad(m)}:${pad(s)}`;
}
