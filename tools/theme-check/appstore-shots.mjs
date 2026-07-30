// App Store görselleri — 6.9" (iPhone 16/17 Pro Max).
//   node appstore-shots.mjs [dark|light]        (varsayılan light)
//
// ⚠️ ÖLÇÜ TAHMİN EDİLMEDİ. 6.9" cihazın native çözünürlüğü ölçülerek bulundu:
// `xcrun simctl io "iPhone 17 Pro Max" screenshot` → 1320×2868. Mantıksal boyut
// 440×956 pt olduğu için deviceScaleFactor = 3 (440*3=1320, 956*3=2868).
// dSF yanlış olursa dosya App Store Connect tarafından reddedilir.
//
// ⚠️ VIEWPORT çekimi, fullPage DEĞİL: App Store görselleri TAM olarak
// 1320×2868 olmak zorunda; fullPage daha uzun bir görüntü üretir.

import { webkit } from "playwright";
import { mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const theme = process.argv[2] || "light";
const OUT = join(homedir(), "Desktop", "exambro-ss");

// 6.9" — ölçülen değer
const VIEWPORT = { width: 440, height: 956 };
const SCALE = 3;

// ⚠️ SAFE AREA TAHMİN EDİLMEDİ — iPhone 17 Pro Max simülatöründe uygulama
// çalıştırılıp İKİ BAĞIMSIZ yoldan ölçüldü, ikisi de 62pt'de buluştu:
//   (a) header alt kenarlığı: cihaz 131.0pt − tarayıcı 69.2pt = 61.77pt
//   (b) logo ilk mor piksel satırı: (251−64)/3 = 62.33pt
// Tarayıcıda env(safe-area-inset-top) = 0 olduğu için app bu alanı ayırmıyor;
// aşağıda inline stillerdeki env() ifadeleri 62px ile değiştirilerek CİHAZDAKİ
// yerleşim birebir üretiliyor. Böylece durum çubuğu içeriği kaydırmıyor —
// tam da cihazdaki gibi ayrılmış alanın içine düşüyor.
const SAFE_TOP = 62;

// Durum çubuğu yerleşimi de aynı cihaz görüntüsünden ölçüldü (pt):
//   saat 61–105 (sol "kulak"ta ortalı) · Dynamic Island 157–283
//   wifi 342–360 · pil 371–394 · dikey merkez ≈ 32.5
const STATUS = {
  time: "15:48",          // mevcut App Store görselleriyle aynı
  centerY: 32.5,
  clockEarWidth: 166,     // sol kulak: 0–166, saat içinde ortalı
  rightInset: 46,         // 440 − 394 (pil sağ kenarı)
  gap: 10,
};

const URL = process.env.THEME_CHECK_URL || "http://localhost:4173/";
// Saat dondurulur: geri sayımın saniyesi her karede değişiyor, yoksa aynı
// betiği iki kez koşmak farklı görseller üretir.
const FIXED_TIME = new Date("2026-07-28T09:00:00Z");

const day = i => {
  const d = new Date("2026-07-28T12:00:00");
  d.setDate(d.getDate() - i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Tohum veri: hiçbir ekran boş görünmesin — sayaçlar, ısı haritası, hedefler,
// rapor grafikleri ve seri hepsi dolu.
const anxiety = {};
for (let i = 34; i >= 0; i--) if (i % 4 !== 0) anxiety[day(i)] = ((i * 3) % 10) + 1;
const studied = [];
for (let i = 12; i >= 0; i -= 2) studied.push(day(i));

const SEED = {
  exambro_theme: theme,
  xb_grade: "12",
  xb_streak: "6",
  xb_notif: "1",
  xb_anxiety: anxiety,
  xb_studied: studied,
  xb_widget_exams: ["TYT", "m_1"],
  xb_customs: [{ id: "m_1", n: "Matematik Yazılı", sub: "AYT Mat",
                 date: "2026-09-15T09:00:00", c: "#ffbe0b" }],
  xb_goals: { [day(0)]: [
    { id: "g1", text: "TYT Matematik 40 soru", done: true },
    { id: "g2", text: "Paragraf tekrarı",      done: true },
    { id: "g3", text: "AYT Fizik konu tekrarı", done: false },
  ] },
};

// Sıra App Store'daki sırayla aynı: 5 sekme + Psikoloji.
//
// `align`: kaydırma konumu TAHMİN EDİLMEZ. Verilen öğenin ALT kenarı, sabit nav
// çubuğunun üstüne `gap` boşluk kalacak şekilde hizalanır. Böylece çerçevenin
// altında yarım kart kalmıyor ve yazılar yarı saydam nav'ın altından sızmıyor.
// Hizalama sonrası sonuç ÖLÇÜLÜP doğrulanıyor (aşağıda `alignBottomAboveNav`).
const SCREENS = [
  // Ana sayfada 3. sayaç kartı ("Matengmatik Yazılı") yarım kalıyordu → tam görünür.
  ["01-ana-sayfa",  [], { align: "pageBottom" }],
  ["02-sinavlar",   ["tab:Sınavlar"]],
  ["03-hedefler",   ["tab:Hedefler"]],
  ["04-kaygi",      ["tab:Kaygı"]],
  // Bu sürümün başlık özelliği: "Görünüm" seçicisi. Ayarlar kartının TAMAMI
  // çerçevede olsun; bunun için üstteki istatistik kutuları kesilebilir.
  ["05-rapor",      ["tab:Rapor"], { align: "settingsCard", gap: 12 }],
  ["06-psikoloji",  ["btn:Psikoloji"]],
];

/**
 * Hedef öğenin alt kenarını sabit nav çubuğunun üstüne hizalar.
 * Sayfa gövdesi ya da içteki kaydırılabilir kap — hangisi kayıyorsa o kaydırılır.
 * @returns ölçülen son durum (doğrulama için)
 */
async function alignBottomAboveNav(page, target, gap) {
  return page.evaluate(({ target, gap }) => {
    // Nav: bir tab'ın en yakın position:fixed atası
    const tab = document.querySelector('[role="tab"]');
    let navEl = tab;
    while (navEl && getComputedStyle(navEl).position !== "fixed") navEl = navEl.parentElement;
    const navTop = navEl ? navEl.getBoundingClientRect().top : innerHeight;

    // Hedef öğe
    let el = null;
    if (target === "settingsCard") {
      // ⚠️ `rg.closest(".themed")` KENDİSİNİ buluyor: segment kontrolünün rayı da
      // `.themed` taşıyor (mod değişiminde geçiş alsın diye). Bir üstten başla.
      const rg = document.querySelector('[role="radiogroup"][aria-label="Görünüm"]');
      el = rg?.parentElement?.closest(".themed");   // ayarlar Card'ı
    } else if (target === "lastCountdownCard") {
      // Sayaç kartları: .themed taşıyan ve içinde .num rakam kutusu olanlar
      const cards = [...document.querySelectorAll(".themed")]
        .filter(c => c.querySelector(".num"));
      el = cards[cards.length - 1];
    }
    // Sayfa sonu: nav'ın altında içerik KALMAZ (alt padding'e denk gelir), yani
    // yarı saydam nav'dan hiçbir yazı sızmaz. Orta konumlarda bu imkânsız.
    if (target === "pageBottom") {
      window.scrollTo(0, document.documentElement.scrollHeight);
      return { scroller: "sayfa", delta: 0, navTop: Math.round(navTop),
               elTop: 0, elBottom: 0, ok: true, mode: "sayfa sonu" };
    }
    if (!el) return { error: `hedef bulunamadı: ${target}` };

    // Kaydırılabilir kap: öğenin atalarından taşanı, yoksa sayfa
    let sc = el.parentElement;
    while (sc && sc !== document.body) {
      const s = getComputedStyle(sc);
      if (/(auto|scroll)/.test(s.overflowY) && sc.scrollHeight > sc.clientHeight + 1) break;
      sc = sc.parentElement;
    }
    const usePage = !sc || sc === document.body;

    const delta = (el.getBoundingClientRect().bottom) - (navTop - gap);
    if (usePage) window.scrollBy(0, delta);
    else sc.scrollTop += delta;

    const r = el.getBoundingClientRect();
    // Header: sabit üst çubuk (varsa) — öğenin altına girmemesi için raporlanıyor
    const hdr = [...document.querySelectorAll("*")].find(e =>
      getComputedStyle(e).position === "fixed" && e.getBoundingClientRect().top <= 0.5
      && e.getBoundingClientRect().height < 200 && e.contains(document.querySelector("h1,div")) === false);
    return {
      scroller: usePage ? "sayfa" : "iç kap",
      delta: Math.round(delta),
      navTop: Math.round(navTop),
      elTop: Math.round(r.top),
      elBottom: Math.round(r.bottom),
      headerBottom: hdr ? Math.round(hdr.getBoundingClientRect().bottom) : null,
      ok: r.bottom <= navTop - gap + 1.5,
    };
  }, { target, gap });
}

/**
 * Cihazdaki üst güvenli alanı ayırır ve iOS durum çubuğunu çizer.
 * Önce env() değişimi, sonra çubuk — böylece çubuk ayrılan alanın içine oturur
 * ve uygulama içeriği kaymaz.
 */
async function addStatusBar(page, theme) {
  await page.evaluate(({ safeTop, S, dark }) => {
    // 1) env(safe-area-inset-top) tarayıcıda 0 → cihazdaki değerle değiştir.
    //    React stilleri inline; style ÖZNİTELİĞİ calc ifadesini metin olarak tutuyor.
    for (const el of document.querySelectorAll("[style*='safe-area-inset-top']")) {
      el.setAttribute("style",
        el.getAttribute("style").replace(/env\(safe-area-inset-top\)/g, safeTop + "px"));
    }

    // 2) Durum çubuğu — her şeyin ÜSTÜNDE (cihazda da app'in üstüne çiziliyor)
    const fg = dark ? "#ffffff" : "#000000";
    const bar = document.createElement("div");
    bar.setAttribute("data-status-bar", "");
    bar.style.cssText = `position:fixed;top:0;left:0;right:0;height:${safeTop}px;` +
      `z-index:2147483647;pointer-events:none;font-family:-apple-system,'SF Pro Text',system-ui;`;

    // Saat — sol kulakta ortalı (ölçüm: 61–105pt, merkez 83pt)
    const clock = document.createElement("div");
    clock.textContent = S.time;
    clock.style.cssText = `position:absolute;left:0;width:${S.clockEarWidth}px;` +
      `top:${S.centerY}px;transform:translateY(-50%);text-align:center;` +
      `color:${fg};font-size:17px;font-weight:600;letter-spacing:0.1px;`;
    bar.appendChild(clock);

    // Sağ grup: sinyal · wifi · pil (ölçüm: pil sağ kenarı 394pt → sağ boşluk 46pt)
    const right = document.createElement("div");
    right.style.cssText = `position:absolute;right:${S.rightInset}px;top:${S.centerY}px;` +
      `transform:translateY(-50%);display:flex;align-items:center;gap:${S.gap}px;`;
    right.innerHTML = `
      <svg width="18" height="12" viewBox="0 0 18 12" fill="${fg}">
        <rect x="0"  y="8.5" width="3" height="3.5" rx="1"/>
        <rect x="5"  y="6"   width="3" height="6"   rx="1"/>
        <rect x="10" y="3"   width="3" height="9"   rx="1"/>
        <rect x="15" y="0"   width="3" height="12"  rx="1"/>
      </svg>
      <svg width="18" height="13" viewBox="0 0 18 13" fill="none" stroke="${fg}"
           stroke-width="1.9" stroke-linecap="round">
        <path d="M1.2 4.1a12 12 0 0 1 15.6 0"/>
        <path d="M4.1 7.3a7.6 7.6 0 0 1 9.8 0"/>
        <path d="M7 10.5a3.2 3.2 0 0 1 4 0"/>
      </svg>
      <svg width="23" height="12" viewBox="0 0 23 12" fill="none">
        <rect x="0.6" y="0.6" width="19.2" height="10.8" rx="3.2"
              stroke="${fg}" stroke-opacity="0.38" stroke-width="1.1"/>
        <rect x="2.1" y="2.1" width="16.2" height="7.8" rx="2" fill="${fg}"/>
        <path d="M21.4 4.2v3.6a2.1 2.1 0 0 0 0-3.6z" fill="${fg}" fill-opacity="0.42"/>
      </svg>`;
    bar.appendChild(right);
    document.body.appendChild(bar);
  }, { safeTop: SAFE_TOP, S: STATUS, dark: theme === "dark" });
}

mkdirSync(OUT, { recursive: true });
const browser = await webkit.launch();

// Sadece belirli ekranları yeniden çekmek için: node appstore-shots.mjs light 01 05
const only = process.argv.slice(3);
const wanted = SCREENS.filter(([n]) => !only.length || only.some(p => n.startsWith(p)));

for (const [name, steps, opts = {}] of wanted) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(FIXED_TIME);
  await page.addInitScript(items => {
    for (const [k, v] of Object.entries(items)) {
      localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    }
  }, SEED);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1100);          // Splash

  for (const s of steps) {
    const k = s.slice(0, s.indexOf(":")), v = s.slice(s.indexOf(":") + 1);
    if (k === "tab") await page.getByRole("tab", { name: new RegExp(v) }).click();
    if (k === "btn") await page.getByText(new RegExp(v)).first().click();
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(400);

  // Güvenli alan + durum çubuğu, HİZALAMADAN ÖNCE: yerleşim değiştiği için
  // kaydırma konumu yeni hâle göre hesaplanmalı.
  await addStatusBar(page, theme);
  await page.waitForTimeout(250);

  if (opts.align) {
    const r = await alignBottomAboveNav(page, opts.align, opts.gap ?? 12);
    await page.waitForTimeout(350);
    if (r.error) { console.error("✗", name, r.error); await ctx.close(); continue; }
    console.log(`   hizalama(${opts.align}) ${r.scroller} · kaydırma ${r.delta}px · ` +
                `öğe ${r.elTop}–${r.elBottom} · nav üstü ${r.navTop} · ${r.ok ? "✓ tam çerçevede" : "✗ HÂLÂ TAŞIYOR"}`);
  }

  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, animations: "disabled" });   // viewport, fullPage DEĞİL
  console.log("✓", path);
  await ctx.close();
}

await browser.close();
