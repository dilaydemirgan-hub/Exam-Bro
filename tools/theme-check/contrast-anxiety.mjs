// Kaygı sekmesi: seçili skala butonu ve durum etiketi (METİN, 4.5:1).
// Bu iki yüzey açık modda 2.30 / 2.89 ile AA'nın altındaydı; anxFill() /
// anxPillStyle() ile tam opak zemine geçirildi (docs/LIGHT-MODE.md §4).
//   node contrast-anxiety.mjs <dark|light>
import { open, pixels } from "./lib/page.mjs";
import { cr, parse, hex, fmt } from "./lib/wcag.mjs";

const theme = process.argv[2] || "light";
const { browser, page } = await open({ theme, storage: { xb_anxiety: {} } });
await page.getByRole("tab", { name: /Kaygı/ }).click();
await page.waitForTimeout(500);

console.log(`\n══ ${theme.toUpperCase()} — kaygı skalası (metin, 4.5:1)\n`);

// Zemin yarı saydam olabildiği için PİKSELDEN okunuyor.
async function onPixels(label, sel) {
  const el = page.locator(sel).first();
  if (!(await el.count())) { console.log(`?  ${label}: öğe yok`); return; }
  const color = parse(await el.evaluate(e => getComputedStyle(e).color));
  const b = await el.boundingBox();
  const { at } = await pixels(page);
  const bg = at(b.x + 3, b.y + b.height / 2);      // metnin uzağında, kutu içi
  console.log(`   ${label.padEnd(30)} ${hex(color)}/${hex(bg)} = ${fmt(cr(color, bg))}`);
}

await onPixels("seçilmemiş buton", '[role="radio"][aria-checked="false"]');
// Üç bandın da EN SOLUK ucu — "ilk bulunan" en zayıf olan değildir.
for (const [v, band] of [[1, "low"], [4, "mid"], [7, "high"]]) {
  await page.getByRole("radio", { name: new RegExp(`^${v}$`) }).click();
  await page.waitForTimeout(350);
  await onPixels(`seçili buton v=${v} (${band})`, '[role="radio"][aria-checked="true"]');
  await onPixels(`durum etiketi v=${v}`,          '[role="radiogroup"] + div');
}
await browser.close();
