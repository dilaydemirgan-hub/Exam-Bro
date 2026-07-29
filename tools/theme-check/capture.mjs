// Ekran görüntüsü al.
//   node capture.mjs <dark|light> <çıktı.png> [adım…]
// adımlar: tab:Rapor · btn:Metin · radio:8 · wait:500 · full
//
// Örnek:
//   node capture.mjs dark shots/base-exams.png tab:Sınavlar full
//   node capture.mjs dark shots/base-osym.png  tab:Sınavlar "btn:ÖSYM Takvimi" full
import { open, runSteps } from "./lib/page.mjs";

const [theme, out, ...steps] = process.argv.slice(2);
if (!theme || !out) {
  console.error("kullanım: node capture.mjs <dark|light> <çıktı.png> [adım…]");
  process.exit(1);
}

const { browser, page } = await open({ theme });
const full = await runSteps(page, steps);
await page.screenshot({ path: out, fullPage: full, animations: "disabled" });
await browser.close();
console.log("✓", out);
