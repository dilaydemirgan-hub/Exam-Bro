// Chevron'lar: doğrudan buton çocuğu olan SON span
import { webkit } from "playwright";
import { PNG } from "pngjs";
import { cr, hex, parse } from "./lib/wcag.mjs";
const mode=process.argv[2];
const br=await webkit.launch();
const pg=await (await br.newContext({viewport:{width:390,height:844}})).newPage();
await pg.clock.setFixedTime(new Date("2026-07-28T09:00:00Z"));
await pg.addInitScript(m=>{localStorage.setItem("exambro_theme",m);localStorage.setItem("xb_grade","12");},mode);
await pg.goto("http://localhost:4173/",{waitUntil:"networkidle"}); await pg.waitForTimeout(900);
async function chev(label, btnSel){
  const el=pg.locator(`${btnSel} > span`).last();
  const color=parse(await el.evaluate(e=>getComputedStyle(e).color));
  const b=await el.boundingBox();
  const s=PNG.sync.read(await pg.screenshot());
  const at=(x,y)=>{const i=(s.width*Math.round(y)+Math.round(x))<<2;return[s.data[i],s.data[i+1],s.data[i+2]];};
  const bg=at(b.x+b.width+6, b.y+b.height/2);   // chevron'un SAĞINDAKİ kart zemini
  console.log(`   ${label.padEnd(30)} ikon ${hex(color)} / zemin ${hex(bg)} = ${cr(color,bg).toFixed(2)}:1 ${cr(color,bg)>=3?"✓":"✗"}`);
}
console.log(`\n══ ${mode.toUpperCase()} — chevron (anlam taşıyan grafik, 3:1)`);
await pg.getByText(/Psikoloji/).first().click(); await pg.waitForTimeout(600);
for (const [n,t] of [["Kaygı Modülleri (violet)","Kaygı Modülleri"],["Nefes & Gevşeme (green)","Nefes & Gevşeme"],["Erteleme (amber)","Erteleme"]])
  await chev(n, `button:has-text("${t}")`);
await pg.getByText(/Nefes & Gevşeme/).first().click(); await pg.waitForTimeout(600);
await chev("öğe listesi (kilitsiz)", 'button:has-text("Kutu Nefesi")');
await br.close();
