// Faz 6 (uygulama içi) — widget sınav seçimi.  node widget-select.mjs <dark|light>
// Kontrast + davranış: varsayılan, en fazla 2, sıra, kalıcılık.
import { open, colorOn, pixels } from "./lib/page.mjs";
import { cr, parse, hex, fmt } from "./lib/wcag.mjs";

const theme = process.argv[2] || "light";
const { browser, page } = await open({ theme });
await page.getByRole("tab", { name: /Sınavlar/ }).click();
await page.waitForTimeout(700);

// ⚠️ `button[aria-pressed]` YETMEZ: FIXED kartlarının görünürlük butonu da
// aria-pressed taşıyor. Yıldızları erişilebilir ADLARINDAN ayır.
const ON_RE  = /widget'ta \d+\. sırada/;
const OFF_RE = /ana ekran widget'ında göster/;
const stars    = page.getByRole("button", { name: /widget/i });
const onStars  = page.getByRole("button", { name: ON_RE });
const offStars = page.getByRole("button", { name: OFF_RE });
const stored = () => page.evaluate(() => localStorage.getItem("xb_widget_exams"));
// Seçili yıldızlar: aria-pressed=true olanların erişilebilir adı sırayı içeriyor.
const picked = async () => {
  const n = await stars.count(); const out = [];
  for (let i = 0; i < n; i++) {
    const b = stars.nth(i);
    if (await b.getAttribute("aria-pressed") === "true") out.push(await b.getAttribute("aria-label"));
  }
  return out;
};

console.log(`\n══ ${theme.toUpperCase()} — WIDGET SINAV SEÇİMİ ══`);
console.log("\n── KONTRAST (yeni eklenen her şey)");
console.log("   yer                            boyut      hedef ölçüm");
const row = async (label, locator, size, bucket = "normal") => {
  const el = locator.first();
  if (!(await el.count())) return console.log(`   ${label.padEnd(30)} ÖĞE YOK`);
  const [c, b] = await colorOn(el);
  console.log(`   ${label.padEnd(30)} ${size.padEnd(10)} ${(bucket === "large" ? "3" : "4.5").padEnd(5)} ` +
              `${hex(parse(c))}/${hex(parse(b))} = ${fmt(cr(parse(c), parse(b)), bucket)}`);
};
await row("açıklama satırı", page.getByText(/Ana ekran widget'ında göster/), "12.5px");

// Yıldız ve rozet: ikon/rozet = anlam taşıyan grafik (1.4.11 → 3:1).
{
  for (const [label, loc] of [["SEÇİLİ yıldız", onStars], ["seçilmemiş yıldız", offStars]]) {
    if (!(await loc.count())) { console.log(`   ${label.padEnd(30)} ÖĞE YOK`); continue; }
    const [c, b] = await colorOn(loc.first());
    console.log(`   ${label.padEnd(30)} ${"19px".padEnd(10)} ${"3".padEnd(5)}` +
                `${hex(parse(c))}/${hex(parse(b))} = ${fmt(cr(parse(c), parse(b)), "large")}`);
  }
  // Sıra rozeti: --on-gold metni --gold zemin üstünde (küçük ama METİN).
  const badge = onStars.first().locator('span[aria-hidden="true"]');
  if (await badge.count()) {
    const c = parse(await badge.evaluate(e => getComputedStyle(e).color));
    const b = parse(await badge.evaluate(e => getComputedStyle(e).backgroundColor));
    console.log(`   ${"sıra rozeti (1/2)".padEnd(30)} ${"9.5px/700".padEnd(10)} ${"4.5".padEnd(5)}` +
                `${hex(c)}/${hex(b)} = ${fmt(cr(c, b))}`);
  }
}

// ── DAVRANIŞ ─────────────────────────────────────────────────
console.log("\n── DAVRANIŞ");
console.log(`   varsayılan (en yakın tarih)   ${JSON.stringify(await picked())}`);
console.log(`   localStorage                  ${await stored()}`);

// 2.'yi ekle — sona eklenmeli (sıra korunur)
await offStars.first().click();
await page.waitForTimeout(400);
console.log(`   2. sınav yıldızlandı          ${JSON.stringify(await picked())}`);
console.log(`   localStorage                  ${await stored()}`);

// 3.'yü dene — REDDEDİLMELİ, toast çıkmalı, seçim değişmemeli
const before = await stored();
const third = offStars.first();
if (await third.count()) {
  await third.click();
  await page.waitForTimeout(500);
  const toastEl = page.getByRole("status");
  console.log(`   3. sınav denendi → toast      ${(await toastEl.count()) ? `"${await toastEl.first().innerText()}"` : "TOAST YOK ✗"}`);
  console.log(`   seçim değişti mi              ${(await stored()) === before ? "HAYIR ✓ (reddedildi)" : "EVET ✗"}`);
}

// 1. sıradakini kaldır → 2. sıradaki 1'e çıkmalı
await page.getByRole("button", { name: /widget'ta 1\. sırada/ }).click();
await page.waitForTimeout(400);
console.log(`   1. kaldırıldı → kalanın sırası ${JSON.stringify(await picked())}`);
console.log(`   localStorage                  ${await stored()}`);

// Kalıcılık: yeniden yükle
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.getByRole("tab", { name: /Sınavlar/ }).click();
await page.waitForTimeout(600);
console.log(`   yeniden yükleme sonrası       ${JSON.stringify(await picked())}`);
console.log(`   localStorage                  ${await stored()}`);


await pixels(page);
await browser.close();
