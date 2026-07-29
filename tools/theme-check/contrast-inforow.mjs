// Faz 6 — "Ana Ekran Widget'ı" bilgi kartı.  node contrast-inforow.mjs <dark|light>
import { open, colorOn } from "./lib/page.mjs";
import { cr, parse, hex, fmt } from "./lib/wcag.mjs";

const theme = process.argv[2] || "light";
const { browser, page } = await open({ theme });
await page.getByRole("tab", { name: /Rapor/ }).click();
await page.waitForTimeout(700);

console.log(`\n══ ${theme.toUpperCase()} — Ana Ekran Widget'ı bilgi kartı`);
for (const [label, locator, size] of [
  ["başlık",   page.getByText("Ana Ekran Widget'ı", { exact: true }), "15px/500"],
  ["açıklama", page.getByText(/Ana ekranda boş bir yere/),            "12.5px"],
]) {
  const el = locator.first();
  if (!(await el.count())) { console.log(`   ${label}: ÖĞE YOK`); continue; }
  await el.scrollIntoViewIfNeeded();
  const [c, b] = await colorOn(el);
  console.log(`   ${label.padEnd(10)} ${size.padEnd(10)} ` +
              `${hex(parse(c))}/${hex(parse(b))} = ${fmt(cr(parse(c), parse(b)))}`);
}
await browser.close();
