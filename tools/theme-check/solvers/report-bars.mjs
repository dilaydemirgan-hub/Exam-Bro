import { cr, hex, over } from "../lib/wcag.mjs";
// Rapor grafik 2 — AÇIK MOD için üç yönü de ara.
// Açık mod yeni; korunacak referans yok. Koyu mod aynen kalır.
// Çubuklar KARTIN (#ffffff) üstünde (ısı haritası ise --bg #f2f2f6 üstünde).
const CARD  = [255, 255, 255];      // --surface-2 (açık)
const TRACK = [226, 226, 234];      // --track (açık)
const CH = { low: [7, 74, 52], mid: [94, 57, 5], high: [145, 22, 65] };
const STEPS = { low: [1, 2, 3], mid: [4, 5, 6], high: [7, 8, 9, 10] };


// Mevcut (ısı haritasıyla ORTAK) açık mod rampası
const A_NOW = v => v <= 3 ? 0.40 + v * 0.20
              : v <= 6 ? 0.40 + (v - 3) * 0.20
              : 0.447 + (v - 6) * 0.1333;

console.log("── BAŞLANGIÇ: ortak rampa, çubuklar kartın üstünde\n");
console.log("   v   renk      ↔kütük   ↔kart");
let worstT = Infinity, worstC = Infinity;
for (let v = 1; v <= 10; v++) {
  const f = over(CH[v <= 3 ? "low" : v <= 6 ? "mid" : "high"], A_NOW(v), CARD);
  const t = cr(f, TRACK), c = cr(f, CARD);
  worstT = Math.min(worstT, t); worstC = Math.min(worstC, c);
  console.log(`   ${String(v).padStart(2)}  ${hex(f)}   ${t.toFixed(2)}${t >= 3 ? "✓" : "✗"}    ${c.toFixed(2)}${c >= 3 ? "✓" : "✗"}`);
}
console.log(`   EN ZAYIF → ↔kütük ${worstT.toFixed(2)}  ↔kart ${worstC.toFixed(2)}`);
console.log(`   --track ↔ kart = ${cr(TRACK, CARD).toFixed(2)}  ✗\n`);

// ── (a) Dolguyu koyulaştır ──────────────────────────────────
console.log("── (a) DOLGUYU KOYULAŞTIR (rapora özel alfa; ısı haritası dokunulmaz)\n");
console.log("   Rapor çubuğunda YÜKSEKLİK zaten değeri kodluyor (v*5.5px),");
console.log("   yani renkteki alfa rampası orada FAZLADAN bilgi. Isı haritasında");
console.log("   yükseklik yok, orada rampa şart.\n");
console.log("   seçenek                         en zayıf ↔kütük   en zayıf ↔kart   bant içi");
// a1: tam yoğunluk (alfa 1) — renk yalnızca BANDI gösterir
{
  const fills = ["low", "mid", "high"].map(b => over(CH[b], 1, CARD));
  const t = Math.min(...fills.map(f => cr(f, TRACK)));
  const c = Math.min(...fills.map(f => cr(f, CARD)));
  console.log(`   a1 tam yoğunluk (bant rengi)      ${t.toFixed(2)}✓            ${c.toFixed(2)}✓         — (rampa yok)`);
}
// a2: rampayı koru, tabanı yükselt
for (const F of [0.60, 0.70, 0.75, 0.80, 0.85]) {
  const A = v => { const b = v <= 3 ? "low" : v <= 6 ? "mid" : "high";
    const s = STEPS[b], i = s.indexOf(v);
    return F + (1 - F) * (i / (s.length - 1)); };
  let t = Infinity, c = Infinity, w = Infinity;
  for (const b of ["low", "mid", "high"]) {
    const fs = STEPS[b].map(v => over(CH[b], A(v), CARD));
    fs.forEach(f => { t = Math.min(t, cr(f, TRACK)); c = Math.min(c, cr(f, CARD)); });
    for (let i = 0; i < fs.length - 1; i++) w = Math.min(w, cr(fs[i], fs[i + 1]));
  }
  console.log(`   a2 rampa, taban ${F.toFixed(2)}              ${t.toFixed(2)}${t >= 3 ? "✓" : "✗"}            ${c.toFixed(2)}${c >= 3 ? "✓" : "✗"}         ${w.toFixed(3)}`);
}

// ── (b) Kenarlık ────────────────────────────────────────────
console.log("\n── (b) ÇUBUĞA 1px KENARLIK (1.4.11'in standart çözümü)\n");
console.log("   Kenarlık ADAYI                  ↔kart    ↔en açık dolgu   ↔kütük");
for (const h of ["#d5d5e0", "#a8a8bd", "#9a9aae", "#8a8a9e", "#7a7a8e", "#6b6b82"]) {
  const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lightest = over(CH.high, A_NOW(7), CARD);
  console.log(`   ${h}                         ${cr(c, CARD).toFixed(2)}${cr(c, CARD) >= 3 ? "✓" : "✗"}     ` +
    `${cr(c, lightest).toFixed(2)}             ${cr(c, TRACK).toFixed(2)}${cr(c, TRACK) >= 3 ? "✓" : "✗"}`);
}
console.log("\n   NOT: kenarlık 'burada bir çubuk var' sorusunu çözer (--track ↔ kart).");
console.log("   AMA 'bu günün kaydı var mı' sorusunu ÇÖZMEZ — dolgu ile kütüğün");
console.log("   kenarlığı aynı olur. O ayrım dolgu renginden gelmek ZORUNDA.");

// ── (c) Birleşim ────────────────────────────────────────────
console.log("\n── (c) BİRLEŞİM: a1/a2 (dolgu) + b (kenarlık)");
console.log("   dolgu ↔ kütük  → (a) çözüyor");
console.log("   kütük ↔ kart   → (b) çözüyor");
console.log("   İkisi bağımsız kısıt; tek bir değişiklik ikisini birden çözmüyor.");
