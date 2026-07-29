// TÜM metin/zemin çiftlerini süpürür.  node contrast-sweep.mjs <dark|light>
//
// §9'daki "56 çiftin tamamı AA" maddesinin üreticisi. Elle liste tutmak yerine
// 14 ekranın HEPSİNDE gerçekten render edilmiş her metin düğümünü geziyor;
// böylece yeni bir metin eklendiğinde liste kendiliğinden büyüyor.
//
// Zemin DOM'dan çözülüyor (ilk OPAK ata) — README "tuzak 1": metinde piksel
// örneklemesi harfin üstüne düşüp sahte 1.00:1 üretiyor.
//
// ⚠️ GRADYAN / YARI SAYDAM ARA KATMAN: opak ataya kadar yolda bir
// background-image (gradyan) ya da yarı saydam background-color varsa DOM'dan
// çözülen zemin GERÇEK render edilen zemin DEĞİLDİR. Bu satırlar "⚠ gradyan"
// diye işaretlenip ayrı sayılıyor; onların doğru ölçümü, pikselden okuyan
// alana özel betiklerde (contrast-psychology / -overlays / -report).
import { open, runSteps, pixels } from "./lib/page.mjs";
import { SCREENS } from "./lib/screens.mjs";
import { cr, parse, fmt, target } from "./lib/wcag.mjs";

const theme = process.argv[2] || "light";

// Sayfadaki her metin taşıyan öğeyi topla.
const COLLECT = () => {
  const out = [], skipped = { off: 0, covered: 0 };
  const opaque = c => { const m = c.match(/[\d.]+/g); return m && (m.length < 4 || parseFloat(m[3]) > 0.99); };
  for (const el of document.querySelectorAll("body *")) {
    // Yalnızca DOĞRUDAN metin çocuğu olanlar (kapsayıcılar iki kez saymasın).
    const text = [...el.childNodes]
      .filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim();
    if (!text) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || parseFloat(s.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;

    // GÖRÜNÜR ALANIN İÇİNDE olmalı: zemini ekrandan okuyacağız ve ekran
    // görüntüsü yalnızca viewport. Katlamanın altı bu ekranda ölçülmez —
    // kapsam sınırı çıktıda ayrıca raporlanıyor.
    if (r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth) { skipped.off++; continue; }

    // ÖRTÜLMEMİŞ olmalı: overlay açıkken altta kalan metinlerin computed
    // color'ı değişmiyor ama ekranda perde görünüyor — ölçülürse anlamsız
    // çift üretir (nav yazısı perdenin üstünde "1.41:1" gibi).
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    if (!hit || !(hit === el || el.contains(hit) || hit.contains(el))) { skipped.covered++; continue; }

    // Zemin: ilk opak atanın background-color'ı. Yolda gradyan/yarı saydam var mı?
    // `veilBox`: zemini gerçekten boyayan EN YAKIN katman — pikselden okurken
    // örnekleme kutusu bu olacak (öğenin kendi dar kutusu değil).
    let e = el, bg = null, veiled = false, veilBox = null;
    while (e) {
      const cs = getComputedStyle(e);
      const a = cs.backgroundColor.match(/[\d.]+/g);
      if (cs.backgroundImage && cs.backgroundImage !== "none") {
        veiled = true; veilBox = veilBox || e.getBoundingClientRect();
      }
      if (opaque(cs.backgroundColor)) { bg = cs.backgroundColor; break; }
      if (a?.length === 4 && parseFloat(a[3]) > 0) {
        veiled = true; veilBox = veilBox || e.getBoundingClientRect();
      }
      e = e.parentElement;
    }
    if (!bg) bg = getComputedStyle(document.documentElement).backgroundColor;

    // Harflerin GERÇEK sınırı: Range, öğe kutusundan dar olabilir (ortalanmış
    // buton yazısı gibi). Örneklemede bu dikdörtgenin içi atlanacak.
    const rng = document.createRange();
    rng.selectNodeContents(el);
    const t = rng.getBoundingClientRect();

    const size = parseFloat(s.fontSize), weight = parseInt(s.fontWeight, 10) || 400;
    out.push({
      text: text.slice(0, 28), color: s.color, bg, size, weight, veiled,
      rect: veilBox ? { x: veilBox.x, y: veilBox.y, w: veilBox.width, h: veilBox.height }
                    : { x: r.x, y: r.y, w: r.width, h: r.height },
      textRect: { x: t.x, y: t.y, w: t.width, h: t.height },
      // WCAG "büyük metin": ≥24px, VEYA ≥18.66px ve bold(≥700).
      bucket: size >= 24 || (size >= 18.66 && weight >= 700) ? "large" : "normal",
    });
  }
  return { out, skipped };
};

const seen = new Map();
let offscreen = 0, covered = 0;
for (const [screen, steps] of Object.entries(SCREENS)) {
  const { browser, page } = await open({ theme, storage: {
    xb_streak: "4", xb_notif: "1",
    xb_anxiety: Object.fromEntries([...Array(20)].map((_, i) => {
      const d = new Date("2026-07-28T12:00:00"); d.setDate(d.getDate() - i);
      return [`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, (i % 10) + 1];
    })),
    xb_goals: { "2026-07-28": [{ id: "a", text: "TYT Matematik", done: true },
                               { id: "b", text: "Paragraf tekrarı", done: false }] },
  } });
  await runSteps(page, steps.filter(s => s !== "viewport"));
  const { out: collected, skipped } = await page.evaluate(COLLECT);
  offscreen += skipped.off; covered += skipped.covered;

  // Gradyan/yarı saydam zeminli metinlerde DOM'dan çözülen zemin YANLIŞ.
  // Onlarda zemini EKRANDAN oku — ama tek nokta değil: örnekleme harfin
  // üstüne düşerse sahte 1.00:1 çıkıyor (README tuzak 1). Öğe kutusuna bir
  // ızgara atıp EN SIK görülen rengi alıyoruz: zemin pikselleri harf
  // piksellerinden her zaman çok daha kalabalık.
  if (collected.some(r => r.veiled)) {
    // Viewport görüntüsü (fullPage DEĞİL): position:fixed overlay'ler tam sayfa
    // çekimde yanlış yere düşüyor. Toplanan öğelerin hepsi zaten viewport içinde.
    const { at } = await pixels(page);
    for (const row of collected) {
      if (!row.veiled) continue;
      const { x, y, w, h } = row.rect, t = row.textRect;
      const tally = new Map();
      for (let i = 1; i <= 23; i++) for (let j = 1; j <= 9; j++) {
        const sx = x + (w * i) / 24, sy = y + (h * j) / 10;
        // Harflerin dikdörtgenini 2px payla ATLA — yoksa örnekleme glif'in
        // üstüne düşer ve sahte 1.00:1 çıkar (README tuzak 1).
        if (sx > t.x - 2 && sx < t.x + t.w + 2 && sy > t.y - 2 && sy < t.y + t.h + 2) continue;
        const p = at(sx, sy);
        if (p[0] === undefined) continue;          // görüntünün dışına düştü
        const k = p.join(",");
        tally.set(k, (tally.get(k) || 0) + 1);
      }
      if (!tally.size) continue;                   // hiç okunamadı → DOM zemini kalsın
      const [best] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
      row.bg = `rgb(${best})`;
      row.sampled = true;
    }
  }

  for (const row of collected) {
    // Aynı renk+zemin+kova çiftini bir kez say; ilk görüldüğü yeri sakla.
    const key = `${row.color}|${row.bg}|${row.bucket}`;
    if (!seen.has(key)) seen.set(key, { ...row, screen });
  }
  await browser.close();
}

const rows = [...seen.values()]
  .map(r => ({ ...r, ratio: cr(parse(r.color), parse(r.bg)) }))
  .sort((a, b) => a.ratio - b.ratio);

const dom = rows.filter(r => !r.sampled);
const px = rows.filter(r => r.sampled);
const fails = rows.filter(r => r.ratio < target(r.bucket));

console.log(`\n══ ${theme.toUpperCase()} — TÜM METİN/ZEMİN ÇİFTLERİ (${rows.length} benzersiz çift, ${Object.keys(SCREENS).length} ekran)\n`);
const show = list => {
  console.log("   ekran        boyut/ağırlık  kova    ölçüm            örnek metin");
  for (const r of list) {
    console.log(`   ${r.screen.padEnd(12)} ${`${r.size}px/${r.weight}`.padEnd(14)} ` +
      `${String(target(r.bucket)).padEnd(7)} ${fmt(r.ratio, r.bucket).padEnd(16)} ${r.text}`);
  }
};
console.log(`── ZEMİN DOM'DAN (${dom.length}) — opak ata bulundu\n`);
show(dom);
if (px.length) {
  console.log(`\n── ZEMİN EKRANDAN (${px.length}) — gradyan / yarı saydam ara katman var,`);
  console.log(`   öğe kutusuna ızgara atılıp EN SIK görülen renk alındı\n`);
  show(px);
}
console.log(`\n── ÖZET`);
console.log(`   benzersiz çift : ${rows.length}  (zemin DOM'dan ${dom.length} + ekrandan ${px.length})`);
// Kapsam sınırını AÇIKÇA söyle — sessiz kırpma "her şey ölçüldü" gibi okunur.
console.log(`   ölçülmeyen     : ${offscreen} katlamanın altında/dışında, ${covered} overlay'in ardında`);
console.log(`                    (overlay'in ardındakiler zaten kendi ekranlarında ölçülüyor;`);
console.log(`                     katlama altı için o ekrana kaydırma adımı eklenmeli)`);
console.log(`   AA'yı geçen    : ${rows.length - fails.length}/${rows.length}`);
if (fails.length) {
  console.log(`   ✗ KALAN ${fails.length}:`);
  for (const r of fails) console.log(`      ${r.screen} · ${r.size}px/${r.weight} · ${fmt(r.ratio, r.bucket)} · ${r.text}`);
} else console.log(`   ✓ ÇİFTLERİN TAMAMI AA`);
