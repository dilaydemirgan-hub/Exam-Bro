// Standart ekran setini tek seferde çeker (piksel farkı akışı için).
//   node shoot-all.mjs <dark|light> <önek>
// →  shots/<önek>-<ekran>.png
//
// Ekran listesi tek yerde: yeni bir ekran eklerseniz buraya ekleyin, hem
// referans hem karşılaştırma tarafı kendiliğinden kapsar.
import { mkdirSync } from "fs";
import { open, runSteps } from "./lib/page.mjs";

export const SCREENS = {
  home:        [],
  exams:       ["tab:Sınavlar"],
  osym:        ["tab:Sınavlar", "btn:ÖSYM Takvimi"],
  manual:      ["tab:Sınavlar", "btn:Manuel Ekle"],
  goals:       ["tab:Hedefler"],
  anx:         ["tab:Kaygı"],
  "anx-low":   ["tab:Kaygı", "radio:1"],
  report:      ["tab:Rapor"],
  hub:         ["btn:Psikoloji"],
  "psych-cat": ["btn:Psikoloji", "btn:Nefes & Gevşeme"],
  breath:      ["btn:Psikoloji", "btn:Nefes & Gevşeme", "btn:Kutu Nefesi"],
};

const [theme, prefix] = process.argv.slice(2);
if (!theme || !prefix) {
  console.error("kullanım: node shoot-all.mjs <dark|light> <önek>");
  process.exit(1);
}
mkdirSync(new URL("./shots/", import.meta.url), { recursive: true });

// Tohum veri: hedefler, kaygı ısı haritası ve rapor dolu olsun ki boş ekran
// yerine gerçek render karşılaştırılsın.
const day = i => {
  const d = new Date("2026-07-28T12:00:00"); d.setDate(d.getDate() - i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const anxiety = {}, studied = [];
for (let i = 34; i >= 0; i--) if (i % 4 !== 0) anxiety[day(i)] = ((i * 3) % 10) + 1;
for (let i = 6; i >= 0; i -= 2) studied.push(day(i));
const storage = {
  xb_anxiety: anxiety,
  xb_studied: studied,
  xb_streak: "4",
  xb_notif: "1",
  xb_goals: { [day(0)]: [
    { id: "g1", text: "TYT Matematik 40 soru", done: true },
    { id: "g2", text: "Paragraf tekrarı",      done: false },
  ] },
};

for (const [name, steps] of Object.entries(SCREENS)) {
  const { browser, page } = await open({ theme, storage });
  const full = await runSteps(page, [...steps, "full"]);
  const path = new URL(`./shots/${prefix}-${name}.png`, import.meta.url).pathname;
  await page.screenshot({ path, fullPage: full, animations: "disabled" });
  await browser.close();
  console.log("✓", `${prefix}-${name}.png`);
}
console.log(`\n${Object.keys(SCREENS).length} ekran → shots/${prefix}-*.png`);
