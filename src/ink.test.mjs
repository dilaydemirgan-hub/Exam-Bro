// node src/ink.test.mjs
// ink() sözleşmesinin testi — docs/LIGHT-MODE.md §6
import assert from "node:assert/strict";
import fs from "node:fs";
import { ink, INK_BASE, INK_PAGE, INK_WASH } from "./ink.js";

const css = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
const lightBlock = css.slice(css.indexOf(':root[data-theme="light"]'));
const tokenOf = name => lightBlock.match(new RegExp(`^\\s*${name}\\s*:\\s*([^;]+);`, "m"))[1].trim();

const chan = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const h2r = h => { let s = h.slice(1); if (s.length === 3) s = [...s].map(c => c + c).join("");
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); };
const lum = c => 0.2126 * chan(c[0]) + 0.7152 * chan(c[1]) + 0.0722 * chan(c[2]);
const cr = (a, b) => { const x = lum(h2r(a)), y = lum(h2r(b));
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const blendHex = (a, p, b) => "#" + h2r(a).map((v, i) =>
  Math.round(v * (p / 100) + h2r(b)[i] * (1 - p / 100)).toString(16).padStart(2, "0")).join("");

// Tüm veri renkleri: FIXED + OSYM + customs varsayılanı + PSYCH_COLORS
const DATA = ["#10d99e","#9d5cff","#ff4d94","#ff9736","#5c9bff","#b07aff","#ffbe0b","#ffb703"];

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✓" : "✗"} ${msg}`); if (!ok) fail++; };

// ── 1. Sabitler index.css ile aynı olmalı (drift koruması) ──
check(tokenOf("--bg") === INK_PAGE, `INK_PAGE (${INK_PAGE}) === [light] --bg (${tokenOf("--bg")})`);
check(tokenOf("--tint-weak") === `${INK_WASH}%`, `INK_WASH (${INK_WASH}%) === [light] --tint-weak (${tokenOf("--tint-weak")})`);

// ── 2. Koyu modda ve geçersiz girdide renk aynen dönmeli ──
for (const c of DATA) check(ink(c, "dark") === c, `dark: ${c} değişmiyor`);
check(ink("var(--green)", "light") === "var(--green)", "hex olmayan değer aynen dönüyor");
check(ink(undefined, "light") === undefined, "undefined aynen dönüyor");

// ── 3. Açık modda hedefler tutuyor mu (en koyu zemine karşı) ──
for (const c of DATA) {
  const worst = blendHex(c, INK_WASH, INK_PAGE);   // rengin kendi yıkaması, sayfa üstünde
  const n = ink(c, "light"), l = ink(c, "light", "large");
  check(cr(n, worst) >= 4.5, `normal ${c} → ${n}  en koyu zeminde ${cr(n, worst).toFixed(2)}:1 ≥ 4.5`);
  check(cr(l, worst) >= 3.0, `large  ${c} → ${l}  en koyu zeminde ${cr(l, worst).toFixed(2)}:1 ≥ 3.0`);
  // M: tek referans → beyaz kartta da geçmeli
  check(cr(n, "#ffffff") >= 4.5, `normal ${c} → ${n}  beyaz kartta ${cr(n, "#ffffff").toFixed(2)}:1 ≥ 4.5`);
  // N: large, normalden daha AÇIK olmalı (marka korunuyor)
  check(lum(h2r(l)) >= lum(h2r(n)), `large ${c} normalden açık (marka korunuyor)`);
}

// ── 4. P: önbellek anahtarı tema + boyut içeriyor ──
const a = ink("#10d99e", "light"), b = ink("#10d99e", "light", "large");
check(a !== b, "aynı renk, farklı boyut → farklı sonuç (önbellek boyutu ayırıyor)");
check(ink("#10d99e", "dark") === "#10d99e", "aynı renk, farklı tema → önbellek bayat değer dönmüyor");
check(ink("#10d99e", "light") === a, "önbellek tutarlı");

console.log(fail ? `\n${fail} TEST BAŞARISIZ` : `\nTüm testler geçti ✓`);
process.exit(fail ? 1 : 0);
