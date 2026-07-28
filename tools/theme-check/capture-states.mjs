// Etkileşimli durumlar: seçili ders çipi + etkin "Sınav Ekle" + ÖSYM "Eklendi"
// node states.mjs <dark|light>
import { mkdirSync } from "fs";
import { webkit } from "playwright";
const mode = process.argv[2];
mkdirSync("shots", { recursive: true });

const br = await webkit.launch();
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const pg = await ctx.newPage();
await pg.clock.setFixedTime(new Date("2026-07-28T09:00:00Z"));
await pg.addInitScript(m => {
  localStorage.setItem("exambro_theme", m);
  localStorage.setItem("xb_grade", "12");
}, mode);
await pg.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await pg.waitForTimeout(900);

await pg.getByRole("tab", { name: /Sınavlar/ }).click();
await pg.waitForTimeout(400);

// ── Manuel: form dolu + çip seçili → buton ETKİN
await pg.getByText(/Manuel Ekle/).first().click();
await pg.waitForTimeout(400);
await pg.getByLabel("Sınav adı").fill("Matematik Yazılı");
await pg.getByLabel("Sınav tarihi").fill("2026-11-20");
await pg.getByText(/^AYT Mat$/).first().click();
await pg.waitForTimeout(300);
await pg.screenshot({ path: `shots/${mode}-manual-filled.png`, animations: "disabled" });

// ── ÖSYM: bir sınav ekle → "Eklendi" rozeti
await pg.getByText(/Geri/).first().click();
await pg.waitForTimeout(400);
await pg.getByText(/ÖSYM Takvimi/).first().click();
await pg.waitForTimeout(400);
await pg.getByRole("button", { name: /sınavını ekle/ }).first().click();
await pg.waitForTimeout(400);
await pg.screenshot({ path: `shots/${mode}-osym-added.png`, animations: "disabled" });

await br.close();
console.log("✓", mode);
