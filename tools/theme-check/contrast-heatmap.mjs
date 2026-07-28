// Isı haritası rampasının ÖLÇÜMÜ — node heatmap.mjs <dark|light>
// Dolgu renkleri yarı saydam (rgba yıkama), bu yüzden ekran görüntüsündeki
// GERÇEK pikselden okunuyor. Kenarlık ve sayfa zemini opak → CSS'ten alınıyor.
import { pixels } from "./lib/page.mjs";
import { webkit } from "playwright";
import { cr, h2r, hex } from "./lib/wcag.mjs";

const mode = process.argv[2] || "light";
const br = await webkit.launch();
const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
const pg = await ctx.newPage();
await pg.clock.setFixedTime(new Date("2026-07-28T09:00:00Z"));

// Son 35 günün SON 10'una sırayla 1..10, öncesine "kayıt yok" bırak.
const KEY = {};
await pg.addInitScript(m => {
  localStorage.setItem("exambro_theme", m);
  localStorage.setItem("xb_grade", "12");
  const anx = {};
  for (let v = 1; v <= 10; v++) {
    const dt = new Date("2026-07-28T12:00:00");
    dt.setDate(dt.getDate() - (10 - v));           // v=10 → bugün
    const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    anx[k] = v;
  }
  localStorage.setItem("xb_anxiety", JSON.stringify(anx));
}, mode);
for (let v = 1; v <= 10; v++) {
  const dt = new Date("2026-07-28T12:00:00");
  dt.setDate(dt.getDate() - (10 - v));
  KEY[v] = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

await pg.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await pg.waitForTimeout(900);
await pg.getByRole("tab", { name: /Kaygı/ }).click();
await pg.waitForTimeout(600);

const { at: px } = await pixels(pg);

// Kare merkezinden oku (kenarlıktan uzak)
async function cell(v) {
  const b = await pg.locator(`[title="${KEY[v]}"]`).boundingBox();
  return px(b.x + b.width / 2, b.y + b.height / 2);
}
const fills = {};
for (let v = 1; v <= 10; v++) fills[v] = await cell(v);

// Kayıt yok karesi (--anx-empty) + sayfa zemini + kenarlık: opak, CSS'ten
const tok = async n => h2r(await pg.evaluate(x =>
  getComputedStyle(document.documentElement).getPropertyValue(x), n));
const empty  = await tok("--anx-empty");
const pageBg = await tok("--bg");
const grid   = await tok("--border-grid");

console.log(`\n══ ${mode.toUpperCase()} — ısı haritası rampası ══\n`);
console.log("(a) KOMŞU ADIMLAR — ayırt edilebilirlik");
let min = Infinity, minPair = "";
for (let v = 1; v < 10; v++) {
  const r = cr(fills[v], fills[v + 1]);
  if (r < min) { min = r; minPair = `${v}↔${v + 1}`; }
  const band = (a, b) => (a <= 3 ? "low" : a <= 6 ? "mid" : "high") !==
                         (b <= 3 ? "low" : b <= 6 ? "mid" : "high") ? "  ← bant sınırı" : "";
  console.log(`    v${String(v).padStart(2)}↔${String(v + 1).padEnd(2)}  ${hex(fills[v])} ↔ ${hex(fills[v + 1])}  = ${r.toFixed(3)}:1${band(v, v + 1)}`);
}
console.log(`    EN ZAYIF: ${minPair} = ${min.toFixed(3)}:1`);

console.log("\n(b) VERİ TAŞIYAN EN SOLUK KARELER — çevresinden ayırt edilebilirlik");
// Her bandın en soluk karesi ayrı ayrı: 1.4.11 (≥3:1) yalnızca "içeriği
// anlamak için gereken grafik" için geçerli → veri TAŞIYAN kareler.
// Boş kare bilginin YOKLUĞU; onun için eşik yok, koyu modla karşılaştırılır.
for (const v of [1, 4, 7]) {
  const p = cr(fills[v], pageBg), e = cr(fills[v], empty);
  console.log(`    v=${String(v).padEnd(2)} ${hex(fills[v])}  / sayfa ${hex(pageBg)} = ${p.toFixed(2)}:1 ${p >= 3 ? "✓" : "✗"}` +
              `   / "kayıt yok" ${hex(empty)} = ${e.toFixed(2)}:1`);
}
console.log(`    kenarlık ${hex(grid)} / sayfa zemini = ${cr(grid, pageBg).toFixed(2)}:1` +
            `   (dolgu 3:1'i kendi taşıdığı için kenarlığa yük binmiyor)`);
console.log(`    "kayıt yok" ${hex(empty)} / sayfa zemini = ${cr(empty, pageBg).toFixed(2)}:1`);

console.log("\n(c) LEJANT vs HARİTA — aynı görsel dil mi?");
console.log("    (lejant karesi EKRANDAN okunuyor, token'dan değil)");
const legend = pg.locator('div:has(> div[style*="border-radius: 3px"])').first();
for (const [t, lo, hi, i] of [["low", 1, 3, 0], ["mid", 4, 6, 1], ["high", 7, 10, 2]]) {
  const sw = pg.locator('div[style*="width: 11px"]').nth(i);
  const bb = await sw.boundingBox();
  const c = px(bb.x + bb.width / 2, bb.y + bb.height / 2);
  const vsMax = cr(c, fills[hi]), vsMin = cr(c, fills[lo]);
  console.log(`    lejant ${t.padEnd(4)} ${hex(c)}   bandın EN KOYU karesi ${hex(fills[hi])} → ${vsMax.toFixed(2)}:1` +
    `${vsMax < 1.5 ? "  ← pratikte AYNI renk" : ""}   en soluk ${hex(fills[lo])} → ${vsMin.toFixed(2)}:1`);
}

await br.close();
