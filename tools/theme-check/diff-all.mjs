// shoot-all.mjs ile çekilmiş iki seti karşılaştırır.
//   node diff-all.mjs <önek-A> <önek-B>        (örn: base new)
// Koyu mod için sonuç HER ekranda 0 piksel olmalı.
import { readFileSync, writeFileSync, existsSync } from "fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { SCREENS } from "./shoot-all.mjs";

const [A, B] = process.argv.slice(2);
if (!A || !B) { console.error("kullanım: node diff-all.mjs <önek-A> <önek-B>"); process.exit(1); }
const p = n => new URL(`./shots/${n}.png`, import.meta.url).pathname;

let bad = 0, missing = 0;
for (const name of Object.keys(SCREENS)) {
  const a = p(`${A}-${name}`), b = p(`${B}-${name}`);
  if (!existsSync(a) || !existsSync(b)) {
    console.log(`?  ${name}: görüntü eksik — atlandı`); missing++; continue;
  }
  const X = PNG.sync.read(readFileSync(a)), Y = PNG.sync.read(readFileSync(b));
  if (X.width !== Y.width || X.height !== Y.height) {
    console.log(`✗  ${name}: BOYUT FARKI ${X.width}x${X.height} vs ${Y.width}x${Y.height}`);
    bad++; continue;
  }
  const out = new PNG({ width: X.width, height: X.height });
  const n = pixelmatch(X.data, Y.data, out.data, X.width, X.height, { threshold: 0 });
  if (n) {
    writeFileSync(p(`diff-${name}`), PNG.sync.write(out));
    bad++;
    console.log(`✗  ${name}: ${n} piksel (%${((n / (X.width * X.height)) * 100).toFixed(4)}) → shots/diff-${name}.png`);
  } else {
    console.log(`✓  ${name}: 0 piksel`);
  }
}
if (missing) console.log(`\n${missing} ekran atlandı (görüntü yok).`);
console.log(bad ? `\n${bad} ekran FARKLI — koyu mod değişmiş olabilir.` : "\nTüm ekranlar 0 piksel ✓");
process.exit(bad ? 1 : 0);
