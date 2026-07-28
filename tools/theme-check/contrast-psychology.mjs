// Grup 6 kontrast — gradyan zeminli metinler PİKSELDEN, düz zeminliler DOM'dan.
import { webkit } from "playwright";
import { PNG } from "pngjs";
import { cr, hex, parse } from "./lib/wcag.mjs";
const mode = process.argv[2] || "light";
const br = await webkit.launch();
const pg = await (await br.newContext({viewport:{width:390,height:844}})).newPage();
await pg.clock.setFixedTime(new Date("2026-07-28T09:00:00Z"));
await pg.addInitScript(m => { localStorage.setItem("exambro_theme", m);
  localStorage.setItem("xb_grade","12"); }, mode);
await pg.goto("http://localhost:4173/",{waitUntil:"networkidle"});
await pg.waitForTimeout(900);
let shot;
const px=(x,y)=>{const i=(shot.width*Math.round(y)+Math.round(x))<<2;return[shot.data[i],shot.data[i+1],shot.data[i+2]];};
async function grad(label, sel, size, bucket, dx=0.5, dy=0.22){
  const el=pg.locator(sel).first();
  if(!await el.count()){console.log(`   ${label.padEnd(32)} ÖĞE YOK`);return;}
  const color=parse(await el.evaluate(e=>getComputedStyle(e).color));
  const b=await el.boundingBox();
  shot=PNG.sync.read(await pg.screenshot());
  const bg=px(b.x+b.width*dx, b.y+b.height*dy);
  const t=bucket==="large"?3:4.5, r=cr(color,bg);
  console.log(`   ${label.padEnd(32)} ${size.padEnd(11)} ${(bucket==="large"?"3.0":"4.5")}  ${hex(color)}/${hex(bg)} = ${r.toFixed(2)}:1 ${r>=t?"✓":"✗"}`);
}
console.log(`\n══ ${mode.toUpperCase()} — GRUP 6 ══\n   yer                              boyut       kova ölçüm`);
await pg.getByText(/Psikoloji/).first().click(); await pg.waitForTimeout(600);
await grad("kategori chevron (grafik)", 'button:has-text("Nefes & Gevşeme") span:last-child', "18px", "large", 0.5, 0.5);
await grad("kategori başlığı", 'button:has-text("Nefes & Gevşeme") span span:first-child', "17px/700", "normal", 0.9, 0.5);
await pg.getByText(/Nefes & Gevşeme/).first().click(); await pg.waitForTimeout(600);
await grad("öğe chevron (grafik)", 'button:has-text("Kutu Nefesi") span:last-child', "18px", "large", 0.5, 0.5);
await pg.getByText(/Kutu Nefesi/).first().click(); await pg.waitForTimeout(500);
await pg.getByText(/Başla/).first().click(); await pg.waitForTimeout(1000);
await grad("nefes çemberi sayacı", 'div.no-theme-anim[style*="scale"] > div:first-child', "46px/700", "large");
await grad('nefes çemberi "sn"', 'div.no-theme-anim[style*="scale"] > div:last-child', "13px", "normal");
await grad("adım etiketi", 'text=/nefes al|Tut|ver/', "22px/600", "normal", 0.02, 0.5);
await br.close();
