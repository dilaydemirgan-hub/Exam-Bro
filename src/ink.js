// ── ink(): veri renklerinin açık moddaki METİN tonu ──────────
// Tam sözleşme ve ölçümler: docs/LIGHT-MODE.md §6
//
// Koyu zemin için seçilmiş parlak sınav/kategori renkleri açık zeminde
// okunmuyor (beyaz üstünde 1.66–3.88:1, AA eşiği 4.5). ink() bunları
// SADECE açık modda, SADECE metin/anlamlı grafik olarak kullanıldıkları
// yerde AA'yı geçen EN AÇIK tona indirir. Veri dizilerine dokunulmaz.
//
// Referans zemin, rengin karşılaşabileceği EN KOYU yüzeydir: kendi
// --tint-weak yıkamasının sayfa zemini üstündeki hali. En AÇIK yüzeye
// (beyaz) göre hesaplamak yanlış sonuç verir — koyu metin için açık zemin
// daha kolaydır, beyaza göre çözülen tonların 8/8'i sayfa zemininde
// AA'dan kalıyor. Tek referans olduğu için aynı sınav rengi her ekranda
// aynı tonda görünür.
//
// Aşağıdaki üç sabit index.css'teki [data-theme="light"] değerleriyle
// aynı olmak ZORUNDA; npm test bunu doğruluyor.
export const INK_BASE = "#10101c";
export const INK_PAGE = "#f2f2f6";   // --bg
export const INK_WASH = 14;          // --tint-weak (%)

const h2r = h => { let s = h.slice(1); if (s.length === 3) s = [...s].map(c => c + c).join("");
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); };
const r2h = c => "#" + c.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
const chan = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = c => 0.2126 * chan(c[0]) + 0.7152 * chan(c[1]) + 0.0722 * chan(c[2]);
const cr = (a, b) => { const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const blend = (a, p, b) => a.map((v, i) => v * (p / 100) + b[i] * (1 - p / 100));

const inkCache = new Map();
export function ink(color, theme, size) {
  if (theme !== "light" || typeof color !== "string" || color[0] !== "#") return color;
  const key = `${theme}|${size || "normal"}|${color}`;   // tema + boyut anahtarda
  const hit = inkCache.get(key);
  if (hit) return hit;
  const target = size === "large" ? 3 : 4.5;   // WCAG: ≥24px veya ≥18.66px bold → 3:1
  const src = h2r(color);
  const worstBg = blend(src, INK_WASH, h2r(INK_PAGE));
  let out = color;
  for (let p = 100; p >= 5; p -= 0.5) {
    // Kontrast, 8-bit'e YUVARLANMIŞ değerde ölçülmeli: float üzerinden
    // ölçüp sonra yuvarlamak eşiğin bir tık altına düşürebiliyor.
    const c = h2r(r2h(blend(src, p, h2r(INK_BASE))));
    if (cr(c, worstBg) >= target) { out = r2h(c); break; }
  }
  inkCache.set(key, out);
  return out;
}
