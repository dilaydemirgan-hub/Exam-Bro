// ── Shared UI primitives ─────────────────────────────────────
// alert()/confirm() yerine markaya uygun, erişilebilir bileşenler.

import { useState, useCallback, useRef, useEffect } from "react";

// ── Toast ────────────────────────────────────────────────────
// Kullanım: const { toast, toastEl } = useToast();  toast("Kaydedildi ✓")
export function useToast() {
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const toast = useCallback((text, ms = 2400) => {
    clearTimeout(timer.current);
    setMsg(text);
    timer.current = setTimeout(() => setMsg(null), ms);
  }, []);
  const toastEl = msg ? (
    <div role="status" aria-live="polite" style={{
      position: "fixed", left: "50%", bottom: "calc(104px + env(safe-area-inset-bottom))",
      transform: "translateX(-50%)", zIndex: 500,
      background: "var(--surface-toast)", border: "1px solid var(--border)",
      color: "var(--text-1)", fontSize: 14, fontWeight: 500,
      padding: "12px 18px", borderRadius: 999, whiteSpace: "nowrap",
      maxWidth: "calc(100vw - 40px)", overflow: "hidden", textOverflow: "ellipsis",
      boxShadow: "var(--shadow-toast)",
      animation: "toastIn 0.25s ease",
    }}>{msg}</div>
  ) : null;
  return { toast, toastEl };
}

// ── Confirm sheet ────────────────────────────────────────────
export function ConfirmSheet({ open, title, body, confirmLabel = "Onayla", danger = false, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, zIndex: 450, background: "var(--overlay-sheet)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      backdropFilter: "blur(4px)", animation: "fadein 0.2s ease",
    }}>
      <div onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-label={title} style={{
        width: "100%", maxWidth: 480, background: "var(--surface-sheet)",
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        border: "1px solid var(--border)", borderBottom: "none",
        padding: "14px 22px calc(24px + env(safe-area-inset-bottom))",
        animation: "sheetUp 0.28s ease",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: "var(--handle)", margin: "0 auto 18px" }} />
        <div style={{ fontSize: 19, fontWeight: 600, color: "var(--text-1)", marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14.5, color: "var(--text-3)", lineHeight: 1.6, marginBottom: 22 }}>{body}</div>
        <button className="pressable" onClick={onConfirm} style={{
          width: "100%", padding: 15, borderRadius: "var(--r-md)", border: "none", cursor: "pointer",
          background: danger ? "var(--danger)" : "var(--violet)", color: "var(--on-accent)",
          fontSize: 16, fontWeight: 600,
        }}>{confirmLabel}</button>
        <button className="pressable" onClick={onCancel} style={{
          width: "100%", marginTop: 10, padding: 13, borderRadius: "var(--r-md)",
          background: "transparent", border: "1px solid var(--border)",
          color: "var(--text-3)", fontSize: 15, fontWeight: 500, cursor: "pointer",
        }}>Vazgeç</button>
      </div>
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────
export function Card({ children, style, className = "", ...rest }) {
  return (
    <div className={`themed ${className}`.trim()} style={{
      background: "var(--surface-2)", border: "1px solid var(--border-soft)",
      borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-card)", padding: 18, ...style,
    }} {...rest}>{children}</div>
  );
}

// ── Section label ────────────────────────────────────────────
export function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontSize: 11, color: "var(--text-4)", fontWeight: 600,
      textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 10, ...style,
    }}>{children}</div>
  );
}

// ── Empty state ──────────────────────────────────────────────
export function EmptyState({ icon, title, body, style }) {
  return (
    <div style={{ textAlign: "center", padding: "44px 24px", ...style }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%", background: "var(--surface-2)",
        border: "1px solid var(--border-soft)", display: "flex", alignItems: "center",
        justifyContent: "center", margin: "0 auto 16px", color: "var(--text-4)",
      }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>{title}</div>
      {body && <div style={{ fontSize: 13.5, color: "var(--text-4)", lineHeight: 1.6 }}>{body}</div>}
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────
export function ProgressBar({ pct, gradient = "linear-gradient(90deg,var(--green),var(--blue))" }) {
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
      style={{ background: "var(--track)", borderRadius: 999, height: 8, overflow: "hidden" }}>
      <div style={{ background: gradient, height: "100%", width: `${pct}%`, borderRadius: 999, transition: "width 0.4s ease" }} />
    </div>
  );
}
