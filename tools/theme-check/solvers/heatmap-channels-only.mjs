import { cr, hex } from "../lib/wcag.mjs";
// Alfa rampası SABİT (koyu moddaki formül), sadece --anx-*-rgb kanalları
// değişken. Çözüm varsa: JS'e dokunmadan, yalnızca index.css ile biter.
const PAGE  = [242, 242, 246];
const EMPTY = [230, 230, 238];
const BASE  = { low: [13, 128, 91], mid: [156, 95, 8], high: [200, 30, 90] };
const A = {};                                    // mevcut formül
for (let v = 1; v <= 10; v++)
  A[v] = v <= 3 ? 0.3 + v * 0.2 : v <= 6 ? 0.3 + (v - 3) * 0.18 : 0.35 + (v - 6) * 0.13;

const bandOf = v => v <= 3 ? "low" : v <= 6 ? "mid" : "high";
const R = (a, b, s) => { const o = []; for (let x = a; x <= b + 1e-9; x += s) o.push(+x.toFixed(3)); return o; };
const DARK = { within: 1.296, boundary: 2.752, vsPage: 3.34, vsEmpty: 2.86 };

// Kanalı sadece ölçekleyerek değil, siyaha doğru karıştırarak da dene
const shade = (c, k) => c.map(x => Math.round(x * k));

let best = null, n = 0;
for (const kL of R(0.30, 1.00, 0.01))
for (const kM of R(0.30, 1.00, 0.01))
for (const kH of R(0.30, 1.00, 0.01)) {
  const CH = { low: shade(BASE.low, kL), mid: shade(BASE.mid, kM), high: shade(BASE.high, kH) };
  const f = {};
  for (let v = 1; v <= 10; v++)
    f[v] = CH[bandOf(v)].map((c, i) => Math.round(c * A[v] + PAGE[i] * (1 - A[v])));
  let within = Infinity, boundary = Infinity;
  for (let v = 1; v < 10; v++) {
    const r = cr(f[v], f[v + 1]);
    if (bandOf(v) !== bandOf(v + 1)) boundary = Math.min(boundary, r);
    else within = Math.min(within, r);
  }
  const vsPage  = Math.min(...[1, 4, 7].map(v => cr(f[v], PAGE)));
  const vsEmpty = Math.min(...[1, 4, 7].map(v => cr(f[v], EMPTY)));
  if (within < DARK.within || boundary < DARK.boundary || vsPage < 3.0 || vsEmpty < DARK.vsEmpty) continue;
  n++;
  const score = kL + kM + kH;                     // markaya en yakın kal
  if (!best || score > best.score) best = { score, CH, f, within, boundary, vsPage, vsEmpty, k: { kL, kM, kH } };
}

console.log(`── Uygun aday: ${n}`);
if (!best) { console.log("\nKANAL-ONLY ÇÖZÜM YOK → alfa rampası da açık moda özel olmalı."); process.exit(1); }
console.log("\n── ÇÖZÜM: yalnızca --anx-*-rgb kanalları (alfa formülü ORTAK kalıyor)\n");
for (const b of ["low", "mid", "high"])
  console.log(`   --anx-${b.padEnd(4)}-rgb : ${BASE[b].join(",")} → ${best.CH[b].join(",")}   ${hex(best.CH[b])}  (×${best.k["k" + b[0].toUpperCase()]})`);
console.log(`\n   bant içi min    ${best.within.toFixed(2)}   (koyu ${DARK.within})`);
console.log(`   bant sınırı min ${best.boundary.toFixed(2)}   (koyu ${DARK.boundary})`);
console.log(`   en soluk↔sayfa  ${best.vsPage.toFixed(2)}   (koyu ${DARK.vsPage}, 1.4.11 ≥3.0)`);
console.log(`   en soluk↔boş    ${best.vsEmpty.toFixed(2)}   (koyu ${DARK.vsEmpty})`);
console.log("\n   v →  renk      komşuyla");
for (let v = 1; v <= 10; v++) {
  const nxt = v < 10 ? cr(best.f[v], best.f[v + 1]).toFixed(3) : "—";
  console.log(`   v${String(v).padStart(2)}  ${hex(best.f[v])}   ${nxt}${(v === 3 || v === 6) ? "  ← bant sınırı" : ""}`);
}
