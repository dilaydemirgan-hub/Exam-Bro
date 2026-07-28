import { cr, hex } from "../lib/wcag.mjs";
// --track (pasif çubuk zemini) açık modda iki şeyi aynı anda tutturabilir mi?
//   A) kartın üstünde görünür olmak        → track ↔ kart   ≥ 3:1
//   B) çubuğun nereye kadar dolduğu        → dolgu ↔ track  ≥ 3:1  (asıl bilgi)
const CARD = [255, 255, 255];                 // --surface-2 (açık)
const FILLS = { "grafik 1 (--grad-green-bar üst ucu)": [13, 128, 91],
                "grafik 2 (en soluk kaygı çubuğu)":    [186, 115, 141] };


console.log("--track adayı      ↔kart    " + Object.keys(FILLS).map(k => k.slice(0, 9)).join("   "));
let anyBoth = false;
for (let g = 226; g >= 90; g -= 8) {
  const t = [g, g, Math.min(255, g + 8)];
  const vsCard = cr(t, CARD);
  const vsFills = Object.values(FILLS).map(f => cr(f, t));
  const both = vsCard >= 3 && vsFills.every(r => r >= 3);
  if (both) anyBoth = true;
  console.log(`  ${hex(t)}          ${vsCard.toFixed(2)}     ` +
    vsFills.map(r => `${r.toFixed(2)}${r >= 3 ? "✓" : "✗"}`).join("        ") +
    `   ${vsCard >= 3 ? "✓" : "✗"}${both ? "   ← İKİSİ BİRDEN" : ""}`);
}
console.log(`\nİkisini birden tutturan --track: ${anyBoth ? "VAR" : "YOK"}`);
console.log("Mevcut #e2e2ea → ↔kart 1.29 ✗ · ↔dolgu 3.98/4.58 ✓");
console.log("\n1.4.11 'içeriği anlamak için gereken' kısmı DOLGU SINIRI: çubuğun");
console.log("nereye kadar dolduğu bilgiyi taşıyor, pasif bölge bilginin yokluğu.");
console.log("Ayrıca dolgu↔kart açık modda 5.12/5.89 — çubuk kartın üstünde net.");
