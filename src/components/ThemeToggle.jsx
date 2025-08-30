export default function ThemeToggle({ theme, onToggle }) {
  const isLight = theme === "light";
  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      aria-label="Toggle theme"
      title={isLight ? "Switch to dark" : "Switch to light"}
      type="button"
    >
      <span aria-hidden="true">{isLight ? "☀️" : "🌙"}</span>
      <span className="switch"><span className="switch__thumb" /></span>
    </button>
  );
}
