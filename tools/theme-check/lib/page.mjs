// Ortak sayfa kurulumu: tarayıcı, dondurulmuş saat, tohum veri, piksel okuma.

import { webkit } from "playwright";
import { PNG } from "pngjs";

export const URL = process.env.THEME_CHECK_URL || "http://localhost:4173/";

/**
 * ⚠️ SAATİ DONDURMAK ŞART.
 * Geri sayımın SANİYE hanesi her karede değişiyor; dondurulmazsa piksel farkı
 * testi sahte fark üretir. İlk denemede ana sayfada 1488 piksel (%0.08) fark
 * çıkmış ve gerçek bir regresyon sanılmıştı — fark yalnızca DK/SN hanelerindeydi.
 * Tarih, examDates.js'teki sınavlara göre seçildi; değiştirirseniz referans
 * görüntülerin TAMAMINI yeniden üretin.
 */
export const FIXED_TIME = new Date("2026-07-28T09:00:00Z");

/** Onboarding'i atlayan ve ekranları dolduran varsayılan tohum veri. */
export const SEED = {
  // 12. sınıf → hidden varsayılanı ["LGS"], yani FIXED listede hem görünür
  // (TYT/AYT) hem gizli (LGS) kart aynı ekranda.
  grade: "12",
  customs: [{ id: "m_1", n: "Matematik Yazılı", sub: "AYT Mat",
              date: "2026-09-15T09:00:00", c: "#ffbe0b" }],
};

/**
 * Tarayıcı + sayfa açar, temayı ve tohum veriyi React mount olmadan yazar.
 * @param {object} o
 * @param {"dark"|"light"} o.theme
 * @param {object} [o.storage]  ek localStorage anahtarları (değerler JSON'lanır)
 * @param {"reduce"} [o.reducedMotion]
 * @param {"dark"|"light"} [o.colorScheme]  cihazın prefers-color-scheme'i
 */
export async function open({ theme = "dark", storage = {}, reducedMotion, colorScheme } = {}) {
  const browser = await webkit.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    ...(colorScheme ? { colorScheme } : {}),
    ...(reducedMotion ? { reducedMotion } : {}),
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXED_TIME);

  const base = {
    exambro_theme: theme,
    xb_grade: SEED.grade,
    xb_customs: SEED.customs,
    ...storage,
  };
  await page.addInitScript(items => {
    for (const [k, v] of Object.entries(items)) {
      localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    }
  }, base);

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);   // Splash
  return { browser, context, page };
}

/**
 * Ekran görüntüsünü PNG olarak alıp (x,y) piksel okuyucusu döndürür.
 *
 * ⚠️ `at()` CSS PİKSELİ alır, cihaz pikseli değil. deviceScaleFactor 2 olduğu
 * için PNG iki kat büyük; boundingBox() ise CSS pikseli döndürüyor. Ölçek
 * burada uygulanmazsa örnekleme noktası ekranın sol üst çeyreğine düşer ve
 * ölçüm sessizce yanlış çıkar (yaşandı: her şey 1.00:1 göründü).
 */
export async function pixels(page, { fullPage = false } = {}) {
  const png = PNG.sync.read(await page.screenshot({ fullPage }));
  const vw = page.viewportSize().width;
  const s = png.width / vw;
  const at = (x, y) => {
    const i = (png.width * Math.round(y * s) + Math.round(x * s)) << 2;
    return [png.data[i], png.data[i + 1], png.data[i + 2]];
  };
  return { png, at, scale: s };
}

/**
 * Bir öğenin GERÇEK zeminini DOM'dan çözer: ilk OPAK atanın background-color'ı.
 *
 * ⚠️ Metinlerde bunu kullanın, piksel örneklemesini DEĞİL — örnekleme noktası
 * harfin üstüne düşüp sahte "1.00:1" üretiyor. Piksel okuma yalnızca gerçekten
 * yarı saydam katmanlar için (çubuk, ısı haritası karesi, toggle, gradyan).
 */
export const RESOLVE_BG = `el => {
  let e = el;
  while (e) {
    const c = getComputedStyle(e).backgroundColor;
    const m = c.match(/[\\d.]+/g);
    if (m && (m.length < 4 || parseFloat(m[3]) > 0.99)) return c;
    e = e.parentElement;
  }
  return getComputedStyle(document.documentElement).backgroundColor;
}`;

/** Öğenin rengi + DOM'dan çözülmüş zemini. */
export async function colorOn(locator) {
  return locator.evaluate((e, R) => {
    const resolve = eval(R);
    return [getComputedStyle(e).color, resolve(e)];
  }, RESOLVE_BG);
}

/** CSS değişkeni oku (`--bg` → "#080810"). */
export const token = (page, name) =>
  page.evaluate(n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

/**
 * `cap.mjs` adım dili: tab:Rapor · btn:Metin · radio:8 · wait:500 · full
 * Dönen değer: fullPage istenip istenmediği.
 */
export async function runSteps(page, steps) {
  let full = false;
  for (const s of steps) {
    const [k, v] = [s.slice(0, s.indexOf(":")), s.slice(s.indexOf(":") + 1)];
    if (s === "full")  { full = true; continue; }
    if (k === "wait")  { await page.waitForTimeout(+v); continue; }
    if (k === "tab")   await page.getByRole("tab", { name: new RegExp(v) }).click();
    if (k === "btn")   await page.getByText(new RegExp(v)).first().click();
    if (k === "radio") await page.getByRole("radio", { name: new RegExp(`^${v}$`) }).click();
    await page.waitForTimeout(450);   // fadeup
  }
  await page.waitForTimeout(300);
  return full;
}
