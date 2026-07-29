// WCAG kontrast matematiği — tek kopya.
// Betiklerin hepsi buradan alır; formülü iki yerde tutmayın.

export const chan = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const lum  = c => 0.2126 * chan(c[0]) + 0.7152 * chan(c[1]) + 0.0722 * chan(c[2]);

/** İki RGB üçlüsü arasındaki WCAG kontrast oranı. */
export const cr = (a, b) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** "rgb(1, 2, 3)" / "rgba(1,2,3,.5)" → [1,2,3] */
export const parse = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);

/** "#abc" | "#aabbcc" → [r,g,b] */
export const h2r = h => {
  let s = h.trim().replace("#", "");
  if (s.length === 3) s = [...s].map(c => c + c).join("");
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16));
};

/** [r,g,b] → "#rrggbb" */
export const hex = c => "#" + c.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");

/**
 * `src` rengini `bg` üstüne `a` alfasıyla yatırır ve 8-bit'e YUVARLAR.
 * ⚠️ Yuvarlama şart: float üzerinden ölçüp sonra yuvarlamak oranı eşiğin bir
 * tık altına düşürebiliyor (docs/LIGHT-MODE.md §6).
 */
export const over = (src, a, bg) => src.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));

/** WCAG eşiği. large = ≥24px, ya da ≥18.66px VE bold. */
export const target = bucket => (bucket === "large" ? 3 : 4.5);

/** Konsol için: "4.93:1 ✓" */
export const fmt = (r, bucket) => `${r.toFixed(2)}:1 ${r >= target(bucket) ? "✓" : "✗"}`;
