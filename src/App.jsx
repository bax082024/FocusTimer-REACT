import { useEffect, useMemo, useState } from "react";
import ThemeToggle from "./components/ThemeToggle.jsx";
import Timer from "./components/Timer.jsx";

const THEME_KEY = "focusflow:theme";
const SETTINGS_KEY = "focusflow:settings";
const LOG_KEY = "focusflow:log";

const DEFAULTS = {
  focus: 25,
  short: 5,
  long: 15,
  cyclesBeforeLong: 4,
};

export default function App() {
  // theme
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // settings
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULTS;
  });
  useEffect(() => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)), [settings]);

  // session log
  const [log, setLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => localStorage.setItem(LOG_KEY, JSON.stringify(log)), [log]);

  function onSessionComplete(session) {
    setLog(prev => [session, ...prev].slice(0, 50));
  }

  const stats = useMemo(() => {
    const total = log.length;
    const focusCount = log.filter(s => s.mode === "focus").length;
    const focusMin = Math.round(
      log.filter(s => s.mode === "focus").reduce((acc, s) => acc + s.plannedSec, 0) / 60
    );
    return { total, focusCount, focusMin };
  }, [log]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Bax Focus</h1>
        <p className="subtitle">Pomodoro timer — React + Vite</p>
        <div className="header-controls">
          <ThemeToggle theme={theme} onToggle={() => setTheme(t => (t === "dark" ? "light" : "dark"))} />
        </div>
      </header>

      <main>
        <section className="panel">
          <div className="settings">
            <NumberField label="Focus"   value={settings.focus} onChange={v => setSettings(s => ({...s, focus:v}))} />
            <NumberField label="Short"   value={settings.short} onChange={v => setSettings(s => ({...s, short:v}))} />
            <NumberField label="Long"    value={settings.long} onChange={v => setSettings(s => ({...s, long:v}))} />
            <NumberField label="Cycles"  value={settings.cyclesBeforeLong} min={2} max={8}
              onChange={v => setSettings(s => ({...s, cyclesBeforeLong:v}))} />
          </div>

          <Timer settings={settings} onSessionComplete={onSessionComplete} />
        </section>

        <section className="log panel">
          <h3>Recent sessions</h3>
          {log.length === 0 ? (
            <p className="empty">No sessions yet. Hit <strong>Start</strong> to begin.</p>
          ) : (
            <ul className="log__list">
              {log.map(s => (
                <li key={s.id} className={`log__item log--${s.mode}`}>
                  <span className="badge">{s.mode}</span>
                  <span>{new Date(s.startedAt).toLocaleTimeString()} → {new Date(s.finishedAt).toLocaleTimeString()}</span>
                  <span>{Math.round(s.plannedSec/60)} min</span>
                </li>
              ))}
            </ul>
          )}
          <div className="stats">
            <span>Total: {stats.total}</span>
            <span>Focus sessions: {stats.focusCount}</span>
            <span>Focus minutes: {stats.focusMin}</span>
            <button className="btn btn--ghost" onClick={() => setLog([])}>Clear history</button>
          </div>
        </section>
      </main>

      <footer className="app__footer">
        <span>Built with ❤️ using React</span>
      </footer>
    </div>
  );
}

function NumberField({ label, value, onChange, min=1, max=120 }) {
  return (
    <label className="numfield">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
      />
      <span className="unit">min</span>
    </label>
  );
}
