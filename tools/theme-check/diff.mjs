// Koyu mod regresyon ağı — EN ÖNEMLİ GÜVENLİK AĞI.
// Sonuç HER ÇİFT İÇİN 0 piksel olmalı; değilse koyu mod değişmiş demektir.
//
//   node diff.mjs '[["shots/base-home.png","shots/new-home.png","home"], …]'
//
// Fark bulunursa shots/diff-<etiket>.png yazılır ve çıkış kodu 1 olur.
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const pairs = JSON.parse(process.argv[2] || "[]");
if (!pairs.length) {
  console.error(`kullanım: node diff.mjs '[["base.png","new.png","etiket"], …]'`);
  process.exit(1);
}

let bad = 0;
for (const [a, b, label] of pairs) {
  const A = PNG.sync.read(readFileSync(a));
  const B = PNG.sync.read(readFileSync(b));
  if (A.width !== B.width || A.height !== B.height) {
    console.log(`✗ ${label}: BOYUT FARKI ${A.width}x${A.height} vs ${B.width}x${B.height}`);
    bad++; continue;
  }
  const out = new PNG({ width: A.width, height: A.height });
  const n = pixelmatch(A.data, B.data, out.data, A.width, A.height, { threshold: 0 });
  const pct = ((n / (A.width * A.height)) * 100).toFixed(4);
  if (n) {
    const p = join(dirname(b), `diff-${label}.png`);
    writeFileSync(p, PNG.sync.write(out));
    bad++;
    console.log(`✗ ${label}: ${n} piksel (%${pct}) → ${p}`);
  } else {
    console.log(`✓ ${label}: 0 piksel`);
  }
}
console.log(bad ? `\n${bad} çift FARKLI` : "\nTüm çiftler 0 piksel ✓");
process.exit(bad ? 1 : 0);
