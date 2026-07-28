// Grup 7 — paywall, onay sheet'i ve toast.  node contrast-overlays.mjs <dark|light>
//
// Kova ayrımı (docs/LIGHT-MODE.md §6): "large" = ≥24px VEYA ≥18.66px + BOLD.
// Buradaki hiçbir metin bold+18.66 değil; en büyüğü paywall başlığı 23px/700 →
// large. 19px/600 onay başlığı ve 16.5px/700 CTA large DEĞİL (§6'daki "18 <
// 18.66" içtihadıyla aynı: ağırlık 600 bold sayılmıyor, 16.5 zaten küçük).
//
// Zemin nereden okunuyor (README "iki tuzak"):
//   DOM   → opak yüzeyler (kart, sheet, toast, --danger butonu)
//   PİKSEL→ gerçekten yarı saydam/gradyan katmanlar (ikon çipi --violet-soft,
//           CTA gradyanı, perde rgba(0,0,0,α) + blur)
import { open, pixels, colorOn } from "./lib/page.mjs";
import { cr, parse, hex, fmt, target } from "./lib/wcag.mjs";

const theme = process.argv[2] || "light";
const { browser, page } = await open({ theme, storage: { xb_notif: "1" } });

const line = (label, size, bucket, fg, bg, note = "") =>
  console.log(`   ${label.padEnd(30)} ${size.padEnd(10)} ${String(target(bucket)).padEnd(4)} ` +
              `${hex(fg)}/${hex(bg)} = ${fmt(cr(fg, bg), bucket)}${note}`);

/** Opak zeminli metin: renk ve zemin DOM'dan. */
async function onDom(label, locator, size, bucket = "normal") {
  const el = locator.first();
  if (!(await el.count())) return console.log(`   ${label.padEnd(30)} ÖĞE YOK`);
  const [c, b] = await colorOn(el);
  line(label, size, bucket, parse(c), parse(b));
}

/**
 * Yarı saydam/gradyan zeminli metin: zemin EKRANDAN, birden çok noktadan.
 * "İlk bulunan en zayıf değildir" — gradyan boyunca örnekleyip EN KÖTÜsünü al.
 */
async function onPixel(label, locator, size, bucket, pts) {
  const el = locator.first();
  if (!(await el.count())) return console.log(`   ${label.padEnd(30)} ÖĞE YOK`);
  const fg = parse(await el.evaluate(e => getComputedStyle(e).color));
  const b = await el.boundingBox();
  const { at } = await pixels(page);
  let worst = null, wr = Infinity;
  for (const [fx, fy] of pts) {
    const bg = at(b.x + b.width * fx, b.y + b.height * fy);
    const r = cr(fg, bg);
    if (r < wr) { wr = r; worst = bg; }
  }
  line(label, size, bucket, fg, worst, pts.length > 1 ? `   (${pts.length} noktanın en kötüsü)` : "");
}

console.log(`\n══ ${theme.toUpperCase()} — GRUP 7: overlay'ler ══`);
console.log(`   yer                            boyut      hedef ölçüm`);

// ── Paywall ────────────────────────────────────────────────────
await page.getByText(/Psikoloji/).first().click();       await page.waitForTimeout(600);
await page.getByText(/Nefes & Gevşeme/).first().click(); await page.waitForTimeout(600);
await page.getByText(/4-7-8 Uyku Nefesi/).first().click(); await page.waitForTimeout(700);

const dlg = page.locator('[role="dialog"]');
console.log("\n── PAYWALL  (kart: --surface-modal)");
await onDom("başlık 'Exam Bro Pro'", dlg.getByText("Exam Bro Pro", { exact: true }), "23px/700", "large");
await onDom("alt açıklama",          dlg.getByText(/Bir psikolog tarafından/), "13.5px");
await onDom("fayda başlığı",         dlg.getByText("Kaygı modülleri", { exact: true }), "15px/600");
await onDom("fayda açıklaması",      dlg.getByText(/Düşünce tuzakları/), "13px");
await onDom("ödeme notu",            dlg.getByText(/Tek seferlik ödeme/), "13px");
await onDom("'Satın alımı geri yükle'", dlg.getByText(/Satın alımı geri yükle/), "13.5px");
await onDom("'Şimdi değil'",         dlg.getByText(/Şimdi değil/), "13.5px");

// Yarı saydam çip: ikon --violet-soft üstünde, anlamlı grafik değil ama ölçülüyor.
// x+4 çipin içinde ve 19px'lik ikonun (8.5–27.5) dışında.
await onPixel("fayda ikonu (çip zemini)", dlg.locator('span[style*="border-radius: 10px"]'),
  "19px ikon", "large", [[0.11, 0.5]]);
// CTA: gradyan boyunca 5 nokta, en kötüsü (açık modda pembe uç).
await onPixel("CTA 'Pro'ya Geç'", dlg.getByText(/Pro'ya Geç|İşleniyor/),
  "16.5px/700", "normal", [[0.03, 0.5], [0.25, 0.5], [0.5, 0.12], [0.75, 0.5], [0.97, 0.5]]);

/**
 * Overlay yüzeyinin perdeden ayırt edilebilirliği (1.4.11 → 3:1).
 * İKİ satır: yüzeyin kendisi ve 1px kenarlığı. Rapor çubuklarındaki mantığın
 * aynısı (§4): dolgu farkı taşıyamıyorsa sınır taşır.
 * Kenarlık rengi DOM'dan alınıyor — 1px'i dSF=2'de piksel örneklemek kırılgan.
 */
async function boundary(label, locator) {
  const surf = parse((await colorOn(locator))[1]);
  const border = parse(await locator.first().evaluate(e => getComputedStyle(e).borderTopColor));
  const { at } = await pixels(page);
  const veil = at(195, 40);   // yüzeyin ÜSTÜ: karartılmış + blur'lanmış sayfa
  console.log(`   ${`${label} yüzeyi ↔ perde`.padEnd(30)} ${"—".padEnd(10)} ${"3".padEnd(4)}` +
              `${hex(surf)}/${hex(veil)} = ${fmt(cr(surf, veil), "large")}`);
  console.log(`   ${`${label} KENARLIĞI ↔ perde`.padEnd(30)} ${"1px".padEnd(10)} ${"3".padEnd(4)}` +
              `${hex(border)}/${hex(veil)} = ${fmt(cr(border, veil), "large")}   ← sınırı bu taşıyor`);
}

await boundary("kart", dlg);
{
  const card = parse((await colorOn(dlg))[1]);
  const handle = await dlg.locator('div[style*="width: 36px"]').first()
    .evaluate(e => getComputedStyle(e).backgroundColor);
  console.log(`   ${"tutamaç ↔ kart".padEnd(30)} ${"36×4".padEnd(10)} ${"—".padEnd(4)}` +
              `${hex(parse(handle))}/${hex(card)} = ${cr(parse(handle), card).toFixed(2)}:1  (dekoratif)`);
}

// ── Onay sheet'i ───────────────────────────────────────────────
await page.getByText(/Şimdi değil/).first().click(); await page.waitForTimeout(400);
// Psikoloji hub'ı hâlâ açık ve tüm ekranı kaplıyor — sekme tıklamasını yutuyor.
await page.getByLabel("Kapat").first().click(); await page.waitForTimeout(600);
await page.getByRole("tab", { name: /Rapor/ }).click(); await page.waitForTimeout(600);
await page.getByText(/Tüm verileri sıfırla/).first().click(); await page.waitForTimeout(600);

const sheet = page.locator('[role="alertdialog"]');
console.log("\n── ONAY SHEET'İ  (yüzey: --surface-sheet)");
await onDom("başlık",            sheet.getByText(/silinsin mi/), "19px/600");
await onDom("gövde",             sheet.getByText(/kalıcı olarak silinir/), "14.5px");
await onDom("onay butonu (danger)", sheet.getByText(/hepsini sil/), "16px/600");
await onDom("'Vazgeç'",          sheet.getByText(/Vazgeç/), "15px/500");
await boundary("sheet", sheet);

// ── Toast ──────────────────────────────────────────────────────
await page.getByText(/Vazgeç/).first().click(); await page.waitForTimeout(400);
await page.getByText(/Günlük hatırlatma/).first().click(); await page.waitForTimeout(500);

const toast = page.locator('[role="status"]');
console.log("\n── TOAST  (yüzey: --surface-toast)");
await onDom("toast metni", toast, "14px/500");
{
  const [, tb] = await colorOn(toast);
  const border = parse(await toast.first().evaluate(e => getComputedStyle(e).borderTopColor));
  const { at } = await pixels(page);
  const b = await toast.first().boundingBox();
  const behind = at(b.x + b.width / 2, b.y - 14);   // toast'ın hemen ÜSTÜ = sayfa
  console.log(`   ${"kenarlık ↔ arkadaki sayfa".padEnd(30)} ${"1px".padEnd(10)} ${"3".padEnd(4)}` +
              `${hex(border)}/${hex(behind)} = ${fmt(cr(border, behind), "large")}   (gölge de ayırıyor)`);
  console.log(`   ${"toast yüzeyi ↔ sayfa".padEnd(30)} ${"—".padEnd(10)} ${"—".padEnd(4)}` +
              `${hex(parse(tb))}/${hex(behind)} = ${cr(parse(tb), behind).toFixed(2)}:1`);
}

await browser.close();
