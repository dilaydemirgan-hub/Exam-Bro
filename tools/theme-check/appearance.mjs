// Faz 4 — "Görünüm" seçicisi.  node appearance.mjs <dark|light>
// Hem KONTRAST hem DAVRANIŞ (radiogroup klavye deseni + anında uygulama).
import { open, colorOn, pixels } from "./lib/page.mjs";
import { cr, parse, hex, fmt } from "./lib/wcag.mjs";

const theme = process.argv[2] || "light";
const { browser, page } = await open({ theme });
await page.getByRole("tab", { name: /Rapor/ }).click();
await page.waitForTimeout(700);

const group = page.getByRole("radiogroup", { name: "Görünüm" });
await group.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);

console.log(`\n══ ${theme.toUpperCase()} — GÖRÜNÜM SEÇİCİSİ ══`);
console.log("\n── KONTRAST (yeni eklenen her metin)");
console.log("   yer                            boyut      hedef ölçüm");

const row = async (label, locator, size, bucket = "normal") => {
  const el = locator.first();
  if (!(await el.count())) return console.log(`   ${label.padEnd(30)} ÖĞE YOK`);
  const [c, b] = await colorOn(el);
  console.log(`   ${label.padEnd(30)} ${size.padEnd(10)} ${(bucket === "large" ? "3" : "4.5").padEnd(5)} ` +
              `${hex(parse(c))}/${hex(parse(b))} = ${fmt(cr(parse(c), parse(b)), bucket)}`);
};

await row("satır başlığı 'Görünüm'", page.getByText("Görünüm", { exact: true }), "15px/500");
await row("alt açıklama",            page.getByText(/Uygulamanın rengini/),      "12.5px");
await row("SEÇİLİ segment",          group.getByRole("radio", { checked: true }),  "13.5px/600");
await row("seçilmemiş segment",      group.getByRole("radio", { checked: false }), "13.5px/500");

// Seçim göstergesi: violet kenarlık, seçilinin zeminine karşı (1.4.11 → 3:1).
{
  const on = group.getByRole("radio", { checked: true }).first();
  const bd = parse(await on.evaluate(e => getComputedStyle(e).borderTopColor));
  const [, sb] = await colorOn(on);
  const track = parse(await group.evaluate(e => getComputedStyle(e).backgroundColor));
  console.log(`   ${"seçim kenarlığı ↔ segment".padEnd(30)} ${"1.5px".padEnd(10)} ${"3".padEnd(5)}` +
              `${hex(bd)}/${hex(parse(sb))} = ${fmt(cr(bd, parse(sb)), "large")}`);
  console.log(`   ${"seçim kenarlığı ↔ ray".padEnd(30)} ${"1.5px".padEnd(10)} ${"3".padEnd(5)}` +
              `${hex(bd)}/${hex(track)} = ${fmt(cr(bd, track), "large")}`);
  // Zemin farkı tek başına 3:1'i taşımıyor; göstergeyi KENARLIK taşıyor
  // (rapor çubuklarındaki mantık, §4). İkisi birlikte yedekli gösterge.
  console.log(`   ${"seçili zemin ↔ ray".padEnd(30)} ${"—".padEnd(10)} ${"—".padEnd(5)}` +
              `${hex(parse(sb))}/${hex(track)} = ${cr(parse(sb), track).toFixed(2)}:1   ` +
              `(tek başına eşik altı — göstergeyi yukarıdaki kenarlık taşıyor)`);
}

// ── DAVRANIŞ ─────────────────────────────────────────────────
const state = () => page.evaluate(() => ({
  theme: document.documentElement.getAttribute("data-theme"),
  pref: localStorage.getItem("exambro_theme"),
}));
const checked = () => group.getByRole("radio", { checked: true }).first().innerText();
const tabbable = () => group.locator('[role="radio"][tabindex="0"]').count();

console.log("\n── DAVRANIŞ");
console.log(`   başlangıç                     seçili=${await checked()}  ${JSON.stringify(await state())}`);
console.log(`   tabIndex=0 olan radio sayısı  ${await tabbable()}  ← tam 1 olmalı (roving tabindex)`);

// Anında uygulama: kaydet butonu yok, tıklayınca tema değişmeli.
await group.getByRole("radio", { name: "Açık" }).click();
await page.waitForTimeout(350);
console.log(`   "Açık" tıklandı               seçili=${await checked()}  ${JSON.stringify(await state())}`);

// Ok tuşu: hem taşır hem seçer (WCAG radiogroup deseni).
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(350);
console.log(`   ArrowRight                    seçili=${await checked()}  ${JSON.stringify(await state())}`);
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(350);
console.log(`   ArrowRight (sondan başa sar)  seçili=${await checked()}  ${JSON.stringify(await state())}`);
await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(350);
console.log(`   ArrowLeft                     seçili=${await checked()}  ${JSON.stringify(await state())}`);
await page.keyboard.press("End");
await page.waitForTimeout(350);
console.log(`   End                           seçili=${await checked()}  ${JSON.stringify(await state())}`);
await page.keyboard.press("Home");
await page.waitForTimeout(350);
console.log(`   Home                          seçili=${await checked()}  ${JSON.stringify(await state())}`);

// "Sistem": tercih system yazılmalı, tema cihazı izlemeli.
await group.getByRole("radio", { name: "Sistem" }).click();
await page.waitForTimeout(350);
console.log(`   "Sistem" seçildi              ${JSON.stringify(await state())}  ← pref "system" olmalı`);
await page.emulateMedia({ colorScheme: "light" });
await page.waitForTimeout(350);
console.log(`   cihaz → light                 ${JSON.stringify(await state())}`);
await page.emulateMedia({ colorScheme: "dark" });
await page.waitForTimeout(350);
console.log(`   cihaz → dark                  ${JSON.stringify(await state())}`);
console.log(`   odak hâlâ grupta mı           ${await page.evaluate(() =>
  document.activeElement?.getAttribute("role") === "radio")}`);
console.log(`   tabIndex=0 olan radio sayısı  ${await tabbable()}`);

await pixels(page);   // ekran görüntüsü alınabildiğini doğrula (kullanılmıyor)
await browser.close();
