import { useEffect, useMemo, useRef, useState } from "react";

const MODES = {
  focus: { label: "Focus", color: "var(--accent)" },
  short: { label: "Short", color: "var(--accent-2)" },
  long:  { label: "Long",  color: "var(--accent-3)" },
};

export default function Timer({
  settings,                // {focus, short, long, cyclesBeforeLong}
  onSessionComplete,       // (session) => void
  soundOn = true,          // NEW: play beep when a session ends
}) {
  const [mode, setMode] = useState("focus");
  const [isRunning, setIsRunning] = useState(false);
  const [cycle, setCycle] = useState(1);
  const totalSec = useMemo(() => minsToSec(settings[mode]), [settings, mode]);
  const [left, setLeft] = useState(totalSec);
  const startedAtRef = useRef(null);

  // ---- AudioContext (primed on Start) ----
  const audioCtxRef = useRef(null);
  function ensureCtx() {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    // resume in case it was auto-suspended
    audioCtxRef.current.resume?.();
    return audioCtxRef.current;
  }
  function beepPattern() {
    const ctx = ensureCtx();
    const now = ctx.currentTime;

    // small 3-tone "ding"
    const play = (offset, freq, dur = 0.14, gain = 0.8) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);

      g.gain.setValueAtTime(0.0001, now + offset);
      g.gain.linearRampToValueAtTime(gain, now + offset + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + offset + dur);

      o.start(now + offset);
      o.stop(now + offset + dur + 0.02);
    };

    play(0.00, 1046);  // C6
    play(0.18, 1318);  // E6
    play(0.36, 1568, 0.18); // G6 (slightly longer)
  }

  // reset left whenever settings/mode changes (if not running)
  useEffect(() => { if (!isRunning) setLeft(totalSec); }, [totalSec, isRunning]);

  // tick each second
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  // when reaches 0, complete session and auto-switch
  useEffect(() => {
    if (left !== 0 || !isRunning) return;

    // play beep
    if (soundOn) {
      try { beepPattern(); } catch {}
    }

    const finished = {
      id: crypto.randomUUID(),
      mode,
      plannedSec: totalSec,
      startedAt: startedAtRef.current ?? Date.now(),
      finishedAt: Date.now(),
    };
    onSessionComplete?.(finished);
    setIsRunning(false);

    // auto advance
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

    // reset time for next session
    setTimeout(() => setLeft(minsToSec(settings[mode === "focus"
      ? (cycle + 1 > settings.cyclesBeforeLong ? "long" : "short")
      : "focus"])), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, isRunning]);

  function start() {
    if (left === 0) setLeft(totalSec);
    if (!isRunning) startedAtRef.current = Date.now();
    // prime audio on user gesture
    try { ensureCtx(); } catch {}
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
