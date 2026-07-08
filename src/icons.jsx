// ── Exam Bro icon set ────────────────────────────────────────
// Tutarlı 24×24 grid, 1.8px stroke, currentColor.
// Emoji yerine her yerde bu set kullanılır → her cihazda aynı görünüm.

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function I({ size = 22, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base} {...rest}>
      {children}
    </svg>
  );
}

export const IconHome = p => (
  <I {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></I>
);
export const IconCalendar = p => (
  <I {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></I>
);
export const IconTarget = p => (
  <I {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /></I>
);
export const IconPulse = p => (
  <I {...p}><path d="M3 12h4l2.5-6 4 12L16 12h5" /></I>
);
export const IconChart = p => (
  <I {...p}><path d="M4 20V10M10 20V4M16 20v-8M21 20H3" /></I>
);
export const IconFlame = p => (
  <I {...p}><path d="M12 3s5.5 4.5 5.5 10a5.5 5.5 0 1 1-11 0c0-2.5 1.2-4.6 2.5-6 .3 1.4 1 2.4 2 3 0-2.5.5-5 1-7Z" /></I>
);
export const IconLock = p => (
  <I {...p}><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></I>
);
export const IconChevronRight = p => <I {...p}><path d="m9 6 6 6-6 6" /></I>;
export const IconChevronLeft  = p => <I {...p}><path d="m15 6-6 6 6 6" /></I>;
export const IconX     = p => <I {...p}><path d="m6 6 12 12M18 6 6 18" /></I>;
export const IconPlus  = p => <I {...p}><path d="M12 5v14M5 12h14" /></I>;
export const IconCheck = p => <I {...p}><path d="m5 12.5 4.5 4.5L19 7" /></I>;
export const IconBell  = p => (
  <I {...p}><path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9" /><path d="M10 19.5a2.2 2.2 0 0 0 4 0" /></I>
);
export const IconEye = p => (
  <I {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></I>
);
export const IconEyeOff = p => (
  <I {...p}><path d="M4 4.5 20 19.5" /><path d="M9.5 6.1A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.6M6.2 7.4A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 3.3-.6" /><path d="M10 10.3a3 3 0 0 0 4 4.2" /></I>
);
export const IconTrash = p => (
  <I {...p}><path d="M4 7h16M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 7M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" /></I>
);
export const IconSparkle = p => (
  <I {...p}><path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9 12 3.5Z" /></I>
);
export const IconBrain = p => (
  <I {...p}><path d="M9.5 4.5A2.7 2.7 0 0 0 6 7a3 3 0 0 0-2 3.5A3 3 0 0 0 5 16a2.8 2.8 0 0 0 4.5 2.6M9.5 4.5c.9 0 2 .6 2 2.2v10.6c0 1.6-1.1 2.2-2 2.2M9.5 4.5v15" /><path d="M14.5 4.5A2.7 2.7 0 0 1 18 7a3 3 0 0 1 2 3.5A3 3 0 0 1 19 16a2.8 2.8 0 0 1-4.5 2.6M14.5 4.5c-.9 0-2 .6-2 2.2v10.6c0 1.6 1.1 2.2 2 2.2" /></I>
);
export const IconWind = p => (
  <I {...p}><path d="M3 8.5h10a2.5 2.5 0 1 0-2.4-3.3M3 12.5h15a2.6 2.6 0 1 1-2.5 3.4M3 16.5h7a2.3 2.3 0 1 1-2.2 3" /></I>
);
export const IconBook = p => (
  <I {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></I>
);
export const IconClock = p => (
  <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></I>
);
export const IconSettings = p => (
  <I {...p}><circle cx="12" cy="12" r="3.2" /><path d="M19 12a7 7 0 0 0-.14-1.4l2-1.55-2-3.46-2.35.95a7 7 0 0 0-2.42-1.4L13.7 2.6h-3.4l-.39 2.54a7 7 0 0 0-2.42 1.4l-2.35-.95-2 3.46 2 1.55a7 7 0 0 0 0 2.8l-2 1.55 2 3.46 2.35-.95a7 7 0 0 0 2.42 1.4l.39 2.54h3.4l.39-2.54a7 7 0 0 0 2.42-1.4l2.35.95 2-3.46-2-1.55c.09-.45.14-.92.14-1.4Z" /></I>
);
export const IconSwap = p => (
  <I {...p}><path d="M7 4 3.5 7.5 7 11M3.5 7.5H16M17 13l3.5 3.5L17 20M20.5 16.5H8" /></I>
);
export const IconGraduation = p => (
  <I {...p}><path d="m2.5 9 9.5-4.5L21.5 9 12 13.5 2.5 9Z" /><path d="M6.5 11v4.5c0 1.2 2.5 2.5 5.5 2.5s5.5-1.3 5.5-2.5V11" /><path d="M21.5 9v5" /></I>
);
