# Tema regresyon düzeneği

Açık mod çalışmasının doğrulama araçları. **Tek kullanımlık değil** — Faz 5'te
widget'ları, sonraki her sürümde temayı bunlarla doğrulayacağız.

İki işi var:

1. **Koyu modu korumak.** Uygulama App Store'da canlı; koyu modun görünümü
   değişmemeli. `diff-all.mjs` bunu piksel piksel ölçer — sonuç **0 olmalı**.
2. **Açık modu ölçmek.** "Güzel duruyor" yeterli değil: göz kararı bu projede
   iki gerçek AA ihlalini kaçırdı (seçili kaygı butonu 2.30:1, durum etiketi
   2.89:1). `contrast-*.mjs` betikleri **gerçek render edilmiş pikselden** ölçer.

Kararların gerekçesi ve ölçüm tabloları: [`docs/LIGHT-MODE.md`](../../docs/LIGHT-MODE.md).

---

## Kurulum

Bu klasörün bağımlılıkları **uygulamanınkilerden ayrıdır** — kök `package.json`
değişmedi, `dist/`e hiçbir şey girmiyor.

```bash
cd tools/theme-check
npm install
npx playwright install webkit    # ~1 GB, bir kez
```

**Neden WebKit:** uygulama iOS'ta WKWebView'de çalışıyor. Chromium'da geçen bir
şey WebKit'te geçmeyebilir (`color-mix` paritesi burada doğrulandı).

Betikler `http://localhost:4173` adresini bekler. Ayrı bir terminalde:

```bash
cd ~/Exam-Bro && npm run build && npx vite preview --port 4173 --strictPort
```

Farklı bir adres için: `THEME_CHECK_URL=http://localhost:5173 node …`

---

## Koyu mod piksel farkı — asıl güvenlik ağı

Değişikliğinizin koyu modu bozup bozmadığını söyler.

```bash
# 1) REFERANS — değişiklikleri kaldır, önceki hali derle, çek
cd ~/Exam-Bro && git stash -q && npm run build
cd tools/theme-check && node shoot-all.mjs dark base

# 2) YENİ — değişiklikleri geri al, derle, tekrar çek
cd ~/Exam-Bro && git stash pop -q && npm run build
cd tools/theme-check && node shoot-all.mjs dark new

# 3) KARŞILAŞTIR — her ekran 0 piksel olmalı
node diff-all.mjs base new
```

`git stash` yerine `git worktree` ya da bir önceki commit'i checkout etmek de
olur; önemli olan **aynı ekranların iki farklı kodla** çekilmesi.

Fark çıkarsa `shots/diff-<ekran>.png` yazılır — kırmızı pikseller nerede
değiştiğini gösterir. **Diff görüntüsüne bakmadan "regresyon var" demeyin**
(aşağıdaki saat tuzağı tam da böyle yakalandı).

`shoot-all.mjs` 14 ekran çeker: `home` · `exams` · `osym` · `manual` · `goals` ·
`anx` · `anx-low` · `report` · `hub` · `psych-cat` · `breath` · `paywall` ·
`confirm` · `toast`. Yeni bir ekran eklerken `SCREENS` sabitine ekleyin — hem
referans hem karşılaştırma tarafı kendiliğinden kapsar.

Overlay ekranları (`paywall`/`confirm`/`toast`) `"viewport"` adımıyla işaretli ve
**tam sayfa değil** çekiliyor: `position:fixed` oldukları için fullPage çekimde
arkalarındaki kaydırılabilir sayfanın boyu belirleyici oluyor ve gürültü üretiyor.

### ⚠️ `pg.clock.setFixedTime` ŞART

`lib/page.mjs` sayfayı açmadan önce saati donduruyor:

```js
await page.clock.setFixedTime(new Date("2026-07-28T09:00:00Z"));
```

Yoksa **geri sayımın saniye hanesi sahte fark üretir.** İlk denemede ana sayfada
1488 piksel (%0.08) fark çıktı ve gerçek bir regresyon sanıldı; diff görüntüsüne
bakınca farkın yalnızca DK/SN hanelerinde olduğu görüldü. Saat dondurulunca 0'a indi.

Tarih `src/config/examDates.js`'teki sınavlara göre seçildi (geri sayımlar makul
değerler göstersin diye). **Değiştirirseniz referans görüntülerin tamamını
yeniden üretin** — yoksa her ekran farklı çıkar.

---

## Referans görüntüler nerede?

`shots/` altında ve **commit edilmiyorlar** (`.gitignore`). Her biri ~1–3 MB,
ekran başına iki kopya, her sürümde yenileniyor — repoyu şişirir ve diff'i
okunamaz hale getirir.

**Yeniden üretmek:** yukarıdaki üç adımlık akış, birkaç dakika. Referans daima
"karşılaştırmak istediğiniz taban commit" ile üretilir; saklamaya değmez.

---

## Betikler

### Ekran görüntüsü

| Betik | Ne yapar |
|---|---|
| `capture.mjs` | Tek ekran. `node capture.mjs <dark\|light> <çıktı.png> [adım…]` |
| `shoot-all.mjs` | Standart 14 ekranı bir önekle çeker (liste `lib/screens.mjs`'te) |
| `capture-states.mjs` | Etkileşimli durumlar: dolu form, seçili çip, "Eklendi" rozeti |
| `capture-boot.mjs` | Açılış: ilk boyama (FOUC penceresi) + Onboard, iki modda |

`capture.mjs` adım dili: `tab:Rapor` · `btn:Metin` · `radio:8` · `wait:500` ·
`full` (tam sayfa).

```bash
node capture.mjs light shots/x.png tab:Sınavlar "btn:ÖSYM Takvimi" full
```

### Karşılaştırma

| Betik | Ne yapar |
|---|---|
| `diff-all.mjs` | `shoot-all` setlerini karşılaştırır. Fark varsa çıkış kodu 1 |
| `diff.mjs` | Elle çift listesi: `node diff.mjs '[["a.png","b.png","etiket"]]'` |

### Kontrast ölçümü

Hepsi `<dark\|light>` argümanı alır ve iki modu **karşılaştırmak** için var —
açık modun hedefi koyu moda eşit ya da ondan iyi olmak.

| Betik | Neyi ölçer |
|---|---|
| `contrast-anxiety.mjs` | Kaygı skalası: seçili buton + durum etiketi (metin, 4.5:1) |
| `contrast-heatmap.mjs` | Isı haritası rampası: komşu adımlar, en soluk kare, lejant ↔ harita |
| `contrast-report.mjs` | Rapor: iki çubuk grafik (1.4.11), 12 metnin kova ayrımı, toggle |
| `contrast-psychology.mjs` | Psikoloji: gradyan zeminli metinler, nefes çemberi |
| `contrast-chevrons.mjs` | Chevron ikonları — anlam taşıyan grafik, 3:1 |
| `contrast-overlays.mjs` | Paywall, onay sheet'i, toast: metinler, gradyan CTA, ikon çipi ve yüzey ↔ perde sınırı |
| `contrast-sweep.mjs` | **Hepsi**: 14 ekranın her metin düğümünü gezer, renk+zemin+kova ile tekilleştirir. "Tüm çiftler AA mı" sorusunun cevabı bu |

### Davranış

| Betik | Ne doğrular |
|---|---|
| `theme-transition.mjs` | `theme-anim` geçici sınıfı: mod değişiminde açılıyor, 200ms sonra kapanıyor, muaf öğelere dokunmuyor, `prefers-reduced-motion`'da hiç eklenmiyor, **BreathingPlayer çalışırken nefes döngüsü kesilmiyor**, **paywall (e) ve onay sheet'i (f) açıkken mod değişimi** |

#### Faz 4 / Faz 6 arayüzü

| Betik | Ne doğrular |
|---|---|
| `appearance.mjs` | "Görünüm" seçicisi: yeni metinlerin kontrastı + radiogroup klavye deseni (ok/Home/End, roving tabindex), anında uygulama, "Sistem"de cihazı izleme |
| `widget-select.mjs` | Widget sınav seçimi: yıldız/rozet kontrastı, varsayılan (en yakın tarih), en fazla 2 (3. reddediliyor + toast), sıra korunması, yeniden yüklemede kalıcılık |
| `capture-boot.mjs` | Açılış: ilk boyamada `data-theme` + `theme-color` doğru mu, Onboard metinleri AA mı |

> ⚠️ `widget-select.mjs` yıldızları **erişilebilir adlarından** buluyor,
> `button[aria-pressed]` ile DEĞİL: FIXED kartlarının görünürlük butonu da
> `aria-pressed` taşıyor ve seçici onları da yakalıyordu (ölçüm yanlış öğeden
> okunuyor, tıklama yanlış butona gidiyordu).


### `solvers/` — değerlerin nereden geldiği

Bunlar testler değil, **arama betikleri**. Paletteki sayılar göz kararı değil;
kısıtlar altında çözüldüler. Bir değeri değiştirmeden önce ilgili çözücüyü
çalıştırın — çoğu kısıt görünmez.

| Betik | Ne çözer |
|---|---|
| `heatmap-ramp.mjs` | Isı haritasının açık mod kanalları + alfa rampası (bant bant çözüp birleştirir) |
| `heatmap-ramp-frontier.mjs` | Yalnız alfayı değiştirmenin ödünleşim sınırı — neden yetmediğini gösterir |
| `heatmap-channels-only.mjs` | Yalnız kanalı değiştirmenin sonucu: **0 aday** |
| `report-bars.mjs` | Rapor çubuğu: dolgu / kenarlık / ikisi birden |
| `track.mjs` | `--track`'in tek başına iki kısıtı tutturamadığının kanıtı |

> `heatmap-ramp-frontier.mjs` ve `heatmap-channels-only.mjs` **bilerek duruyor.**
> İkisi de "bu yol çıkmaz" diyor. Biri gelip "rampayı basitleştirelim" derse
> cevap bu iki betikte.

---

## Ölçüm yaparken iki tuzak

İkisine de düşüldü, ikisi de sahte sonuç üretti.

**1 · Metinde piksel örneklemesi harfin üstüne düşer** → sahte `1.00:1`.
Metinlerde zemini **DOM'dan** çözün: `lib/page.mjs` → `colorOn()` ilk **opak**
atanın `background-color`'ını bulur. Piksel okumayı yalnızca gerçekten yarı
saydam katmanlar için kullanın (çubuk, ısı haritası karesi, toggle, gradyan).

**2 · "İlk bulunan" öğe en zayıf öğe değildir.** Rapor grafiğinde ilk çubuk
ölçülünce 4.58 çıktı; **en zayıf** çubuk seçilince 2.69 — eşiğin altında. Bir
dizi öğeyi ölçerken her zaman en kötü örneği arayın.

Ayrıca: kontrastı **8-bit'e yuvarlanmış** renkten ölçün. Float üzerinden ölçüp
sonra yuvarlamak oranı eşiğin bir tık altına düşürebiliyor (`lib/wcag.mjs` →
`over()` bunun için yuvarlıyor).

---

## `npm test` ile ilişkisi

Farklı şeyler, ikisi de gerekli:

- **`npm test`** (kökte, `src/ink.test.mjs`) — `ink()` sözleşmesi ve
  `src/ink.js` sabitlerinin `index.css` ile uyumu. Tarayıcı gerektirmez, hızlı.
- **Bu klasör** — gerçek render. Tarayıcı gerektirir, yavaş, elle çalıştırılır.

---

## Widget paleti üreteci (Faz 5)

```bash
node gen-widget-theme.mjs           # ios/App/ExamBroWidget/WidgetTheme.swift üret
node gen-widget-theme.mjs --check   # üretilmiş dosya güncel mi (çıkış 1 = bayat)
```

Swift tarafına palet **elle yazılmıyor**: `src/index.css` tek kaynak, betik onu
14 token × 2 tema olarak Swift'e çeviriyor. `--check`, `npm test`'in `ink()`
sabitleri için yaptığının aynısı — palet değişip Swift güncellenmezse yakalar.

Düz hex olmayan bir token istenirse (örn. `rgba(...)`) betik **hata verip durur**;
sessizce yanlış renk üretmez. `--track-line` koyu modda `transparent` →
`Color.clear`.
