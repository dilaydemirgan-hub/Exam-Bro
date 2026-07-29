// theme-anim doğrulaması — (a)(b)(c)
// GERÇEK kod yolu kullanılıyor: preference="system" + emulateMedia ile
// prefers-color-scheme değiştiriliyor → theme.jsx'in mq dinleyicisi →
// applyTheme(t, true) → flashThemeAnim(). Sınıf elle eklenmiyor.
import { webkit } from "playwright";

const br = await webkit.launch();

async function session({ reducedMotion } = {}) {
  const ctx = await br.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
    ...(reducedMotion ? { reducedMotion: "reduce" } : {}),
  });
  const pg = await ctx.newPage();
  await pg.addInitScript(() => {
    localStorage.setItem("exambro_theme", "system");   // sistemi izle
    localStorage.setItem("xb_grade", "12");
  });
  await pg.goto("http://localhost:4173/", { waitUntil: "networkidle" });
  await pg.waitForTimeout(900);
  return { ctx, pg };
}

const tr = (pg, sel) => pg.evaluate(s => {
  const el = document.querySelector(s);
  return el ? getComputedStyle(el).transition : "ÖĞE YOK";
}, sel);
const hasAnim = pg => pg.evaluate(() => document.documentElement.classList.contains("theme-anim"));
const themeOf = pg => pg.evaluate(() => document.documentElement.getAttribute("data-theme"));

const BTN = "button.pressable.themed";      // "Bugün Çalıştım"
const NUM = ".num.no-theme-anim";           // geri sayım rakam kutusu

// ══ (b) dingin hal ═══════════════════════════════════════════
{
  const { ctx, pg } = await session();
  console.log("── (b) DİNGİN HAL (mod değişimi yokken)");
  console.log("   data-theme            :", await themeOf(pg));
  console.log("   html.theme-anim       :", await hasAnim(pg));
  console.log("   .pressable.themed     :", await tr(pg, BTN), " ← SADECE transform/opacity");
  console.log("   .themed (S.root)      :", await tr(pg, ".themed"));
  console.log("   rakam kutusu (muaf)   :", await tr(pg, NUM));

  // doneToday renk değişimi: tıkla, geçiş olmamalı (anında)
  await pg.getByRole("button", { name: /Bugün çalıştım olarak/ }).click();
  await pg.waitForTimeout(120);
  console.log("   tıklama SONRASI btn   :", await tr(pg, BTN), " ← hâlâ renk geçişi YOK");
  await ctx.close();
}

// ══ (a) mod değişimi ═════════════════════════════════════════
{
  const { ctx, pg } = await session();
  console.log("\n── (a) MOD DEĞİŞİMİ (gerçek yol: system + prefers-color-scheme)");
  await pg.emulateMedia({ colorScheme: "light" });
  await pg.waitForTimeout(30);
  console.log("   data-theme            :", await themeOf(pg));
  console.log("   html.theme-anim       :", await hasAnim(pg), " ← true OLMALI");
  console.log("   .pressable.themed     :", await tr(pg, BTN), " ← bg+color EKLENMİŞ olmalı");
  console.log("   .themed (S.root)      :", await tr(pg, ".themed"));
  console.log("   rakam kutusu (muaf)   :", await tr(pg, NUM), " ← DEĞİŞMEMELİ");

  await pg.waitForTimeout(280);
  console.log("   ...300ms sonra pencere kapanınca");
  console.log("   html.theme-anim       :", await hasAnim(pg), " ← false OLMALI");
  console.log("   .pressable.themed     :", await tr(pg, BTN), " ← tap animasyonuna DÖNDÜ");
  await ctx.close();
}

// ══ (c) BreathingPlayer çalışırken mod değişimi ══════════════
{
  const { ctx, pg } = await session();
  console.log("\n── (c) NEFES ÇALIŞIRKEN MOD DEĞİŞİMİ (ücretsiz 'kutu nefesi')");
  await pg.getByText(/Psikoloji/).first().click();          await pg.waitForTimeout(500);
  await pg.getByText(/Nefes & Gevşeme/).first().click();    await pg.waitForTimeout(500);
  await pg.getByText(/Kutu Nefesi/).first().click();        await pg.waitForTimeout(500);
  await pg.getByText(/Başla/).first().click();              await pg.waitForTimeout(900);

  const CIRCLE = "div.no-theme-anim[style*='scale']";
  // Inline stil, transition'ın kaynağı: sınıf kuralı bunu ezerse burada görürüz.
  const inlineTr = () => pg.evaluate(s => document.querySelector(s).style.transition, CIRCLE);
  // Egzersizin kendi durumu: çemberin İÇİNDEKİ geri sayan saniye + adım etiketi.
  // (body.innerText kullanma — overlay 'fixed', altındaki ana sayfa da geliyor.)
  const state = () => pg.evaluate(s =>
    document.querySelector(s).innerText.replace(/\n/g, " ").trim(), CIRCLE);

  const before = await tr(pg, CIRCLE);
  console.log("   çember transition ÖNCE:", before);
  console.log("   inline transition     :", await inlineTr());
  console.log("   egzersiz durumu ÖNCE  :", await state());

  await pg.emulateMedia({ colorScheme: "light" });
  await pg.waitForTimeout(30);
  const during = await tr(pg, CIRCLE);
  console.log("   html.theme-anim       :", await hasAnim(pg), "(pencere AÇIK)");
  console.log("   çember transition ANDA:", during, during === before ? " ← AYNI ✓" : " ← DEĞİŞTİ ✗");

  // Bir adım sınırını (4sn) geç: sayaç ve etiket ilerlemeye devam ediyor mu?
  await pg.waitForTimeout(2500);
  const mid = await state();
  await pg.waitForTimeout(2500);
  const after = await state();
  console.log("   egzersiz durumu +2.5sn:", mid);
  console.log("   egzersiz durumu +5.0sn:", after);
  console.log("   sayaç ilerliyor mu    :", mid !== after ? "EVET ✓ (döngü kesintisiz)" : "HAYIR ✗");
  console.log("   çember transition SONRA:", await tr(pg, CIRCLE));
  console.log("   data-theme            :", await themeOf(pg));
  await ctx.close();
}

// ══ (e) Paywall AÇIKKEN mod değişimi (Grup 7 · §7 S senaryosu) ══
// Overlay'ler mod değişiminde sıçramamalı: perde ve kart .themed taşıyor,
// yani geçici pencerede background-color geçişi ALMALI. Ayrıca sheet AÇIK
// KALMALI — mod değişimi React ağacını yeniden kurup modalı kapatmamalı.
{
  const { ctx, pg } = await session();
  console.log("\n── (e) PAYWALL AÇIKKEN MOD DEĞİŞİMİ");
  await pg.getByText(/Psikoloji/).first().click();            await pg.waitForTimeout(500);
  await pg.getByText(/Nefes & Gevşeme/).first().click();      await pg.waitForTimeout(500);
  await pg.getByText(/4-7-8 Uyku Nefesi/).first().click();    await pg.waitForTimeout(700);

  const WRAP = '[role="dialog"]';                 // modal kartı (--surface-modal)
  const VEIL = 'div:has(> [role="dialog"])';      // perde (--overlay-modal)
  const bg = sel => pg.evaluate(s => getComputedStyle(document.querySelector(s)).backgroundColor, sel);
  const isOpen = () => pg.locator(WRAP).count().then(n => n > 0);

  console.log("   paywall açık mı ÖNCE  :", await isOpen());
  console.log("   kart zemini ÖNCE      :", await bg(WRAP));
  console.log("   perde ÖNCE            :", await bg(VEIL));
  console.log("   kart transition ÖNCE  :", await tr(pg, WRAP));

  await pg.emulateMedia({ colorScheme: "light" });
  await pg.waitForTimeout(30);
  console.log("   html.theme-anim       :", await hasAnim(pg), " ← true OLMALI");
  console.log("   paywall açık mı ANDA  :", await isOpen(), " ← AÇIK KALMALI");
  console.log("   kart transition ANDA  :", await tr(pg, WRAP), " ← bg geçişi OLMALI");
  console.log("   perde transition ANDA :", await tr(pg, VEIL), " ← bg geçişi OLMALI");

  await pg.waitForTimeout(400);
  console.log("   ...pencere kapandıktan sonra");
  console.log("   data-theme            :", await themeOf(pg));
  console.log("   paywall açık mı SONRA :", await isOpen(), " ← hâlâ AÇIK");
  console.log("   kart zemini SONRA     :", await bg(WRAP), " ← açık moda geçmiş olmalı");
  console.log("   perde SONRA           :", await bg(VEIL));
  console.log("   html.theme-anim       :", await hasAnim(pg), " ← false OLMALI");

  // Sheet hâlâ ETKİLEŞİMLİ mi: "Şimdi değil" kapatabiliyor mu?
  await pg.getByText(/Şimdi değil/).first().click(); await pg.waitForTimeout(400);
  console.log("   'Şimdi değil' sonrası :", await isOpen(), " ← kapanmalı (false)");
  await ctx.close();
}

// ══ (f) Onay sheet'i AÇIKKEN mod değişimi ════════════════════
{
  const { ctx, pg } = await session();
  console.log("\n── (f) ONAY SHEET'İ AÇIKKEN MOD DEĞİŞİMİ");
  await pg.getByRole("tab", { name: /Rapor/ }).click();          await pg.waitForTimeout(600);
  await pg.getByText(/Tüm verileri sıfırla/).first().click();    await pg.waitForTimeout(500);

  const SHEET = '[role="alertdialog"]';
  const bg = sel => pg.evaluate(s => getComputedStyle(document.querySelector(s)).backgroundColor, sel);
  const isOpen = () => pg.locator(SHEET).count().then(n => n > 0);

  console.log("   sheet açık mı ÖNCE    :", await isOpen());
  console.log("   sheet zemini ÖNCE     :", await bg(SHEET));
  await pg.emulateMedia({ colorScheme: "light" });
  await pg.waitForTimeout(30);
  console.log("   html.theme-anim       :", await hasAnim(pg), " ← true OLMALI");
  console.log("   sheet açık mı ANDA    :", await isOpen(), " ← AÇIK KALMALI");
  console.log("   sheet transition ANDA :", await tr(pg, SHEET), " ← bg geçişi OLMALI");
  await pg.waitForTimeout(400);
  console.log("   sheet zemini SONRA    :", await bg(SHEET), " ← açık moda geçmiş olmalı");
  console.log("   data-theme            :", await themeOf(pg));
  await ctx.close();
}

// ══ (d) prefers-reduced-motion ═══════════════════════════════
{
  const { ctx, pg } = await session({ reducedMotion: true });
  console.log("\n── prefers-reduced-motion: reduce");
  await pg.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await pg.waitForTimeout(30);
  console.log("   data-theme            :", await themeOf(pg), " ← yine de değişmeli");
  console.log("   html.theme-anim       :", await hasAnim(pg), " ← false OLMALI (sınıf hiç eklenmez)");
  await ctx.close();
}

await br.close();
