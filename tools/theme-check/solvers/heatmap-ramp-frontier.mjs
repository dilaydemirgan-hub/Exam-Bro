import { cr } from "../lib/wcag.mjs";
// Açık mod ısı haritası rampasını SAYISAL olarak çöz.
// Koyu mod referans değerleri (ölçülmüş) hedef olarak alınır.
const PAGE  = [242, 242, 246];   // --bg
const EMPTY = [230, 230, 238];   // --anx-empty
const BAND  = { low: [13, 128, 91], mid: [156, 95, 8], high: [200, 30, 90] };

// rgba(band, a) over PAGE, 8-bit'e yuvarlanmış (gerçek render gibi)
const mix = (band, a) => BAND[band].map((c, i) => Math.round(c * a + PAGE[i] * (1 - a)));

const bandOf = v => v <= 3 ? "low" : v <= 6 ? "mid" : "high";

function evaluate(alphas) {
  const fill = {};
  for (let v = 1; v <= 10; v++) fill[v] = mix(bandOf(v), alphas[v]);
  const adj = [];
  for (let v = 1; v < 10; v++) adj.push({ pair: `${v}↔${v + 1}`, r: cr(fill[v], fill[v + 1]),
    boundary: bandOf(v) !== bandOf(v + 1) });
  return {
    fill,
    within:   Math.min(...adj.filter(a => !a.boundary).map(a => a.r)),
    boundary: Math.min(...adj.filter(a =>  a.boundary).map(a => a.r)),
    vsPage:   Math.min(...[1, 4, 7].map(v => cr(fill[v], PAGE))),   // her bandın en soluğu
    vsEmpty:  Math.min(...[1, 4, 7].map(v => cr(fill[v], EMPTY))),
    adj,
  };
}

// Mevcut (koyu ile aynı) rampa
const CURRENT = {};
for (let v = 1; v <= 10; v++) {
  CURRENT[v] = v <= 3 ? 0.3 + v * 0.2 : v <= 6 ? 0.3 + (v - 3) * 0.18 : 0.35 + (v - 6) * 0.13;
}

// Koyu modda ölçülen referanslar
const DARK = { within: 1.296, boundary: 2.752, vsPage: 3.34, vsEmpty: 2.86 };

console.log("── Koyu mod (referans, ölçülmüş)");
console.log(`   bant içi min ${DARK.within}  ·  bant sınırı min ${DARK.boundary}  ·  ` +
            `en soluk↔sayfa ${DARK.vsPage}  ·  en soluk↔boş ${DARK.vsEmpty}\n`);

const c0 = evaluate(CURRENT);
console.log("── Açık mod, MEVCUT rampa (koyu ile aynı alfalar)");
console.log(`   bant içi min ${c0.within.toFixed(2)}  ·  bant sınırı min ${c0.boundary.toFixed(2)}  ·  ` +
            `en soluk↔sayfa ${c0.vsPage.toFixed(2)}  ·  en soluk↔boş ${c0.vsEmpty.toFixed(2)}\n`);

// ── Arama: her bant için (başlangıç alfa, adım) ─────────────
// Amaç: bant SINIRLARINI ve "veri var mı" ayrımını en üst düzeye çıkar;
// bant içi adımlar zaten koyu modda da zayıf (1.30), onu koru.
const R = (a, b, s) => { const o = []; for (let x = a; x <= b + 1e-9; x += s) o.push(+x.toFixed(3)); return o; };
const ALL = [];
for (const L0 of R(0.30, 0.70, 0.04))
for (const Ls of R(0.08, 0.26, 0.02))
for (const M0 of R(0.30, 0.70, 0.04))
for (const Ms of R(0.08, 0.26, 0.02))
for (const H0 of R(0.30, 0.70, 0.04))
for (const Hs of R(0.06, 0.18, 0.015)) {
  const a = {};
  for (let v = 1; v <= 3; v++)  a[v] = L0 + (v - 1) * Ls;
  for (let v = 4; v <= 6; v++)  a[v] = M0 + (v - 4) * Ms;
  for (let v = 7; v <= 10; v++) a[v] = H0 + (v - 7) * Hs;
  if (Object.values(a).some(x => x > 1.0 || x < 0.25)) continue;
  ALL.push({ a, e: evaluate(a), p: { L0, Ls, M0, Ms, H0, Hs } });
}
globalThis.__ALL = ALL;

// Ödünleşim sınırı: bant içi tabanı yükseldikçe "veri var" ayrımına ne oluyor?
console.log("── ÖDÜNLEŞİM SINIRI (açık mod, mevcut --anx-* renkleriyle)");
console.log("   bant içi taban → ulaşılabilir EN İYİ 'en soluk↔boş' ve o noktadaki bant sınırı\n");
console.log("   bant içi ≥   en soluk↔boş   bant sınırı   en soluk↔sayfa");
for (const floor of [1.20, 1.25, 1.30, 1.35, 1.40]) {
  const ok = ALL.filter(x => x.e.within >= floor);
  if (!ok.length) { console.log(`   ${floor.toFixed(2)}         — ulaşılamıyor`); continue; }
  const b = ok.reduce((m, x) => x.e.vsEmpty > m.e.vsEmpty ? x : m);
  console.log(`   ${floor.toFixed(2)}         ${b.e.vsEmpty.toFixed(2)}           ${b.e.boundary.toFixed(2)}          ${b.e.vsPage.toFixed(2)}`);
}
console.log("\n   → Hiçbir kombinasyon koyu modun 2.86 / 2.75 / 3.34 üçlüsüne yaklaşamıyor.");
console.log("     Sebep: açık modda toplam kontrast aralığı dar — sayfa zemini (L=0.874)");
console.log("     ile en koyu bant rengi (#0d805b, L=0.163) arasında yalnızca 4.35:1 var;");
console.log("     koyu modda ise (L=0.006 ↔ L=0.50) 9.8:1 aralık dağıtılabiliyor.\n");

// SEÇİM KURALI: hiçbir metrikte MEVCUT açık moddan geriye gitme, bant içini
// koyu modun seviyesine (1.296) çıkar, kalan payı bant SINIRINA yatır.
const feasible = ALL.filter(x =>
  x.e.within  >= 1.296 &&        // koyu modla en az eşit
  x.e.vsEmpty >= c0.vsEmpty &&   // mevcut açık moddan geriye gitme
  x.e.vsPage  >= c0.vsPage);
console.log(`── Kısıtlı arama: ${feasible.length} aday (hiçbir metrikte gerileme yok)`);
const best = feasible.reduce((m, x) => x.e.boundary > m.e.boundary ? x : m);

console.log("── Açık mod, ÇÖZÜLEN rampa");
console.log(`   parametreler: low ${best.p.L0}+${best.p.Ls}  mid ${best.p.M0}+${best.p.Ms}  high ${best.p.H0}+${best.p.Hs}`);
console.log(`   alfalar: ${Object.entries(best.a).map(([v, x]) => `v${v}=${x.toFixed(2)}`).join("  ")}`);
const e = best.e;
console.log(`   bant içi min ${e.within.toFixed(2)}  ·  bant sınırı min ${e.boundary.toFixed(2)}  ·  ` +
            `en soluk↔sayfa ${e.vsPage.toFixed(2)}  ·  en soluk↔boş ${e.vsEmpty.toFixed(2)}`);
console.log("\n   komşu adımlar:");
for (const x of e.adj) console.log(`     ${x.pair.padEnd(7)} ${x.r.toFixed(3)}:1${x.boundary ? "  ← bant sınırı" : ""}`);

// ── Kenarlık: sayfa zemininden 3:1 taşıyacak en AÇIK gri ──
console.log("\n── --border-grid (açık mod): sayfa zemininden 3:1 taşıyan EN AÇIK ton");
for (let g = 200; g >= 100; g--) {
  const c = [g, g, Math.min(255, g + 22)];   // hafif mavi-mor kayma, mevcut tonla uyumlu
  if (cr(c, PAGE) >= 3.0) {
    console.log(`   #${c.map(v => v.toString(16).padStart(2, "0")).join("")}  sayfa zeminine ${cr(c, PAGE).toFixed(2)}:1`);
    break;
  }
}
