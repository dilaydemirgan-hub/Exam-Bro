// Grup 5 — Rapor sekmesi ölçümü. node g5contrast.mjs <dark|light>
// X: iki çubuk grafik (1.4.11 → 3:1)   Y: metin kovaları (3:1 / 4.5:1)
//
// Metinlerde zemin PİKSELDEN DEĞİL, DOM'dan çözülüyor: ilk opak
// background-color'a kadar atalar taranıyor. Piksel örneklemesi harfin
// üstüne düşüp sahte "1.00:1" üretiyordu.
// Grafiklerde (çubuk, toggle) zemin gerçekten yarı saydam katmanlardan
// oluşabildiği için piksel okunuyor.
import { webkit } from "playwright";
import { PNG } from "pngjs";
import { cr, hex, parse } from "./lib/wcag.mjs";

const mode = process.argv[2] || "light";
const br = await webkit.launch();
const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
const pg = await ctx.newPage();
await pg.clock.setFixedTime(new Date("2026-07-28T09:00:00Z"));
await pg.addInitScript(m => {
  localStorage.setItem("exambro_theme", m);
  localStorage.setItem("xb_grade", "12");
  localStorage.setItem("xb_streak", "4");
  localStorage.setItem("xb_notif", "1");
  const days = [], anx = {};
  for (let i = 6; i >= 0; i--) {
    const dt = new Date("2026-07-28T12:00:00"); dt.setDate(dt.getDate() - i);
    const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    if (i % 2 === 0) days.push(k);
    if (i !== 3) anx[k] = [2, 5, 8, 0, 1, 6, 9][6 - i];    // i===3 → kayıt yok
  }
  localStorage.setItem("xb_studied", JSON.stringify(days));
  localStorage.setItem("xb_anxiety", JSON.stringify(anx));
  localStorage.setItem("xb_goals", JSON.stringify({ "2026-07-28": [
    { id: "a", text: "x", done: true }, { id: "b", text: "y", done: false }] }));
}, mode);
await pg.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await pg.waitForTimeout(900);
await pg.getByRole("tab", { name: /Rapor/ }).click();
await pg.waitForTimeout(700);

const shot = PNG.sync.read(await pg.screenshot({ fullPage: true }));
const px = (x, y) => { const i = (shot.width * Math.round(y) + Math.round(x)) << 2;
  return [shot.data[i], shot.data[i + 1], shot.data[i + 2]]; };

// İlk OPAK atanın background-color'ı
const RESOLVE_BG = el => {
  let e = el;
  while (e) {
    const c = getComputedStyle(e).backgroundColor;
    const m = c.match(/[\d.]+/g);
    if (m && (m.length < 4 || parseFloat(m[3]) > 0.99)) return c;
    e = e.parentElement;
  }
  return getComputedStyle(document.documentElement).backgroundColor;
};

console.log(`\n══ ${mode.toUpperCase()} — RAPOR ══`);

// ── X ───────────────────────────────────────────────────────
console.log("\n── X · ÇUBUK GRAFİKLER  [1.4.11 → 3:1]");
const bars = pg.locator("div.no-theme-anim");
const N = await bars.count();
const info = [];
for (let i = 0; i < N; i++) {
  const el = bars.nth(i);
  const b = await el.boundingBox();
  const isTrack = await el.evaluate(e => e.style.background.includes("--track"));
  info.push({ i, b, isTrack, px: px(b.x + b.width / 2, b.y + b.height / 2) });
}
const cardBg = px(info[0].b.x - 6, info[0].b.y + info[0].b.height / 2);

// NOT: iki grafikte de çubuk KISMİ DOLU DEĞİL — her gün ya renkli çubuk
// (grafik 1: 48px, grafik 2: v*5.5px) ya da 8px'lik pasif kütük. Yani
// "nereye kadar doldu" sınırı yok; asıl soru her çubuğun kartın üstünde
// ve komşu durumdan ayırt edilebilir olması. EN ZAYIF çubuk seçiliyor.
for (const [name, from, to] of [["grafik 1 · bu hafta çalışma", 0, 7], ["grafik 2 · bu hafta kaygı", 7, N]]) {
  const seg = info.slice(from, to);
  const fills = seg.filter(s => !s.isTrack), track = seg.find(s => s.isTrack);
  // kartla kontrastı EN DÜŞÜK olan renkli çubuk
  const worst = fills.reduce((m, s) => cr(s.px, cardBg) < cr(m.px, cardBg) ? s : m);
  console.log(`   ${name}   (${fills.length} renkli, ${track ? 1 : 0}+ pasif)`);
  const a = cr(worst.px, cardBg);
  console.log(`     EN ZAYIF renkli çubuk ${hex(worst.px)} / kart ${hex(cardBg)} = ${a.toFixed(2)}:1  ${a >= 3 ? "✓" : "✗"}`);
  if (!track) { console.log("     (pasif çubuk yok)"); continue; }
  const b = cr(track.px, cardBg), c = cr(worst.px, track.px);
  // Kütüğün KENARLIĞI: sol kenardan 0.5px içeri
  const tb = px(track.b.x + 0.5, track.b.y + track.b.height / 2);
  const bl = cr(tb, cardBg);
  console.log(`     pasif kütük dolgusu ${hex(track.px)} / kart ${hex(cardBg)}  = ${b.toFixed(2)}:1  ${b >= 3 ? "✓" : "✗"}  (tek başına yetmiyor)`);
  console.log(`     pasif kütük KENARLIĞI ${hex(tb)} / kart ${hex(cardBg)}      = ${bl.toFixed(2)}:1  ${bl >= 3 ? "✓" : "✗"}  ← farkı kenarlık taşıyor`);
  console.log(`     en zayıf çubuk / pasif kütük                      = ${c.toFixed(2)}:1  ${c >= 3 ? "✓" : "✗"}  ← "var" ile "yok" ayrımı`);
}

// Gerçek KISMİ DOLU çubuk: Hedefler sekmesindeki ProgressBar
await pg.getByRole("tab", { name: /Hedefler/ }).click();
await pg.waitForTimeout(600);
const pb = pg.locator('[role="progressbar"]').first();
if (await pb.count()) {
  const b = await pb.boundingBox();
  const shot2 = PNG.sync.read(await pg.screenshot());
  const at = (x, y) => { const i = (shot2.width * Math.round(y) + Math.round(x)) << 2;
    return [shot2.data[i], shot2.data[i + 1], shot2.data[i + 2]]; };
  const f = at(b.x + 4, b.y + b.height / 2);                  // dolu uç
  const t = at(b.x + b.width - 4, b.y + b.height / 2);        // boş uç
  const cd = at(b.x + 4, b.y - 8);                            // kart
  // ÜST kenardaki outline — yuvarlak uçtan UZAKTA örnekle (orada antialias var)
  const ol = at(b.x + b.width * 0.85, b.y);
  console.log(`   ProgressBar (Hedefler) — TEK gerçek kısmi dolu çubuk`);
  console.log(`     dolgu ${hex(f)} / iz ${hex(t)}        = ${cr(f, t).toFixed(2)}:1  ${cr(f, t) >= 3 ? "✓" : "✗"}  ← nereye kadar doldu`);
  console.log(`     iz dolgusu ${hex(t)} / kart ${hex(cd)} = ${cr(t, cd).toFixed(2)}:1  ${cr(t, cd) >= 3 ? "✓" : "✗"}  (tek başına yetmiyor)`);
  console.log(`     iz OUTLINE'ı ${hex(ol)} / kart ${hex(cd)} = ${cr(ol, cd).toFixed(2)}:1  ${cr(ol, cd) >= 3 ? "✓" : "✗"}  ← farkı outline taşıyor`);
  await pg.getByRole("tab", { name: /Rapor/ }).click();
  await pg.waitForTimeout(500);
}

// ── Y ───────────────────────────────────────────────────────
console.log("\n── Y · METİN KOVALARI   (büyük = ≥24px VEYA ≥18.66px+bold)\n");
console.log("   yer                                 boyut         kova  ölçüm");
async function txt(label, sel, size, bucket) {
  const el = pg.locator(sel).first();
  if (!(await el.count())) { console.log(`   ${label.padEnd(35)} ${size.padEnd(13)} —     ÖĞE YOK`); return; }
  const [color, bg] = await el.evaluate((e, R) => {
    const resolve = eval(R);
    return [getComputedStyle(e).color, resolve(e)];
  }, RESOLVE_BG.toString());
  const t = bucket === "large" ? 3 : 4.5;
  const r = cr(parse(color), parse(bg));
  console.log(`   ${label.padEnd(35)} ${size.padEnd(13)} ${(bucket === "large" ? "3.0" : "4.5").padEnd(5)} ` +
    `${hex(parse(color))}/${hex(parse(bg))} = ${r.toFixed(2)}:1  ${r >= t ? "✓" : "✗"}`);
}
await txt("Stat değeri · Çalışılan Gün",  '.num:text-matches("^\\\\d+/7$")',   "21px/700",  "large");
await txt("Stat değeri · Ort. Kaygı",     '.num:text-matches("/10$")',        "21px/700",  "large");
await txt("Stat etiketi",                 'text=Çalışılan Gün',               "12px",      "normal");
await txt("grafik başlığı",               'text=bu hafta çalışma',            "14.5px/600","normal");
await txt("grafik gün etiketi",           'text=bu hafta kaygı >> xpath=following-sibling::div[1]/div[1]/div[2]', "10px", "normal");
await txt("özet başlığı",                 'text=/^(gidiyorsun|bu hafta iyi geçti|başladın|henüz başlamadın)\\.$/', "18px/700", "normal");
await txt("özet açıklaması",              'text=/Ortalamanın üstünde|Zirvede|Bu önemli|Yarın sadece/', "14px", "normal");
await txt("bölüm etiketi (ayarlar)",      'text="ayarlar"',                   "11px/600",  "normal");
await txt("ayar başlığı",                 'text=Günlük hatırlatma',           "15px/500",  "normal");
await txt("ayar alt yazısı",              'text=/Her akşam 20:00/',           "12.5px",    "normal");
await txt("ayar başlığı (tehlike)",       'text=Tüm verileri sıfırla',        "15px/500",  "normal");
await txt("ayar alt yazısı (tehlike)",    'text=Geri alınamaz',               "12.5px",    "normal");

// ── Toggle ──────────────────────────────────────────────────
const tg = pg.locator('button:has-text("Günlük hatırlatma") span[aria-hidden="true"]').first();
if (await tg.count()) {
  const b = await tg.boundingBox();
  const track = px(b.x + 8, b.y + b.height / 2);
  const knob  = px(b.x + b.width - 11, b.y + b.height / 2);
  const round = px(b.x + b.width + 6, b.y + b.height / 2);
  console.log(`\n── Toggle (UI bileşeni durumu)  [1.4.11 → 3:1]`);
  console.log(`   açık zemini ${hex(track)} / kart ${hex(round)}  = ${cr(track, round).toFixed(2)}:1  ${cr(track, round) >= 3 ? "✓" : "✗"}`);
  console.log(`   topuz ${hex(knob)} / açık zemin ${hex(track)}   = ${cr(knob, track).toFixed(2)}:1  ${cr(knob, track) >= 3 ? "✓" : "✗"}`);
}
await br.close();
