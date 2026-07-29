import { cr, hex, lum } from "../lib/wcag.mjs";
// Açık mod ısı haritası rampası — bant bant çözüp sonra birleştir.
// Bant metrikleri (bant içi adım, sayfa/boş ayrımı) bantın KENDİ içinde;
// bantlar yalnızca SINIRDA birbirine bağlı (N'in en koyusu ↔ N+1'in en açığı).
// Bu yüzden önce her bant için adaylar üretilir, sonra 3'lü birleşim taranır.
const PAGE  = [242, 242, 246];
const EMPTY = [230, 230, 238];
const BASE  = { low: [13, 128, 91], mid: [156, 95, 8], high: [200, 30, 90] };
const STEPS = { low: 3, mid: 3, high: 4 };
const ORDER = ["low", "mid", "high"];

const R = (a, b, s) => { const o = []; for (let x = a; x <= b + 1e-9; x += s) o.push(+x.toFixed(3)); return o; };

const DARK = { within: 1.296, boundary: 2.752, vsPage: 3.34, vsEmpty: 2.86 };

// ── Her bant için aday üret ─────────────────────────────────
const cand = {};
for (const b of ORDER) {
  const n = STEPS[b];
  cand[b] = [];
  for (const k of R(0.40, 1.00, 0.025)) {              // kanal koyulaştırma
    const ch = BASE[b].map(x => Math.round(x * k));
    for (const lo of R(0.30, 0.80, 0.02))
    for (const hi of R(0.50, 1.00, 0.02)) {
      if (hi <= lo + 0.05) continue;
      const fills = [];
      for (let i = 0; i < n; i++) {
        const a = lo + (hi - lo) * (i / (n - 1));
        fills.push(ch.map((c, j) => Math.round(c * a + PAGE[j] * (1 - a))));
      }
      let within = Infinity;
      for (let i = 0; i < n - 1; i++) within = Math.min(within, cr(fills[i], fills[i + 1]));
      const vsPage  = cr(fills[0], PAGE);
      const vsEmpty = cr(fills[0], EMPTY);
      if (within < DARK.within || vsPage < 3.0 || vsEmpty < DARK.vsEmpty) continue;
      cand[b].push({ k, lo, hi, ch, fills, within, vsPage, vsEmpty,
        lLight: lum(fills[0]), lDark: lum(fills[n - 1]) });
    }
  }
  console.log(`   ${b.padEnd(4)} aday: ${cand[b].length}`);
}

// ── Sınır kısıtıyla birleştir ───────────────────────────────
const bcr = (la, lb) => (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
let best = null;
for (const L of cand.low) for (const M of cand.mid) {
  if (bcr(L.lDark, M.lLight) < DARK.boundary) continue;
  for (const H of cand.high) {
    if (bcr(M.lDark, H.lLight) < DARK.boundary) continue;
    // Markadan en az sapan: kanal katsayıları toplamı en büyük
    const score = L.k + M.k + H.k;
    if (!best || score > best.score) best = { score, L, M, H };
  }
}

if (!best) { console.log("\nÇÖZÜM YOK"); process.exit(1); }

const { L, M, H } = best;
const all = [...L.fills, ...M.fills, ...H.fills];
const within   = Math.min(L.within, M.within, H.within);
const boundary = Math.min(bcr(L.lDark, M.lLight), bcr(M.lDark, H.lLight));
const vsPage   = Math.min(L.vsPage, M.vsPage, H.vsPage);
const vsEmpty  = Math.min(L.vsEmpty, M.vsEmpty, H.vsEmpty);

console.log("\n── ÇÖZÜM (koyu modu HER metrikte yakalıyor, markadan en az sapıyor)\n");
for (const [name, o] of [["low", L], ["mid", M], ["high", H]])
  console.log(`   --anx-${name.padEnd(4)}-rgb : ${BASE[name].join(",")} → ${o.ch.join(",")}  (${hex(o.ch)}, ×${o.k})   alfa ${o.lo} → ${o.hi}`);

console.log(`\n   bant içi min    ${within.toFixed(2)}   (koyu ${DARK.within})  ${within >= DARK.within ? "✓" : "✗"}`);
console.log(`   bant sınırı min ${boundary.toFixed(2)}   (koyu ${DARK.boundary})  ${boundary >= DARK.boundary ? "✓" : "✗"}`);
console.log(`   en soluk↔sayfa  ${vsPage.toFixed(2)}   (koyu ${DARK.vsPage}, 1.4.11 ≥3.0)  ${vsPage >= 3 ? "✓" : "✗"}`);
console.log(`   en soluk↔boş    ${vsEmpty.toFixed(2)}   (koyu ${DARK.vsEmpty})  ${vsEmpty >= DARK.vsEmpty ? "✓" : "✗"}`);

console.log("\n   v →  renk      komşuyla");
for (let i = 0; i < 10; i++) {
  const nxt = i < 9 ? cr(all[i], all[i + 1]).toFixed(3) : "—";
  const bnd = (i === 2 || i === 5) ? "  ← bant sınırı" : "";
  console.log(`   v${String(i + 1).padStart(2)}  ${hex(all[i])}   ${nxt}${bnd}`);
}

// Alfa formülünü App.jsx biçiminde yaz
console.log("\n── anxColor() açık mod dalı için katsayılar");
for (const [name, o, n, off] of [["low", L, 3, 0], ["mid", M, 3, 3], ["high", H, 4, 6]]) {
  const step = (o.hi - o.lo) / (n - 1);
  console.log(`   ${name.padEnd(4)}: ${o.lo.toFixed(2)} + (v - ${off}) * ${step.toFixed(3)}  →  ` +
    Array.from({ length: n }, (_, i) => (o.lo + step * i).toFixed(2)).join(", "));
}
