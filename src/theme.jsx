// ── Tema yönetimi ────────────────────────────────────────────
// Tek giriş noktası: tema okuma/yazma SADECE buradan geçer.
//
// Depolama: localStorage (Capacitor Preferences DEĞİL). Sebep: index.html
// içindeki FOUC engelleyici inline script React mount olmadan, senkron
// çalışmak zorunda; Preferences asenkron olduğu için oradan okunamaz.
// WKWebView'de localStorage kalıcıdır, native tarafta da sorunsuz çalışır.
//
// Kayıtlı değer yoksa varsayılan "dark" — mevcut kullanıcıların uygulaması
// güncellemeden sonra aynı görünmeli.

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export const THEME_KEY = "exambro_theme";

// Kullanıcı tercihi: "dark" | "light" | "system"
// Çözülmüş tema (DOM'a yazılan): "dark" | "light"
const PREFS = ["dark", "light", "system"];
const LIGHT_MQ = "(prefers-color-scheme: light)";

export function readPreference() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return PREFS.includes(v) ? v : "dark";
  } catch {
    return "dark";
  }
}

export function resolveTheme(pref) {
  if (pref === "system") {
    try { return window.matchMedia(LIGHT_MQ).matches ? "light" : "dark"; }
    catch { return "dark"; }
  }
  return pref === "light" ? "light" : "dark";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
  const [preference, setPref] = useState(readPreference);
  const [theme, setTheme] = useState(() => resolveTheme(readPreference()));

  // Tercih değişince çözümle ve <html data-theme> yaz.
  useEffect(() => {
    const t = resolveTheme(preference);
    setTheme(t);
    applyTheme(t);
  }, [preference]);

  // "Sistem" seçiliyken telefonun modunu dinle — anında değişsin.
  useEffect(() => {
    if (preference !== "system") return;
    let mq;
    try { mq = window.matchMedia(LIGHT_MQ); } catch { return; }
    const onChange = () => {
      const t = resolveTheme("system");
      setTheme(t);
      applyTheme(t);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback(p => {
    const next = PREFS.includes(p) ? p : "dark";
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    setPref(next);
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, preference, setPreference }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme, <ThemeProvider> içinde kullanılmalı.");
  return ctx;
}
