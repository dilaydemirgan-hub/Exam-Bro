// Açılış ekranları: Splash ve Onboard.  node capture-boot.mjs <dark|light>
//
// Bunlar shoot-all.mjs'in SCREENS listesinde YOK, bilerek:
//   • Splash yalnızca `!loaded` iken (birkaç yüz ms) duruyor — zamanlamaya
//     bağlı, piksel farkı akışında kararsız sonuç üretir.
//   • Onboard `xb_grade` yokken çıkıyor, oysa SEED her ekrana grade yazıyor.
// İkisi de tamamen token üstünde (--bg, --text-*, --surface-3, --border,
// --grad-brand, --glow-logo*), yani açık modda kendiliğinden doğru; bu betik
// onu GÖSTERMEK için var (docs/LIGHT-MODE.md Faz 3 kontrol listesi).
import { webkit } from "playwright";
import { URL as APP_URL, FIXED_TIME } from "./lib/page.mjs";

const mode = process.argv[2] || "light";
const br = await webkit.launch();
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const pg = await ctx.newPage();
await pg.clock.setFixedTime(FIXED_TIME);
// xb_grade BİLEREK yazılmıyor → onboarding çıksın.
await pg.addInitScript(m => localStorage.setItem("exambro_theme", m), mode);

// ── İLK BOYAMA (FOUC penceresi) ──────────────────────────────
// Kullanıcının açılışta GERÇEKTEN gördüğü ilk kare bu: index.html'deki inline
// script data-theme'i React mount olmadan yazıyor. Yanlışsa açılışta renk
// flaşı olur (docs/LIGHT-MODE.md §3).
//
// React'in <Splash/> bileşeni AYRICA var ama web'de ölçülebilir değil:
// `loaded`, store.get() → localStorage.getItem() ile tek mikro-görevde
// dönüyor, yani Splash tek kareden kısa sürüyor. Ekran görüntüsüyle
// yakalamaya çalışmak yarış koşulu (denendi: hep fadein'deki Onboard geldi).
// Splash tamamen token üstünde — --bg, --violet, --text-1, --glow-logo —
// ham renk taramasında da çıkmıyor; doğrulaması KOD İNCELEMESİ.
// Cihazda açılışı zaten native splash (@capacitor/splash-screen) kaplıyor.
await pg.goto(APP_URL, { waitUntil: "commit" });
const first = await pg.evaluate(() => ({
  theme: document.documentElement.getAttribute("data-theme"),
  bg: getComputedStyle(document.documentElement).backgroundColor,
  meta: document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
})).catch(() => null);
await pg.screenshot({ path: new URL(`./shots/boot-firstpaint-${mode}.png`, import.meta.url).pathname });
console.log(`✓ boot-firstpaint-${mode}.png   data-theme=${first?.theme} bg=${first?.bg} theme-color=${first?.meta}`);

await pg.waitForTimeout(1400);
await pg.screenshot({ path: new URL(`./shots/boot-onboard-${mode}.png`, import.meta.url).pathname });
console.log("✓", `boot-onboard-${mode}.png`);

// Onboarding metinleri gerçekten AA mı (zeminler opak, DOM'dan çözülebilir)
const { colorOn } = await import("./lib/page.mjs");
const { cr, parse, fmt, hex } = await import("./lib/wcag.mjs");
console.log(`\n══ ${mode.toUpperCase()} — ONBOARD`);
for (const [label, sel, bucket] of [
  ["başlık (gradyan metin)", "h1", "large"],
  ["tanıtım cümlesi",        "p:nth-of-type(1)", "normal"],
  ["'sınıfını seç'",         "p:nth-of-type(2)", "normal"],
  ["sınıf butonu etiketi",   "button span:last-child", "normal"],
  ["alt not",                "p:last-of-type", "normal"],
]) {
  const el = pg.locator(sel).first();
  if (!(await el.count())) { console.log(`   ${label.padEnd(24)} ÖĞE YOK`); continue; }
  const [c, b] = await colorOn(el);
  // h1 gradyan metin: WebkitTextFillColor transparent → renk ölçülemez, atla.
  const fill = await el.evaluate(e => getComputedStyle(e).webkitTextFillColor);
  if (fill && fill.includes("rgba(0, 0, 0, 0)")) {
    console.log(`   ${label.padEnd(24)} gradyan metin (--grad-brand) — dekoratif logo, ölçülmüyor`);
    continue;
  }
  console.log(`   ${label.padEnd(24)} ${hex(parse(c))}/${hex(parse(b))} = ${fmt(cr(parse(c), parse(b)), bucket)}`);
}
await br.close();
