import { createContext, useContext, useEffect, useRef, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore/lite";
import { useAuth } from "./auth";
import { db } from "./firebase";
import { friendly } from "./api";
import { Sun, Moon } from "lucide-react";
const Context = createContext(null);
const defaults = { theme: "system", widgets: ["chart", "alerts", "goals"] };
function normalize(value) {
  return {
    theme: ["light", "dark", "system"].includes(value?.theme)
      ? value.theme
      : "system",
    widgets: Array.isArray(value?.widgets)
      ? [...new Set(value.widgets.filter((w) => defaults.widgets.includes(w)))]
      : defaults.widgets,
  };
}
function stored(key) {
  try {
    return normalize(JSON.parse(localStorage.getItem(key)));
  } catch {
    return defaults;
  }
}
export function PreferencesProvider({ children }) {
  const { user, demo } = useAuth();
  const key = `sr-preferences:${demo || "browser"}:${user?.id || "public"}`;
  const [preferences, setPreferences] = useState(() => stored("sr-theme"));
  const [resolvedTheme, setResolvedTheme] = useState("light");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const scope = useRef(key);
  scope.current = key;
  const generation = useRef(0);
  const saving = useRef(false);
  useEffect(() => {
    let active = true;
    const request = ++generation.current;
    saving.current = false;
    setBusy(false);
    setError("");
    if (!user || demo) {
      setPreferences(stored(user ? key : "sr-theme"));
      return;
    }
    setBusy(true);
    getDoc(doc(db, "users", user.id, "preferences", "interface"))
      .then((snapshot) => {
        if (active && request === generation.current)
          setPreferences(
            snapshot.exists() ? normalize(snapshot.data()) : defaults,
          );
      })
      .catch((e) => {
        if (active && request === generation.current) {
          setPreferences(defaults);
          setError(friendly(e));
        }
      })
      .finally(() => {
        if (active && request === generation.current) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [key]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark =
        preferences.theme === "dark" ||
        (preferences.theme === "system" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
      setResolvedTheme(dark ? "dark" : "light");
    };
    apply();
    media.addEventListener("change", apply);
    try {
      localStorage.setItem("sr-theme", JSON.stringify(preferences));
    } catch {}
    return () => media.removeEventListener("change", apply);
  }, [preferences]);
  async function save(next) {
    if (saving.current) return;
    saving.current = true;
    const owner = key;
    const request = ++generation.current;
    next = normalize(next);
    setBusy(true);
    setError("");
    try {
      if (user && !demo)
        await setDoc(
          doc(db, "users", user.id, "preferences", "interface"),
          next,
        );
      else localStorage.setItem(key, JSON.stringify(next));
      if (scope.current === owner && request === generation.current)
        setPreferences(next);
    } catch (e) {
      if (scope.current === owner && request === generation.current)
        setError(friendly(e));
    } finally {
      if (scope.current === owner && request === generation.current) {
        saving.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <Context.Provider value={{ preferences, resolvedTheme, save, busy, error }}>
      {children}
      {error && (
        <div className="preference-error" role="alert">
          Preferências: {error}
        </div>
      )}
    </Context.Provider>
  );
}
export const usePreferences = () => useContext(Context);
export function ThemeToggle() {
  const { preferences, resolvedTheme, save, busy } = usePreferences();
  const dark = resolvedTheme === "dark";
  return (
    <button
      className="icon-button theme-toggle"
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      disabled={busy}
      onClick={() => save({ ...preferences, theme: dark ? "light" : "dark" })}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
