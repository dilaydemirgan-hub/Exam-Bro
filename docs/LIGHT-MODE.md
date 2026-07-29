# Açık Mod + Ana Ekran Widget'ları — Devir Teslim Dokümanı

> **Bu dosya bağlam sigortasıdır.** Yeni bir oturum bunu okuyup kaldığı yerden devam
> edebilmeli. Her grup commit'inden sonra **güncelle**.
>
> Okuma sırası: §1 durum → §2 kırmızı çizgiler → §7 kalan iş → gerekirse detay bölümleri.

**Branch:** `feature/light-mode-widgets` — ana dal `master` **değil**, **`main`**.
**Proje:** `~/Exam-Bro` — Capacitor 8, React 19, Vite. Bundle id `com.exambroapp.sinav`.
**Uyarı:** App Store'daki canlı sürüm 1.3.0 / build 7. **Koyu mod referans, dokunulmaz.**
**Bu dal:** 1.4.0 / build 8 (açık mod + widget'lar — minor bump, kullanıcı kararı).

---

## 1. Durum

| Faz | Konu | Durum |
|---|---|---|
| 0 | Keşif | ✅ |
| 1 | Tema altyapısı (token'lar, `data-theme`, `useTheme`) | ✅ `567de95` |
| — | `fix:` kaygı etiketi zemini | ✅ `7687f47` |
| 2 | Açık mod paleti | ✅ `42f84dc` |
| 3 | Eksiksiz uygulama | ✅ 7 grup + kapanış maddeleri |
| 4 | Rapor sekmesine "Görünüm" seçici | ✅ |
| 5 | iOS widget'ları | ✅ üç boyut yazıldı, köprü uçtan uca doğrulandı |
| 6 | Uygulama içinden widget sınavı seçme | 🔄 arayüz ✅, köprü Faz 5'te |
| 7 | Doğrulama | ✅ (bir madde kısmi — §14) |

Commit geçmişi (yeniden eskiye): `e11eb17` faz3-7 · `76eeb30` docs(§6 düzeltme) ·
`f1d3858` chore(eslint) · `919cf30` docs · `542d907` chore(düzenek) · `a04d6e7` docs ·
`c78a02c` faz3-6 · `15588be` docs · `97bcef8` fix(grafik+W) ·
`4d200f5` faz3-5 · `759a1df` fix(ısı haritası) ·
`fe368f2` docs · `2a671ad` faz3-4 · `ca15afb` fix(tema) ·
`0ec94bd` docs · `acdd868` faz3-3 · `edd7ec8` chore · `da1470f` docs ·
`b6ad7b0` docs · `1529c3d` faz3-2 · `ce774a5` faz3-1 · `4536ddb` docs · `42f84dc` faz2 ·
`7687f47` fix · `567de95` faz1 · `dc65b68` status-bar · `7379d41` (main'in ucu, dokunulmadı).

---

## 2. Kırmızı çizgiler

- **Koyu modun görünümü değişmeyecek.** Tek istisna `7687f47` (ayrı commit, geri alınabilir).
- **Varsayılan koyu kalacak** — `localStorage` kaydı yoksa `dark`.
- `src/config/examDates.js` **verisine dokunma**.
- `src/App.jsx` içindeki `DEV_PREMIUM` ve RevenueCat key'lerine **dokunma**.
- Sürüm/build numarasını **sormadan artırma**.
- Bağımlılık eklemeden önce **sor**. (Eklenen tek şey: `@capacitor/status-bar`, onaylı.)
- Her fazın sonunda **dur, onay al**. Fazları birleştirme.
- Faz 3'ü tek commit yapma — §7'deki gruplara böl, her grup ayrı commit + koyu/açık görüntü.

---

## 3. Tema mekanizması

- **Depolama:** `localStorage`, anahtar `exambro_theme`, değerler `dark` | `light` | `system`.
  Capacitor Preferences **değil** — FOUC engelleyici inline script senkron olmak zorunda,
  Preferences asenkron. Diğer tüm uygulama verisi eskisi gibi Preferences'ta (`App.jsx` → `store`).
- **FOUC:** `index.html` içindeki inline `<script>` React mount olmadan `data-theme` yazar
  ve `theme-color` meta'sını hemen ayarlar. `src/theme.jsx` ile **aynı** mantığı taşır;
  ikisi ayrışırsa açılışta renk flaşı olur. İnline script'teki `#f2f2f6` / `#080810`
  değerleri `index.css`'teki `--bg` ile aynı olmak zorunda (bilinçli tekrar — CSS henüz
  yüklenmemiş olabilir).
- **React:** `src/theme.jsx` → `ThemeProvider` / `useTheme()`.
  `useTheme()` → `{ theme, preference, setPreference }`.
  `theme` çözülmüş değer (`dark`|`light`), `preference` kullanıcı seçimi (`system` olabilir).
- `system` seçiliyken `prefers-color-scheme` dinlenir, anında değişir.
- 7 senaryoluk çözümleme testi yazılmıştı (inline script ↔ hook paritesi); scratchpad'deydi,
  kalıcı değil. Gerekirse yeniden yazılır.

---

## 4. Token sistemi — `src/index.css`

```
:root, :root[data-theme="dark"] { … }   /* koyu = varsayılan */
:root[data-theme="light"]       { … }   /* SONRA gelir, (0,2,0) */
```

### ⚠️ Specificity — bozmayın
Koyu blok iki seçiciye açılır: `:root` (0,1,0) ve `:root[data-theme="dark"]` (0,2,0).
Açık blok **`:root[data-theme="light"]`** yazılmalı (0,2,0) ve koyu bloğun **altında**
durmalı. Sadece `[data-theme="light"]` yazılırsa (0,1,0) olur, bare `:root` ile eşitlenir
ve yalnızca kaynak sırasına bel bağlanır — kırılgan. Dosyada da ⚠️ yorumu var.

### Sayılar
~104 koyu token / ~93 açık override. Devralınan 11: token referanslı 5 gradyan
(`--grad-brand`, `--grad-brand-135`, `--grad-green`, `--grad-green-bar`, `--grad-gold`
— accent'lerle kendiliğinden koyulaşıyor) + 4 radius + 2 font.

### `color-scheme`
Token bloğunun içinde, tema ile birlikte değişir. **Native date/time picker ve
scrollbar buna bağlı** — ayrı bir yere taşımayın. `ExamsTab` manuel ekleme ekranındaki
`<input type="date">` / `type="time"` üzerindeki inline `colorScheme:"dark"` bu yüzden
kaldırıldı (özellik kalıtsal).

### Palet özeti (tam liste `index.css`'te)

| Token | Koyu | Açık |
|---|---|---|
| `--bg` | `#080810` | `#f2f2f6` |
| `--surface-1` | `#101018` | `#f8f8fb` |
| `--surface-2` | `#14141f` | `#ffffff` |
| `--border` | `#23233a` | `#d5d5e0` |
| `--text-1` | `#f2f2f8` | `#17171f` |
| `--text-4` | `#62627e` | `#67677d` |
| `--violet` | `#9d5cff` | `#7c3aed` |
| `--pink` | `#ff4d94` | `#db2777` |
| `--green` | `#10d99e` | `#0d805b` |
| `--gold` | `#ffbe0b` | `#9c5f08` |
| `--orange` | `#ff9736` | `#a8560e` |
| `--blue` | `#5c9bff` | `#2563eb` |
| `--amber` | `#ffb703` | `#976801` |
| `--on-green` / `--on-gold` | `#04120c` / `#1a1200` | `#fff` / `#fff` |
| `--overlay-sheet` / `--overlay-modal` | `rgba(0,0,0,.7)` / `.72` | `rgba(0,0,0,.45)` |
| `--shadow-card` | `none` | `0 1px 2px …05, 0 4px 12px …07` |

Açık moddaki `green` / `amber` / `gold` / `orange` / `breath-text-2` **sayısal olarak
çözüldü** — AA'yı geçen en açık ton seçildi (markadan en az sapma). İlk adaylar
`#0d9668` / `#9a6a00` / `#a16207` / `#c2620c` / `#2f7a63` idi, hepsi eşiğin altında kaldı.

**Seri rozeti — özel durum.** `--orange-soft` açık modda türetilmiş tint **değil**, sabit
krem `#fdf1e5`. Sebep: zemini accent'e yaklaştırdıkça üstündeki accent metnin kontrastı
*düşüyor*; %12'de 4.01, %4'te bile 4.47 — hiçbir tint yüzdesi 4.5'i geçmiyor.

**Kaygı ısı haritası.** Alfa rampası (0.48–0.90) koyu modda dokunulmaz olduğu için açık
moda uyum ancak `--anx-*-rgb` kanallarını koyultarak sağlandı. En zayıf kare (v=1,
alfa 0.50) açık modda `#80baab` civarı — kaybolmuyor.

**Kaygı skalasının METİN taşıyan yüzeyleri — `anxFill()` / `anxPillStyle()`.**
Isı haritasında işe yarayan alfa rampası, üstünde **metin** olan iki yerde açık modda
çöküyordu (grup 4'te gerçek render edilmiş piksellerden ölçüldü):

| Yer | Açık mod (önce) | Koyu mod |
|---|---|---|
| Seçili skala butonu | `#ffffff` / `#e593b0` = **2.30:1** ✗ | `#ffffff` / `#842f57` = 8.32:1 ✓ |
| Durum etiketi ("yoğun") | `#c81e5a` / `#eaa9c0` = **2.89:1** ✗ | `#ff4d94` / `#431f37` = 4.52:1 ✓ |

**Yıkamayı zayıflatmak çözüm değil** — `--anx-low` (`#0d805b`) için *hiçbir* yüzde 4.5'i
geçmiyor (%12'de 4.57 ama low bandı %8'de bile kalıyor). Seri rozetiyle (`--orange-soft`)
birebir aynı olgu: zemini accent'e yaklaştırdıkça accent metnin kontrastı düşüyor.

Çözüm: **açık modda bant rengi tam opak zemin**, üstüne `--on-accent`.

| Bant | Açık zemin | Beyaz metinle |
|---|---|---|
| low | `#0d805b` | 4.93:1 |
| mid | `#9c5f08` | 5.18:1 |
| high | `#c81e5a` | 5.54:1 |

Karar tek yerde: `anxFill(v, theme)` (seçili buton) ve `anxPillStyle(v, theme)` (durum
etiketi), ikisi de `src/App.jsx`'te `anxSolid`'in hemen altında. Koyu mod her ikisinde de
eski `anxColor()`/`tint()` yolunu kullanmaya devam ediyor.

**Isı haritası rampası — `anxColor(v, theme)` (`759a1df`).**
Isı haritası önce ölçülmeden "okunuyor" sayılmıştı; ölçülünce açık modun koyu modun çok
altında olduğu görüldü. Ölçüm ekran görüntüsündeki gerçek pikselden (§9):

| | koyu | açık (önce) | açık (sonra) |
|---|---|---|---|
| bant içi min | 1.296 | 1.225 | **1.279** |
| bant sınırı min | 2.752 | 1.570 | **2.840** |
| en soluk kare ↔ sayfa | 3.34 | 1.99 | **3.31** (1.4.11 ≥3) |
| en soluk kare ↔ "kayıt yok" | 2.86 | 1.79 | **2.98** |

**Kök sebep:** kontrast bir **oran**; açık zeminin üstünde aynı alfa adımları çok daha
küçük oranlar üretir. Sayfa zemini (L=.874) ile `--anx-low` (L=.163) arasında yalnızca
**4.35:1** dağıtılabiliyor, koyu modda (L=.006 ↔ L=.50) **9.8:1**.

İki şey **birlikte** çözüldü — ayrı ayrı yetmiyor, ikisi de arandı:
1. `--anx-*-rgb` açık modda koyulaştırıldı (`7,74,52` / `94,57,5` / `145,22,65`).
   Bu token `--anx-*`'tan **ayrıdır**: `--anx-*` metin taşıdığı için "AA'yı geçen en açık
   ton", `--anx-*-rgb` ise yalnızca `anxColor()`'da (ısı haritası + rapor kaygı grafiği),
   orada metin yok — gereken **aralık**.
2. `anxColor()`'ın açık mod alfa dalı: low/mid `0.60→1.00`, high `0.58→0.98`.

> Yalnız alfayı değiştirmek → mevcut kanallarla 0 aday
> (`solvers/heatmap-ramp-frontier.mjs`). Yalnız kanalı koyulaştırmak → rampa sabitken
> 0 aday (`solvers/heatmap-channels-only.mjs`). **İkisi tek bir çözümdür, ayrı ayrı
> değiştirmeyin.** Çözümü üreten: `solvers/heatmap-ramp.mjs`.

⚠️ **Koyu modda v=7 karesi sayfa zemininden 2.20:1** — 1.4.11'in altında. Koyu mod referans
olduğu için dokunulmadı; açık mod aynı yerde 3.17 ile geçiyor.

### Rapor grafikleri (grup 5'te ölçüldü)

| | koyu | açık |
|---|---|---|
| grafik 1 en zayıf çubuk ↔ kart | 7.46 ✓ | 5.12 ✓ |
| grafik 1 çubuk ↔ pasif kütük | 6.32 ✓ | 3.97 ✓ |
| grafik 2 en zayıf çubuk ↔ kart | **2.89 ✗** | 3.46 → **4.49 ✓** |
| grafik 2 çubuk ↔ pasif kütük | 2.45 ✗ | 2.69 ✗ → **3.49 ✓** |
| `ProgressBar` dolgu ↔ iz | 8.29 ✓ | 3.87 ✓ |
| pasif kütük ↔ kart (**kenarlıkla**) | 1.18 ✗ | 1.29 ✗ → **3.87 ✓** |
| `ProgressBar` iz ↔ kart (**outline ile**) | 1.18 ✗ | 1.29 ✗ → **4.20 ✓** |

**Açık modda hepsi geçiyor.** Koyu moddaki iki eksik (grafik 2'nin 2.89 / 2.45'i) mevcut
borç olarak duruyor — koyu mod referans, dokunulmadı.

> ⚠️ İlk denemede "hiçbir `--track` değeri iki kısıtı birlikte tutturmuyor, 0 aday"
> denmişti. **O arama eksikti:** yalnızca kütüğün rengi değişken sayılmıştı. Açık mod
> yeni, orada korunacak referans yok — **dolgu rengi ve kenarlık da değişkendi.**
> Üçü birden arandı (`tools/theme-check/solvers/report-bars.mjs`) ve çözüm çıktı.

**(a) Dolgu — `anxBarColor(v, theme)`.** Rapor çubuğu açık modda ısı haritasından **ayrı**
bir rampa kullanır (taban 0.70). İki sebep: çubuk **kartın** (`#ffffff`) üstünde, ısı
haritası **sayfa zemininin** (`#f2f2f6`) üstünde; ve çubukta **yükseklik zaten değeri
kodluyor**, yani renkteki rampa orada fazladan bilgi — ısı haritasında yükseklik yok.
Isı haritasının tabanı yükseltilemezdi: orada bant sınırı düşüyor (§4).

**(b) Kenarlık — `--track-line`.** "Kayıt yok" kütüğüne `1px border`, `ProgressBar`'a
`outline`. 1.4.11'in standart çözümü: dolgu farkı taşıyamıyorsa **sınır** taşır.

> **Koyu modda `--track-line: transparent`.** Saydam kenarlık arkasındaki background'ı
> gösterdiği için (`background-clip` varsayılanı `border-box`) kütük **birebir aynı**
> render ediliyor → koyu mod piksel farkı 0.
>
> **`ProgressBar`'da `border` DEĞİL `outline`:** `border`, `height:100%` olan dolgu
> çocuğunu 2px kısaltır ve koyu modu değiştirirdi. `outline` yerleşimi hiç etkilemez.

> **Faz 3 SONRASI, ayrı `fix:` commit'i — renkle ilgisi yok:** grafik 2'de çubuk yüksekliği
> `v*5.5px`, "kayıt yok" kütüğü ise sabit `8px`. Yani **v=1 olan bir gün, hiç kayıt olmayan
> günden daha KISA** görünüyor. Her iki modda da böyle. Düzeltmek **koyu modun render'ını
> da değiştirecek**, bu yüzden rapor ekranının piksel referansı yeniden alınmalı — Faz 3
> tamamen bittikten sonra yapılacak.

---

## 5. `tint()` — veri renklerinin yüzey üstü tonu

Sınav (`FIXED`/`OSYM`/`customs`) ve `PSYCH_COLORS` renkleri **veridir**, token değildir,
iki modda da aynıdır. Soluk tonları `tint()` üretir (`src/App.jsx`):

```js
tint(color, token, fallbackAlpha, fallbackColor)
// color-mix destekliyse: color-mix(in srgb, ${color} var(${token}), transparent)
// desteklemiyorsa (iOS 15–16.1): `${color}${fallbackAlpha}`, ya da
//   color bir var() ise fallbackColor (hex eki var()'a eklenemez)
```

`color-mix(… , transparent)` premultiplied karıştığı için sonuç *alfası X olan renk* ile
**birebir** aynıdır. **Gerçek WebKit 26.5'te doğrulandı**: 6 renk/alfa çifti hem eski
`#RRGGBBaa` hem `color-mix` ile render edildi, PNG'ler byte-byte aynı çıktı.

| Token | Koyu | Açık | Eski hex eki | Ne yapar |
|---|---|---|---|---|
| `--tint-weak` | 7.059% | **14%** | `12` | kart yıkaması (gradyan başı) |
| `--tint-soft` | 7.843% | **15%** | `14` | sayaç rakam kutusu zemini |
| `--tint-line` | 13.333% | **30%** | `22` | rakam kutusu kenarlığı |
| `--tint-edge` | 18.824% | **38%** | `30` | sınav/kategori kartı kenarlığı |
| `--tint-edge-2` | 20% | **38%** | `33` | psikoloji kartı kenarlığı |

Koyu yüzdeler eski hex-alfa eklerinin **birebir** karşılığıdır (0x14/255 = %7.843).
Açık yüzdeler tek tek dengelendi — **sabit çarpan yok** (1.90×–2.25× arası).

---

## 6. `ink()` sözleşmesi — `src/ink.js`

Koyu zemin için seçilmiş parlak veri renkleri açık zeminde okunmuyor: sekizinin de beyaz
üstündeki kontrastı **1.66–3.88:1** (AA eşiği 4.5). `ink()` bunları **yalnızca açık modda**
ve **yalnızca metin/anlamlı grafik** olarak kullanıldıkları yerde AA'yı geçen **en açık**
tona indirir. **Veri dizilerine dokunulmaz.**

```js
ink(color, theme)            // hedef 4.5:1  — normal metin
ink(color, theme, "large")   // hedef 3:1    — büyük metin ve anlamlı grafik
// theme !== "light" → color aynen döner
// color hex değilse (var(…), undefined) aynen döner
```

Testi: **`npm test`** → `src/ink.test.mjs`.

### M — Referans zemin: **EN KOYU yüzey** (bu kararı geri almayın)

Tek sabit referans kullanılır; böylece **aynı sınav rengi her ekranda aynı tonda** görünür.
Referans, rengin karşılaşabileceği **en KOYU** zemindir.

**Neden en açık değil:** koyu metin için **daha açık zemin daha kolaydır**. En açık yüzeye
(beyaz karta) göre çözülen ton, sayfa zemininde ve tint yıkamasında eşiğin altına düşer.
Ölçüldü:

| Referans | Sonuç |
|---|---|
| En açık yüzey (`#ffffff`) | **8/8 renk sayfa zemininde AA'dan KALIYOR** (4.03–4.08) |
| En koyu yüzey | 0/8 kalıyor, beyazda da geçiyor (5.04–5.10) |

**Gerçek en koyu zemin, düz sayfa zemini değil, rengin kendi `--tint-weak` yıkamasının
sayfa zemini üstündeki halidir** — `ExamsTab` kartlarında metin tam da onun üstünde
duruyor ve o zemin `--bg`'den koyu. `src/ink.js` bunu `blend(src, INK_WASH, INK_PAGE)`
ile hesaplıyor.

Sabitler (`src/ink.js`) `index.css`'teki `[data-theme="light"]` değerleriyle aynı olmak
zorunda; **`npm test` bu drift'i yakalıyor**:

| Sabit | Değer | Karşılığı |
|---|---|---|
| `INK_PAGE` | `#f2f2f6` | `--bg` |
| `INK_WASH` | `14` | `--tint-weak` |
| `INK_BASE` | `#10101c` | koyulaştırma mürekkebi (token değil) |

### ⚠️ Kontrast yuvarlanmış hex üzerinden ölçülür
Karışım sonucu **8-bit'e yuvarlandıktan sonra** ölçülmeli. Float üzerinden ölçüp sonra
yuvarlamak eşiğin bir tık altına düşürüyor: `#ff9736` normal kovada **4.48:1** veriyordu
(hedef 4.5). `src/ink.js` içinde `h2r(r2h(blend(...)))` bunun için var — sadeleştirmeyin.

### N/O — Kullanım yerlerinin kovaları

**Kova 1 — `ink(c, theme)` · normal metin · 4.5:1**

| Yer | Satır | Boyut | Neden |
|---|---|---|---|
| `CountCard` "Sınav günü! Başarılar 🍀" | ~866 | 18px/700 | **18 < 18.66 → large DEĞİL** | ✅ |
| `ExamsTab` ÖSYM sınav adı | ~1272 | 15px/600 | ✅ |
| `ExamsTab` ÖSYM "{n}g kaldı" | ~1278 | 12px | ✅ |
| `ExamsTab` FIXED liste sınav adı | ~1340 | 16px/600 | ✅ |
| `ExamsTab` FIXED "bugün! 🍀" | ~1344 | 13px/700 | ✅ |
| `ExamsTab` FIXED "{n}g" | ~1345 | 14px | ✅ |
| `ExamsTab` customs sınav adı | ~1362 | 15px/600 | ✅ (`c \|\| var(--text-1)`) |
| `ExamsTab` customs "{n}g" / "✓" | ~1367 | 14px | ✅ (`c \|\| var(--gold)`) |

> `ExamsTab`'de toplam **7** ink() noktası var. (Önceki bir özette 8 denmişti, bir satır
> çift sayılmıştı.) Üç `map` bloğunun her birinde bir kez `const c = ink(ex.c, theme)`
> hesaplanıp paylaşılıyor. Son ikisinde `ex.c` hiç olmayabilir — `ink()` hex olmayanı
> (ve `undefined`'ı) aynen döndürdüğü için `c || var(…)` yedeği bozulmadan çalışıyor.

**Kova 2 — `ink(c, theme, "large")` · büyük metin + anlamlı grafik · 3:1**

| Yer | Satır | Boyut | Neden |
|---|---|---|---|
| `CountCard` sınav başlığı | ~849 | 20px/700 | ≥18.66 bold | ✅ |
| `CountCard` geri sayım rakamları | ~875 | 22px/700 | ≥18.66 bold | ✅ |
| `CountCard` sol kenar şeridi | ~843 | 3px | anlamlı grafik (sınav kimliği) | ✅ |
| `PsychologyHub` kategori/öğe chevron ikonu | ~1024/994 | 18px | anlamlı grafik (gezinme) | ✅ |

`large` markayı gerçekten koruyor: TYT `#9d5cff` → `#9c5bfd` (%99). Normal kovada olsaydı
`#7848c4` (%74) olacaktı.

**Kova 3 — `ink()` YOK · metin değil · olduğu gibi kalır**

| Yer | Neden |
|---|---|
| `CountCard` rakam kutusu zemini `tint(c,soft)` | zemin |
| `CountCard` rakam kutusu kenarlığı `tint(c,line)` | dekoratif, metin rengiyle yedekli |
| `ExamsTab` kart yıkaması `tint(c,weak)` + kenarlığı `tint(c,edge)` (satır 1328) | zemin/dekoratif |
| `PsychologyHub` kart gradyanı + kenarlığı | zemin/dekoratif |
| İlerleme çubuğu dolgusu, ısı haritası kareleri, lejant kareleri | token kullanıyor, veri rengi değil |

### Hesaplanmış değerler (referans; kod runtime'da üretir)

| Veri rengi | Kullanım | `ink()` 4.5:1 | `ink(…,"large")` 3:1 |
|---|---|---|---|
| `#10d99e` | LGS, KPSS×4, nefes kat. | `#10775e` | `#109773` |
| `#9d5cff` | TYT, kaygı kat. | `#7848c4` | `#9c5bfd` |
| `#ff4d94` | AYT, sınav günü kat. | `#ae386b` | `#e04584` |
| `#ff9736` | ALES×3 | `#935a2a` | `#be732f` |
| `#5c9bff` | DGS, mükemmeliyetçilik | `#3f66a9` | `#4f83d8` |
| `#b07aff` | MEB-AGS | `#7754ae` | `#996bde` |
| `#ffbe0b` | kullanıcı sınavları | `#856514` | `#ab8111` |
| `#ffb703` | erteleme kat. | `#89640f` | `#ae7e0c` |

> ⚠️ **Bu tablonun 4 hücresi bir kez yanlış yazılmıştı (düzeltildi).** Tablo elle
> yazılmış, `ink()`'in çıktısından üretilmemişti; `#ff9736` normal · `#5c9bff` large ·
> `#ffbe0b` large · `#ffb703` normal hücreleri koddan farklıydı. Üçü zararsızdı (farklı
> ama yine eşiği geçen ton), ama **`#ff9736` normal için yazılan `#955b2a` en koyu
> zeminde 4.491:1** — yani dokümanda **eşiğin altında bir değer GEÇER gibi duruyordu**.
> Kod her zaman doğruydu (`#935a2a`, 4.577:1); `src/ink.js` tek commit'lik (`1529c3d`) ve
> hiç değişmedi. Yanlış hücreler §6'daki yuvarlama düzeltmesinden **önceki** ara
> değerlerdi (bkz. yukarıdaki "4.48:1" notu — aynı renk).
>
> **`npm test` bunu yakalayamaz** ve yakalaması da beklenmemeli: eşikleri `ink()`'in
> *kendi* çıktısına karşı doğruluyor, bu tabloya karşı değil. Tablo "referans"tır —
> bir değeri kullanmadan önce koddan üretin:
> `node -e 'import("./src/ink.js").then(({ink})=>console.log(ink("#ff9736","light")))'`

---

## 7. Faz 3 — kalan iş

### Biten gruplar

**1 ✅ kök + header + nav — `ce774a5`**
`S.root` / `S.header` / `S.nav` (`App.jsx` ~1668+), `Card` (`ui.jsx`), `::selection`,
`theme-color`, `StatusBar`.

**2 ✅ ana sayfa + geri sayım — `1529c3d`**
`HomeTab` (755–831), `CountCard` (832–894). `ink()` devrede, `src/ink.js` + `npm test`.

**3 ✅ sınavlar — `acdd868`**
`ExamsTab` (1239–1389), üç görünüm de: liste / ÖSYM / manuel. Yukarıdaki **7 ink()
noktası** bağlandı. Manuel ekleme ekranındaki 3 input'a `.themed`.
`<input type="date">` / `type="time"` picker'ı açık modda **doğrulandı** — görünümü
`:root`'taki `color-scheme`'den kalıtıyor, inline `colorScheme` yok (§4).
Ayrıca doğrulanan durumlar: gizli/görünür FIXED kartı, ÖSYM "Eklendi" rozeti,
seçili ders çipi, etkin/devre dışı "Sınav Ekle" butonu.

> **`.themed` neden yalnızca input'lara eklendi:** `ExamsTab`'deki diğer yüzeyler ya
> `Card` (zaten `.themed`), ya da `.pressable` butonlar — bunları artık geçici
> `html.theme-anim .pressable` kuralı kapsıyor (§8 Q), ayrıca `.themed` gerekmiyor.
> FIXED liste kartları ise kendi inline `transition:"all 0.2s"`'i ile zaten geçiş yapıyor.

**4 ✅ hedefler + kaygı — `2a671ad`**
`GoalsTab` / `AnxietyTab`. Kaygı skalasının seçili butonu ve durum etiketi açık modda
AA'nın altındaydı → `anxFill()` / `anxPillStyle()` (§4). `GoalsTab`'de **renk değişikliği
gerekmedi** — checkbox, öneri çipleri, ilerleme kartı, input ve boş durum açık modda zaten
AA. `.themed`: hedef satırları, hedef input'u, "günün notu" kartı.
Isı haritası, lejant ve rapor grafiği dokunulmadı.

**5 ✅ rapor — `4d200f5`**
`ReportTab` / `Stat` / `SettingsRow` / `ToggleSwitch`. **Renk değişikliği gerekmedi** —
12 metnin ve toggle'ın tamamı açık modda geçiyor, çubuk grafikler her satırda koyu moda
eşit ya da ondan iyi (§4 "Rapor grafikleri"). Kod değişikliği yalnızca `.themed`
(Stat kutuları, haftalık özet bloğu). Faz 4'ün "Görünüm" seçicisi **bilerek eklenmedi**.

**6 ✅ psikoloji hub + nefes + program — `c78a02c`**
`PsychologyHub` / `HubBar` / `LessonReader` / `BreathingPlayer` / `BreathCircle` /
`ProgramView`. İki chevron `ink(…, "large")`'a bağlandı — ölçülen değerler §6'daki
hesaplanmış tabloyla birebir tutuyor (`#9c5bfd` / `#109773` / `#ae7e0c`, açık modda
3.22–3.69:1). `--grad-breath` / `--grad-closing` uygulamada doğrulandı (çember sayacı
8.92:1, "sn" 5.28:1). **S senaryosu tekrar test edildi** — `BreathCircle` muafiyeti
çalışıyor, nefes döngüsü mod değişiminde kesilmiyor. `.themed`: "aklında kalsın" kutusu,
`ProgramView` gün kartı ve "bugünkü görev" kutusu.

**7 ✅ paywall + overlay'ler + toast + onay sheet — `e11eb17`**
`Paywall` (`App.jsx` ~1251–1305), `ui.jsx` → `useToast` + `ConfirmSheet`.
**Renk değişikliği gerekmedi** — üçü de zaten tamamen token üstündeydi
(`--surface-modal`/`-sheet`/`-toast`, `--overlay-modal`/`-sheet`, `--handle`,
`--shadow-toast`) ve açık karşılıkları Faz 2'de girilmişti. **`ink()` noktası yok:**
hiçbiri veri rengi kullanmıyor, hepsi token — §6 kova 3.
Kod değişikliği yalnızca `.themed` (perde + kart, perde + sheet, toast); gerekçe
aşağıdaki S senaryosu. Muafiyet gerekmedi — kendi girişleri `animation`
(`sheetUp`/`toastIn`/`fadein`), geçici kuralın verdiği `transition` onları kesmiyor.

Ölçüm (`contrast-overlays.mjs`, 20 satır × 2 mod). **Açık mod her satırda koyu moda
eşit ya da ondan iyi.** Öne çıkanlar:

| Yer | Kova | Koyu | Açık |
|---|---|---|---|
| Paywall başlığı 23px/700 | large 3 | 17.20 ✓ | 17.82 ✓ |
| fayda başlığı / açıklaması | 4.5 | 17.20 / 5.72 ✓ | 17.82 / 7.25 ✓ |
| fayda ikonu çipi (`--violet-soft`) | 3 | 4.40 ✓ | 4.91 ✓ |
| **CTA "Pro'ya Geç"** (gradyan, 5 nokta) | 4.5 | **3.20 ✗** | **4.76 ✓** |
| **"Şimdi değil"** (`--text-4`) | 4.5 | **3.26 ✗** | **5.18 ✓** |
| onay başlığı / gövdesi | 4.5 | 16.68 / 5.55 ✓ | 17.82 / 7.25 ✓ |
| **onay butonu (`--danger`)** | 4.5 | **4.16 ✗** | **5.30 ✓** |
| "Vazgeç" | 4.5 | 5.55 ✓ | 7.25 ✓ |
| toast metni | 4.5 | 14.67 ✓ | 17.82 ✓ |

Koyu moddaki **üç** eksik (CTA, "Şimdi değil", danger butonu) mevcut borç —
koyu mod referans, dokunulmadı. **Açık modda üçü de geçiyor.**

> ⚠️ **Overlay yüzeyi ↔ perde** ilk ölçümde iki modda da 3:1'in altındaydı
> (koyu 1.08/1.11, açık 2.67). Palet kararına dokunduğu için kullanıcıya soruldu;
> açık mod perdesi **%35 → %45** yapıldı → açık **3.68 ✓** (en kötü hal 3.36 ✓).
> Koyu mod 1.36 ile mevcut borç olarak duruyor. Detay ve alfa hesabı §13.

### Kalan gruplar

**Yok — Faz 3'ün 7 grubu da bitti.** Kalanlar aşağıdaki "Faz 3 sonunda ayrıca"
maddeleri.

### Grup sonrası her seferinde
1. `npm run build` + `npm run lint` + `npm test`
2. Koyu mod piksel farkı (§8) → **0 piksel** olmalı
3. Koyu + açık ekran görüntüsü
4. **Bu dosyayı güncelle**, ayrı commit

### Faz 3 sonunda ayrıca
- **S — geçiş senaryoları:** ① Paywall bottom sheet **açıkken** mod değiştir ✅
  ② `BreathingPlayer` **çalışırken** mod değiştir ✅ (§13'te ölçüldü — nefes döngüsü
  kesintisiz devam ediyor). Üçüncüsü olarak onay sheet'i de eklendi ✅.
  Betik: `theme-transition.mjs` blok **(e)** ve **(f)**. Ölçülen:

  | | Paywall (e) | Onay sheet'i (f) |
  |---|---|---|
  | mod değişimi ANINDA açık kalıyor mu | evet ✓ | evet ✓ |
  | kart/sheet zemini | `#0e0e18` → `#ffffff` ✓ | `#12121c` → `#ffffff` ✓ |
  | perde | `rgba(0,0,0,.72)` → `rgba(0,0,0,.35)` ✓ | — |
  | geçici pencerede `transition` | `background-color .18s, color .18s` ✓ | aynı ✓ |
  | sonrasında hâlâ etkileşimli | "Şimdi değil" kapatıyor ✓ | — |
- Kontrol listesini (`~/Downloads/exambro-acik-mod-widget-komutu.md`, Faz 3) madde madde geç.
- `public/manifest.json`'daki `#080810` ✅ **karar verildi: değişmiyor.**

  > **Gerekçe (kullanıcı kararı).** `background_color` ve `theme_color` tek bir
  > statik değer alır — manifest'te media query yok, yani "moda göre" yapılamıyor.
  > Varsayılan tema **koyu** olduğu için koyu değer çoğunluk durumla eşleşir;
  > açığa çevirmek koyu kullanıcılarda açık splash flaşı yaratırdı (mevcut
  > durumun tersi).
  >
  > **Etki alanı zaten dar:** App Store'daki iOS sürümü ve Capacitor Android
  > bu dosyayı splash için kullanmıyor; **çalışan PWA'da da `index.html`'deki
  > dinamik `theme-color` meta'sı manifest'i eziyor** (FOUC script'i `light`
  > iken `#f2f2f6` yazıyor). Fark yalnızca PWA'nın **açılış splash'inde** görünür.
- Koyu zemin için yapılmış PNG/görsel açık modda kötü duruyorsa bildir
  (`src/assets/hero.png`, `public/icon-*.png`).

### Faz 3 kontrol listesi — madde madde (kaynak: `~/Downloads/exambro-acik-mod-widget-komutu.md`)

| # | Madde | Durum | Nerede / kanıt |
|---|---|---|---|
| 1 | Splash / açılış ekranı | ✅ | Tamamen token (`--bg`, `--violet`, `--text-1`, `--glow-logo`). Web'de **tek kareden kısa** sürüyor (`store.get` → `localStorage` tek mikro-görevde dönüyor), ekran görüntüsüyle yakalanamıyor — denendi, hep `fadein`'deki `Onboard` geliyor. Doğrulama **kod incelemesi + ilk boyama ölçümü**: `capture-boot.mjs` React mount ÖNCESİ `data-theme=light` ve `theme-color=#f2f2f6` olduğunu gösteriyor. Cihazda açılışı zaten native splash kaplıyor |
| 2 | Giriş / onboarding adımlarının hepsi | ✅ | `Onboard` (tek adım, başka adım yok). `capture-boot.mjs` ölçtü: açık modda **4/4 metin AA** (4.64–19.36). Koyu modda iki `--text-4` satırı 3.39 ✗ — mevcut borç |
| 3 | Ana sayaç ekranı | ✅ | Grup 2 |
| 4 | Sınav ekleme / seçme, date picker | ✅ | Grup 3; picker görünümü `color-scheme`'den kalıtıyor (§4) |
| 5 | Rapor sekmesi (grafikler dahil) | ✅ | Grup 5 + §4 "Rapor grafikleri" |
| 6 | Ayarlar ekranı ve alt sayfaları | ✅ | Grup 5 — Rapor içindeki ayarlar kartı. **Alt sayfa yok** |
| 7 | Alt menü (nav) | ✅ | Grup 1 |
| 8 | Üst bar / başlık | ✅ | Grup 1 |
| 9 | Modal / bottom sheet / popover / dropdown | ✅ | Grup 7. **Popover ve dropdown bu uygulamada yok** |
| 10 | Butonlar: birincil / ikincil / ghost / tehlike / **disabled** | ✅ | Birincil (`--grad-brand-135`, paywall CTA), ikincil (kenarlıklı "geri yükle"), ghost ("Şimdi değil"), tehlike (`--danger`, onay sheet'i 5.30 ✓), disabled (grup 3'te "Sınav Ekle", grup 7'de `purchasing` → `opacity .6`) |
| 11 | Form: input / textarea / select / checkbox / radio / switch | ✅ | input (grup 3, `.themed`), checkbox (grup 4), radio (kaygı skalası, grup 4), switch (grup 5, toggle 4.93 ✓). **textarea ve select uygulamada yok.** Odak: `:focus-visible` → `--violet` (token). Placeholder → `--text-4` (token) |
| 12 | Toast / bildirim / uyarı | ✅ | Grup 7 — toast metni 17.82 ✓ |
| 13 | Boş durumlar | ✅ | İki `EmptyState`: "Henüz sayaç yok", "Henüz hedef yok". Açık modda çekildi ve doğrulandı |
| 14 | Yükleniyor / skeleton / spinner | **N/A** | Yok — yükleme durumu yalnızca `Splash` |
| 15 | Hata ekranları | **N/A** | Yok |
| 16 | Scrollbar rengi | **N/A** | `::-webkit-scrollbar { width: 0 }` — tamamen gizli |
| 17 | Seçim (text selection) rengi | ✅ | `::selection` → `--selection-bg` + `--text-1` (grup 1) |
| 18 | `theme-color` dinamik | ✅ | `index.html` inline script + `applyTheme()`. **Ölçüldü:** ilk boyamada açık modda `#f2f2f6` |
| 19 | iOS status bar senkron | ✅ | Grup 1, `applyStatusBar()` + `visibilitychange` (§8 R) |
| 20 | Safe area / notch zemini | ✅ | `S.root` / `S.nav` zeminlerinden geliyor, ikisi de token + `.themed` (grup 1) |
| 21 | SVG ikonlar `currentColor` | **N/A** | `src/icons.jsx` zaten tamamen `currentColor`; sabit renkli SVG yok |
| 22 | Koyu için yapılmış PNG/görsel | ⚠️ | **Bildirim aşağıda** |
| — | Geçiş anlık, sayfa yenilenmiyor | ✅ | `data-theme` attribute değişimi; `theme-transition.mjs` |
| — | 150–200ms `transition`, sayaç animasyonu bozulmuyor | ✅ | §8 Q — 180ms, muaf liste `.no-theme-anim` |
| — | `prefers-reduced-motion`'da geçiş kapalı | ✅ | `theme-transition.mjs` (d): sınıf **hiç eklenmiyor** |

**Eksik madde yok.** N/A olanlar: 14, 15, 16, 21 (ve 9/11 içindeki popover, dropdown,
textarea, select — bileşen uygulamada yok).

#### 22 — görseller hakkında bildirim

- `src/assets/hero.png`, `react.svg`, `vite.svg` → hiçbir yerden referans verilmiyordu,
  **silindi** (`chore: remove unused assets`).
- `public/icon-192.png` / `icon-512.png` → PWA kurulum ikonları. Koyu zeminli, ama bunlar
  **işletim sisteminin ana ekranında** görünüyor, uygulamanın açık zemininde değil —
  sabit marka varlığı, temayla değişmesi beklenmez. **Açık modda bir sorun yaratmıyor.**
  Tofu kusuru için §13'teki "bilinen sorunlar" satırına bakın.

### Bu projede **N/A** olan kontrol listesi maddeleri
- **Scrollbar rengi** → `::-webkit-scrollbar { width: 0 }`, tamamen gizli.
- **Hata ekranı** → yok.
- **Skeleton / spinner** → yok (yükleme durumu sadece `Splash`).
- **SVG ikonlar** → `src/icons.jsx` zaten tamamen `currentColor`, düzeltilecek bir şey yok.

---

## 8. Q / R — uygulama kuralları

### Q — `transition` kapsamı

İki katmanlı: **kalıcı** `.themed` kuralı + mod değişimi anında açılan **geçici**
`html.theme-anim` kuralı. `*` seçicisi ve `!important` **kullanılmıyor**.
`prefers-reduced-motion: reduce` mevcut global blokta `transition-duration: 0.01ms
!important` ile zaten kapatıyor; ayrıca geçici sınıf o tercihte **hiç eklenmiyor**.

```css
/* kalıcı */
.themed { transition: background-color 180ms ease, color 180ms ease; }

/* geçici — yalnızca mod değişiminde 200ms boyunca */
html.theme-anim .themed:not(.no-theme-anim)    { transition: background-color 180ms, color 180ms; }
html.theme-anim .pressable:not(.no-theme-anim) { transition: transform .15s, opacity .15s,
                                                             background-color 180ms, color 180ms; }
```

#### Neden geçici sınıf — kalıcı kural neden olmaz
`.pressable` de `transition` **kısayolunu** yazıyor ve aynı specificity'de (0,1,0) daha
altta olduğu için `.themed`'i eziyordu: `.pressable`+`.themed` taşıyan butonlar mod
değişiminde sıçrıyordu.

Kalıcı bir `.pressable.themed { … }` kuralı çözüm **değil**: o kural her zaman aktif olur
ve **koyu modda da** durum değişimlerinde renk geçişi başlatırdı — "Bugün Çalıştım"
`doneToday` olunca `--grad-green` → `--green-soft` yumuşak geçerdi. Bu §2'yi çiğner.

Geçiş bunun yerine **kullanıcı tetiklediği anda** veriliyor: `theme.jsx` → `flashThemeAnim()`
`<html>`'e `.theme-anim` ekler, **200ms sonra `setTimeout` ile kaldırır**. (`transitionend`
kullanılmıyor: hiç transition başlamazsa olay hiç gelmez ve sınıf üstte kalırdı.)
`html.theme-anim .pressable` (0,3,1) → `.pressable`'ın (0,1,0) kısayolunu yener, ama
**yalnızca o 200ms boyunca**. Diğer tüm zamanlarda tap animasyonu ve durum renkleri
Faz 1 öncesiyle birebir aynı.

Sınıf `data-theme`'den **önce** ekleniyor ve ilk mount'ta eklenmiyor (`firstRun` ref'i) —
açılışta renk animasyonu istemiyoruz, `data-theme`'i FOUC script'i zaten yazmış oluyor.

**`.themed` ALAN öğeler:** `S.root`, `S.header`, `S.nav`, `Card` (`ui.jsx`), `CountCard` kökü,
ana sayfadaki motivasyon kartı, "Bugün Çalıştım" butonu, psikoloji köşesi kartı, Pro teaser,
`ExamsTab` manuel ekleme ekranındaki 3 input, `GoalsTab` hedef satırları + hedef input'u,
`AnxietyTab` "günün notu" kartı, `Stat` kutuları, `ReportTab` haftalık özet bloğu,
**`Paywall` perdesi + kartı, `ConfirmSheet` perdesi + sheet'i, toast** (grup 7).

> **Overlay'ler neden `.themed` alıyor ve neden muafiyet gerekmiyor:** üçü de
> **açıkken mod değişebiliyor** (§7 S senaryosu) ve renkleri iki modda farklı —
> geçiş verilmezse sayfanın geri kalanı yumuşak geçerken overlay sıçrıyor.
> Muafiyet gerekmiyor çünkü kendi girişleri `transition` değil **`animation`**
> (`sheetUp` / `toastIn` / `fadein`); geçici kuralın verdiği `transition`
> onlarla aynı özelliğe yazmıyor, dolayısıyla kesmiyor. Muaf listesi
> (`.no-theme-anim`) yalnızca kendi **`transition`**'ı olanlar içindir.

#### MUAF öğeler — `.no-theme-anim`
Kendi `transform`/`width`/`height` animasyonları var; geçici kural da bunlara **dokunamaz**,
yoksa mod değişimi animasyonun ortasından keserdi. Muafiyet **iki katmanlı**: bu öğeler
`.themed`/`.pressable` almaz **ve** `.no-theme-anim` ile işaretlidir (seçicilerdeki
`:not(.no-theme-anim)` bunu zorunlu kılar — ileride yanlışlıkla `.themed` eklense bile korunur).

| Öğe | Kendi animasyonu |
|---|---|
| `BreathCircle` iç çember | `transition: transform Ns` (inline) |
| `ProgressBar` (iz + dolgu) | `width 0.4s` |
| Rapor çubukları (2 grafik) | `height 0.3s` |
| `S.boom` — "Süpersin!" overlay'i | `boomFade` / `popIn` |
| `CountCard` rakam kutuları | — (geçiş istenmiyor) |

### R — `StatusBar` eşlemesi (plugin `.d.ts`'inden teyit edildi, ezberden yazmayın)

| Enum | `.d.ts` açıklaması | Ne zaman |
|---|---|---|
| `Style.Dark` | *"Light text for dark backgrounds."* | tema `dark` |
| `Style.Light` | *"Dark text for light backgrounds."* | tema `light` |
| `Style.Default` | cihaz görünümünü izler | **KULLANMA** — uygulama içi seçimi ezer |

`src/theme.jsx` → `applyStatusBar(theme)`, `applyTheme()` içinden çağrılıyor.
**Resume:** iOS ön plana dönünce stili bazen sıfırlıyor → `visibilitychange` ile tekrar
uygulanıyor. `@capacitor/app` **eklenmedi**; `App.jsx` zaten aynı olayı kullanıyor,
WKWebView'de güvenilir çalıştığı sabit.

`capacitor.config.json`'daki `StatusBar.style: "DARK"` açılış değeri olarak duruyor ve
`Info.plist`'teki `UIStatusBarStyleLightContent` ile tutarlı — koyu modu değiştirmiyor.

---

## 9. Test / doğrulama düzeneği

### `npm test`
`src/ink.test.mjs` — ink() sözleşmesi + sabitlerin `index.css` ile eşleşmesi (drift koruması).

### Betikler artık REPODA: `tools/theme-check/`

Eskiden scratchpad'deydiler ve her oturum değişiminde kayboluyorlardı. Artık
sürümleniyorlar — kurulum, kullanım ve akış **[`tools/theme-check/README.md`](../tools/theme-check/README.md)**
içinde. Aşağısı yalnızca "neden böyle" notları; **nasıl çalıştırılacağı README'de.**

```bash
cd tools/theme-check && npm install && npx playwright install webkit
```

Bağımlılıklar o klasöre **izole**: kendi `package.json`'ı var, kök `package.json`
ve `package-lock.json` **değişmedi**, `dist/`e hiçbir şey girmiyor.

| Ne lazım | Komut |
|---|---|
| Koyu mod regresyonu | `node shoot-all.mjs dark base` → değişikliği uygula → `node shoot-all.mjs dark new` → `node diff-all.mjs base new` |
| Tek ekran | `node capture.mjs <dark\|light> <çıktı.png> [tab:… btn:… full]` |
| Kontrast | `node contrast-{anxiety,heatmap,report,psychology,chevrons}.mjs <dark\|light>` |
| Tema geçişi + S senaryosu | `node theme-transition.mjs` |
| Bir palet değeri nereden geldi | `solvers/` |

**Referans görüntüler commit EDİLMİYOR** (`shots/`, `.gitignore`'da): her biri ~1–3 MB,
ekran başına iki kopya, her sürümde yenileniyor. Üç adımlık akışla birkaç dakikada
yeniden üretiliyor — saklamaya değmez.

### Koyu mod regresyon testi (piksel farkı) — **en önemli güvenlik ağı**

`shoot-all.mjs` standart **14 ekranı** çeker: `home` · `exams` · `osym` · `manual` ·
`goals` · `anx` · `anx-low` · `report` · `hub` · `psych-cat` · `breath` ·
**`paywall` · `confirm` · `toast`** (son üçü grup 7'de eklendi).
Yeni ekran eklerken `SCREENS` sabitine ekleyin; hem referans hem karşılaştırma tarafı
kendiliğinden kapsar.

> Overlay ekranları `"viewport"` işaretiyle **tam sayfa değil** çekiliyor:
> `position:fixed` oldukları için fullPage çekimde arkalarındaki kaydırılabilir
> sayfanın boyu belirleyici oluyor ve gürültü üretiyor.

**Düzeneğin kendisi test edildi:** `--surface-2`'ye tek hex birimlik değişiklik
(`#14141f` → `#15151f`) verildi; 11 ekranın **10'unda** yakalandı ve çıkış kodu 1 döndü.
Yani "hep 0 piksel" çıktısı, ağın çalışmadığı için değil gerçekten fark olmadığı için.

Tohum veri (`lib/page.mjs` → `SEED` + `shoot-all.mjs`) onboarding'i atlar ve ekranları
doldurur: `xb_grade="12"` → `hidden` varsayılanı `["LGS"]`, yani FIXED listede hem
**görünür** (TYT/AYT) hem **gizli** (LGS) kart aynı ekranda; ayrıca bir kullanıcı sınavı,
dolu ısı haritası, hedefler ve rapor verisi.

#### ⚠️ `page.clock.setFixedTime` ŞART
`lib/page.mjs` sayfayı açmadan önce saati donduruyor:

```js
await page.clock.setFixedTime(new Date("2026-07-28T09:00:00Z"));
```

Yoksa **geri sayımın saniyeleri sahte fark üretiyor**. İlk denemede ana sayfada 1488
piksel (%0.08) fark çıktı ve gerçek bir regresyon sanıldı; diff görüntüsüne bakınca
farkın yalnızca DK/SN hanelerinde olduğu görüldü. Saat dondurulunca 0'a indi.

Tarih `examDates.js`'teki sınavlara göre seçildi. **Değiştirirseniz referans
görüntülerin tamamını yeniden üretin.**

### Kontrastı GERÇEK PİKSELDEN ölç (`contrast-*.mjs`)

Yarı saydam zeminlerde (`anxColor()` gibi `rgba` yıkamalar) kontrastı elle hesaplamak
hataya açık: kartın kendi zemini, üstündeki tint, `--bg` ve alfa üst üste biniyor.
`contrast-*.mjs` bunun yerine öğenin **ekran görüntüsündeki zemin pikselini** okuyup
`getComputedStyle().color` ile karşılaştırıyor — ne render edildiyse o ölçülüyor:

```js
const color = parse(await el.evaluate(e => getComputedStyle(e).color));
const box   = await el.boundingBox();
const shot  = PNG.sync.read(await pg.screenshot());
const i = (shot.width * Math.round(box.y + box.height/2) + Math.round(box.x + 3)) << 2;
const bg = [shot.data[i], shot.data[i+1], shot.data[i+2]];   // metnin uzağında, kutu içi
```

Grup 4'teki iki AA ihlali bu yolla bulundu; göz kararı "biraz soluk" derken ölçüm
2.30:1 dedi. Yeni bir yarı saydam yüzey eklenince aynı yöntemi kullan.

⚠️ **İki tuzak** (ikisi de yaşandı):
1. **Metinde piksel örneklemesi harfin üstüne düşebilir** → sahte `1.00:1`. Metinlerde
   zemini DOM'dan çöz: ilk **opak** `background-color`'a kadar ataları tara
   (`lib/page.mjs` → `colorOn()` / `RESOLVE_BG`). Piksel örneklemesini yalnızca gerçekten yarı saydam
   katmanlar için (çubuk, ısı haritası karesi, toggle) kullan.
2. **"İlk bulunan" öğe en zayıf öğe değildir.** Grafik 2'de ilk çubuk ölçülünce 4.58
   çıkmıştı; **en zayıf** çubuk seçilince 2.69. Bir dizi öğeyi ölçerken her zaman
   en kötü örneği ara.

### Sürekli doğrulanacaklar
- `npm run build` temiz.
- `npm run lint` → **1 uyarı** (`'Icon' is defined but never used`, `App.jsx`) —
  **önceden mevcut**, `main`'de de var, regresyon değil.
  > `542d907` (düzeneği repoya alan commit) bunu bir süre **19 hata**ya çıkarmıştı:
  > `tools/theme-check/*.mjs` eslint'te tarayıcı global'leriyle taranıyordu, her
  > `process` kullanımı `no-undef` veriyordu. `eslint.config.js`'teki node bloğuna
  > `tools/**/*.mjs` eklendi. **Düzeneğe yeni betik eklerken lint'i de koşun.**
- Ham renk taraması:
  `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/ --include="*.jsx" --include="*.js" --include="*.css"`
  → yalnızca **veri renkleri** (`FIXED`/`OSYM`/`c:"#ffbe0b"`/`PSYCH_COLORS`) ve
  `rgba(var(--anx-*-rgb), …)` kalmalı. `src/ink.js` ve `src/ink.test.mjs` içindeki
  hex'ler de meşru (mürekkep sabiti ve test verisi).
- Metin/zemin çiftleri: **`node contrast-sweep.mjs <dark|light>`** üretiyor.

  > ⚠️ **"56 çiftin TAMAMI AA" ifadesi yanlıştı, düzeltildi.** O sayı elle
  > tutulmuş bir listeydi ve hiçbir betik üretmiyordu. Süpürme (14 ekranın
  > her metin düğümü, renk+zemin+kova ile tekilleştirilmiş) gerçek tabloyu veriyor:
  >
  > | | Açık | Koyu |
  > |---|---|---|
  > | benzersiz çift | 62 | 72 |
  > | AA'yı geçen | **62/62 ✓** | 57/72 |
  >
  > **Açık modun TAMAMI AA.** Koyu moddaki 15 eksik mevcut borç (çoğu `--text-4`),
  > koyu mod referans olduğu için dokunulmadı.
  >
  > ✅ **`--text-4` düzeltmesi.** İlk süpürmede açık modda 2 çift kalmıştı:
  > `ExamsTab` sınav tarihi (11.5px `--text-4`), `--tint-weak` yıkamalı kartın
  > üstünde **4.29 / 4.47 ✗**. Token "ipucu/meta — yalnızca dekoratif" diye
  > seçilmişti ama **sınav tarihi dekorasyon değil bilgi**, o yüzden muafiyet
  > gerekçesi burada zayıf kaldı. Açık modda `#6b6b82` → **`#67677d`** (%4 koyu):
  > tint'li kartta **4.56 ✓**, beyaz kartta 5.51 ✓. Tek token, koyu mod ayrı
  > değer taşıdığı için **piksel farkı 0**.
  >
  > Süpürmenin **kapsam sınırı** çıktıda açıkça yazılıyor: katlamanın altındaki
  > öğeler o ekranda ölçülmüyor (kaydırma adımı gerekir), overlay'in ardında
  > kalanlar da ölçülmüyor (kendi ekranlarında ölçülüyorlar).
  >
  > Gradyan zeminlerde süpürme **baskın** rengi alır; **en kötü** noktayı alana
  > özel betikler ölçer. Paywall CTA'da fark görünür: süpürme 5.74, worst-of-5
  > yapan `contrast-overlays.mjs` **4.76** — karar için ikincisi geçerli.
- Yeni kurulum: `localStorage` temizle → uygulama **koyu** açılmalı.

---

## 10. Faz 4 — Rapor sekmesine "Görünüm" seçici ✅

`AppearanceRow` (`src/App.jsx`, `SettingsRow`'un hemen üstünde) + `IconContrast`
(`src/icons.jsx`). Ayarlar kartının **içinde, üç mevcut satırın ÜSTÜNDE**, altında
`S.divider`. Betik: **`tools/theme-check/appearance.mjs`** (kontrast + davranış).

### ⚠️ Seçili segmentte accent zemin YOK — bilerek
İlk akla gelen tasarım seçili segmente `--violet` zemin + `--on-accent` (beyaz)
metindi. **Koyu modda AA'yı geçmiyor:** beyaz `#9d5cff` üstünde ~3.5, paywall
CTA'sında ölçülen 3.20–3.84 ile aynı olgu. Onun yerine kaygı skalasının
kanıtlanmış dili kullanıldı:

| | Koyu | Açık |
|---|---|---|
| seçili segment (`--text-1` / `--surface-2`) | 16.38 ✓ | 17.82 ✓ |
| seçilmemiş (`--text-3` / `--surface-input`) | 4.71 ✓ | 5.94 ✓ |
| satır başlığı | 16.38 ✓ | 17.82 ✓ |
| alt açıklama (`--text-4`) | **3.10 ✗** | 5.51 ✓ |
| seçim kenarlığı ↔ segment (1.4.11) | 4.70 ✓ | 5.70 ✓ |
| seçim kenarlığı ↔ ray (1.4.11) | 4.07 ✓ | 4.67 ✓ |

> **Alt açıklamadaki 3.10 koyu mod borcu — yeni değil, MİRAS.** Aynı karttaki üç
> `SettingsRow`'un alt yazısı da `--text-4` ile tam olarak 3.10 veriyor. Yeni satırı
> `--text-3`'e almak onu kardeşlerinden **görünür biçimde farklı** yapardı;
> `--text-4`'ü koyu modda açmak ise koyu modu değiştirirdi (§2 yasak). Görsel
> tutarlılık seçildi. Açık modda geçiyor (5.51).

Seçim göstergesi **yedekli**: zemin değişimi (`--surface-input` → `--surface-2`)
tek başına 1.16–1.22 ile eşiğin altında, göstergeyi **violet kenarlık** taşıyor
(rapor çubuklarındaki mantık, §4) — ayrıca `aria-checked` ve font ağırlığı.

### Erişilebilirlik — ölçülen davranış
`role="radiogroup"` + `role="radio"` + `aria-checked`, **roving tabindex**
(her zaman tam **1** radio `tabindex=0`). Ok tuşları hem taşır hem seçer,
uçlarda **sarar**; `Home`/`End` uçlara gider. Hepsi `appearance.mjs`'te doğrulandı:

```
"Açık" tıklandı   → theme=light  pref=light      (anında, kaydet butonu yok)
ArrowRight        → Sistem       pref=system
ArrowRight        → Koyu         pref=dark       (sondan başa sardı)
Home / End        → Koyu / Sistem
"Sistem" + cihaz→light/dark → theme cihazı izliyor, pref "system" kalıyor
```

Haptic: mevcut `tap()` kullanıldı, yenisi yazılmadı.

> **Piksel notu:** bu satır Rapor ekranına **yeni UI eklediği** için koyu modun
> render'ı bilerek değişti (sayfa 2324 → 2568px; `confirm`/`toast` görüntüleri de
> kaydırma konumu kaydığı için farklı çıktı). Diff doğrulandı — fark yalnızca
> dikey kayma + yeni satır. Referans yenilendi, sonrasında 14 ekranda 0 piksel.

### Verilmiş kararlar (uygulandı)
- **Konum:** Rapor ekranındaki mevcut "ayarlar" kartının **içine, üç mevcut satırın ÜSTÜNE**
  (`ReportTab` 1523–1614; kart ~1580–1610 civarı). `S.divider` ile ayır, mevcut
  `SettingsRow` dilini kullan.
- **Tip:** 3 seçenekli segment kontrol → **Koyu · Açık · Sistem**
- Başlık **"Görünüm"**, alt açıklama *"Uygulamanın rengini değiştir."*
- `system` seçilince `localStorage`'a `system` yazılır (`dark`/`light` değil) —
  `theme.jsx` bunu zaten destekliyor.
- Seçim **anında** uygulanır, kaydet butonu yok.
- Haptic: mevcut `tap()` yardımcısı (`App.jsx` başı) kullanılacak, yenisi yazılmayacak.
- Erişilebilirlik: `role="radiogroup"`, ok tuşlarıyla gezinme, `aria-checked`.

---

## 11. Faz 5 — iOS widget'ları (başlamadı)

### Faz 0'da tespit edilenler
- `ios/App/App.xcodeproj` — **tek target: `App`**. Widget extension **yok**.
- **`.entitlements` dosyası hiç yok** → App Group sıfırdan kurulacak.
- Deployment target **iOS 15.0**. SPM (CocoaPods değil): `ios/App/CapApp-SPM/Package.swift`.
- Kurulu plugin'ler: haptics, keyboard, local-notifications, preferences, splash-screen,
  status-bar, revenuecat.

### Verilmiş kararlar
- App Group kimliği: `group.com.exambroapp.sinav`
- Widget extension adı: **`ExamBroWidget`**, deployment target ana uygulama ile aynı.
- SwiftUI + WidgetKit, `AppIntent` tabanlı yapılandırma **gerekmiyor** (sınav seçimi app içinden).
- Üç boyut: **systemSmall, systemMedium, systemLarge**.
- Köprü JSON şeması (`exams` **en fazla 2 eleman**, `theme` çözülmüş değer — `system` olmayacak):
  ```json
  { "theme": "dark",
    "exams": [{ "id": "yks-2027", "name": "YKS", "date": "…", "color": "#RRGGBB" }],
    "updatedAt": "…" }
  ```
- Yazdıktan **hemen sonra** `WidgetCenter.shared.reloadAllTimelines()`.
- Tetikleyiciler: tema değişimi, widget sınavı seçimi değişimi, sınav ekleme/silme/tarih
  düzenleme, uygulama arka plana alınırken.
- Renkler App Group'tan okunan `theme`'e göre; **`@Environment(\.colorScheme)` KULLANMA** —
  uygulama içi seçim kazanmalı.
- Faz 2 paleti Swift tarafında **`WidgetTheme` struct**'ı olarak, hex'ler tek yerden.
- Türkçe tarih formatı `Locale(identifier: "tr_TR")`, zaman dilimi cihazın yereli.
- Timeline: gece yarısı yeniden hesaplama + saatlik refresh (Large'daki saat için).
- Sınav geçmişse "Geçti"/"Bugün!" ayrı ele alınacak, **negatif gün gösterilmeyecek**.
- Hiç sınav seçilmemişse: "Uygulamadan sınav seç" boş durumu.
- `widgetURL` ile deep link; placeholder ve snapshot görünümleri de doldurulacak.
- **Android widget'ı ayrı konuşulacak** — önce iOS bitecek.

### Aşama 1 — keşif + hazırlık ✅ (Xcode'a dokunulmadı)

#### K1. `@capacitor/preferences` App Group'a YAZAMAZ — kısayol yok

Kurulu **8.0.1**'in kaynağına bakıldı (`node_modules/@capacitor/preferences/ios/Sources/`):

```swift
// Preferences.swift
private var defaults: UserDefaults { return UserDefaults.standard }   // ← sabit
private var prefix: String {                                          // ← group SADECE önek
    case let .named(group): return group + "."
}
```

`PreferencesConfiguration.Group` bir **App Group değil, anahtar ÖNEKİ**
(`applyPrefix(to:)` ile `CapacitorStorage.` gibi). `UserDefaults(suiteName:)`
plugin'in **hiçbir yerinde geçmiyor**; TS dokümantasyonu da "groups are used to
**organize** key/value pairs" diyor. **Sonuç: Preferences ile yazılan veri
paylaşılan konteynere girmez, widget extension okuyamaz.**

Yani "sadece `reloadAllTimelines()` için minik bir köprü" **yetmiyor** — yazma da
köprüde olmak zorunda. İkisi tek plugin'de: **`ios/App/App/WidgetBridge.swift`**
(`@objc(WidgetBridgePlugin)`, `jsName = "WidgetBridge"`, tek metot `sync`).
JS tarafı `src/widget.js` → `registerPlugin("WidgetBridge")`.

> Köprü, App Group hakkını `FileManager.containerURL(forSecurityApplicationGroupIdentifier:)`
> ile kontrol ediyor — `UserDefaults(suiteName:)` hak yokken de nil DÖNMEYEBİLİR
> (yazar ama paylaşmaz, sessiz başarısızlık). Konteyner URL'si hak yoksa nil döner,
> o yüzden teşhis ondan alınıyor ve hata mesajı üç olası sebebi sayıyor.

#### K2. Sürüm senkronu — kurulu

**`ios/App/Version.xcconfig`** tek kaynak (`MARKETING_VERSION = 1.4.0`,
`CURRENT_PROJECT_VERSION = 8`). Her iki target da base configuration olarak bunu
kullanacak; ikisi de aynı dosyaya eşit olunca **birbirlerine de eşit** olur.

**`ios/App/Scripts/check-version-sync.sh`** — her iki target'ta Run Script phase.
Üç şeyi ayrı ayrı yakalar ve `error:` ile build'i durdurur:

| Kontrol | Yakaladığı hata |
|---|---|
| `XB_VERSION_SOURCE` sentinel | xcconfig base configuration olarak **hiç bağlanmamış** |
| `MARKETING_VERSION` ≠ dosya | Xcode **General sekmesinden** sürüm yazılmış, target ayarı xcconfig'i eziyor |
| `CURRENT_PROJECT_VERSION` ≠ dosya | aynısı, build numarası için |

> Asıl tuzak sentinel'siz yakalanmıyordu: General'den sürüm değiştirmek target
> build setting'i yazar ve `.xcconfig`'i **sessizce** ezer; iki target ayrışır ve
> hata ancak App Store Connect yüklemesinde görülür. Betik üç senaryoda da
> denendi (doğru / bağlı değil / ezilmiş), üçünde de beklendiği gibi davrandı.

#### K3. iOS 17 `containerBackground` — koşullu, tek sürüme yazılmadı

**`ios/App/ExamBroWidget/WidgetCompat.swift`** → `View.widgetContainerBackground(_:)`
`#available(iOSApplicationExtension 17.0, *)` ile iOS 17+'da
`containerBackground(_:for:.widget)`, iOS 15/16'da `background(_:)`.
iOS 17'de sistem zemini kendi çizer ve `.background(...)` **yok sayılır**;
çağrılmazsa widget iOS 17+'da yanlış zeminle çıkar.

> ⚠️ `contentMarginsDisabled()` için sarmalayıcı **bilerek yazılmadı**:
> `WidgetConfiguration` uzantısında `some WidgetConfiguration` döndüren yardımcı
> **derlenmez** — `#available` dallarının iki farklı somut tipi olur, opaque dönüş
> tek tip ister ve `@ViewBuilder`ın View'lar için yaptığı tip silme burada yok
> (public `AnyWidgetConfiguration` da yok). **Karar:** iOS 17 varsayılan kenar
> boşlukları kabul edildi, tasarım onlara göre yapılacak.

#### K4. Palet tek kaynaktan üretiliyor

**`tools/theme-check/gen-widget-theme.mjs`** → `ios/App/ExamBroWidget/WidgetTheme.swift`.
14 token × 2 tema, doğrudan `src/index.css`'ten. Üretilen dosya commit'li ve başında
"ÜRETİLMİŞTİR — ELLE DÜZENLEMEYİN" uyarısı var.

```bash
node tools/theme-check/gen-widget-theme.mjs           # üret
node tools/theme-check/gen-widget-theme.mjs --check    # bayat mı (çıkış 1)
```

`--check`, `src/ink.test.mjs`'in ink sabitleri için yaptığının aynısı: palet
değişip Swift güncellenmezse yakalar. Düz hex olmayan bir token istenirse
(örn. `rgba(...)`) betik **hata verip durur** — sessizce yanlış renk üretmez.
`--track-line` koyu modda `transparent` → `Color.clear` olarak çevriliyor.

#### K5. `syncToWidget()` gövdesi yazıldı

`src/widget.js`. Web/PWA'da erken döner. **`theme` alanı savunma amaçlı bir kez
daha sabitleniyor** — `"light"` değilse `"dark"`, yani köprüye **asla `"system"`
gitmez**. Hata yutuluyor (widget target'ı yokken uygulama çalışmaya devam etmeli),
konsola bir kez uyarı basılıyor.

### Aşama 1b — Xcode kurulumu PROGRAMATİK yapıldı ✅

**`tools/ios-setup/add-widget-target.rb`** (idempotent). Elle tıklanacak 17 adımın
**16'sı** betikte; kalan tek şey Apple hesabındaki App Group kaydı (aşağıda).

**Neden `xcodeproj` gem'i, ham pbxproj değil:** tek bir native target ~12 nesne
gerektiriyor (PBXNativeTarget, XCConfigurationList, 2× XCBuildConfiguration, üç
build phase, ürün referansı, PBXGroup, her dosya için PBXBuildFile,
PBXContainerItemProxy + PBXTargetDependency, PBXCopyFilesBuildPhase) ve hepsi
24 haneli UUID'lerle birbirine bağlı. Elle üretmek UUID çakışması riski taşır ve
diff'i okunamaz yapar. `xcodeproj` CocoaPods/fastlane'in kütüphanesi, dosyayı
deterministik yazıyor.

#### ⚠️ İki tuzak — ikisi de yaşandı, ikisi de ölçümle yakalandı

**1 · xcconfig yolu yanlışsa `xcodebuild` HATA VERMEZ.** Referans önce
`App/Version.xcconfig` verildi; main group `ios/App`'e çözülüyor (Capacitor'ın
`debug.xcconfig` referansı `../debug.xcconfig` olduğu için), yani doğru yol
`Version.xcconfig`. Yanlış yolda xcconfig **sessizce yok sayıldı** ve sürümler
kayboldu. `XB_VERSION_SOURCE` sentinel'i tam bunun için vardı — `showBuildSettings`
çıktısında boş gelince anlaşıldı.

**2 · Base configuration PROJE seviyesine konmalı, target'a değil.** App'in Debug
slotu Capacitor'ın `debug.xcconfig`'iyle **dolu**, ve o dosya `cap sync`
tarafından ezilebilir. Xcode'un çözüm sırası — proje xcconfig → proje ayarı →
target xcconfig → target ayarı — sayesinde `Version.xcconfig` proje seviyesinden
App'e de sızıyor. **Varsayım bırakılmadı**, dört kombinasyonda doğrulandı:

| | `XB_VERSION_SOURCE` | `MARKETING_VERSION` | `CAPACITOR_DEBUG` |
|---|---|---|---|
| App / Debug | xcconfig ✓ | 1.3.0 ✓ | true ✓ (korundu) |
| App / Release | xcconfig ✓ | 1.3.0 ✓ | — |
| Widget / Debug · Release | xcconfig ✓ | 1.3.0 ✓ | — |

#### Doğrulananlar
- Simülatör derlemesi **BUILD SUCCEEDED** (değişiklikten önce baseline de alındı).
- `ExamBroWidget.appex` → `App.app/PlugIns/` içine gömülüyor.
- Sürümler eşleşiyor (app 1.3.0/7, widget 1.3.0/7),
  `NSExtensionPointIdentifier = com.apple.widgetkit-extension`.
- **Guard gerçek `xcodebuild`'de denendi:** `MARKETING_VERSION=1.3.1` override'ıyla
  build okunabilir hatayla **DURDU**.
- **`npx cap sync ios` target'a DOKUNMUYOR** — sync sonrası `pbxproj` diff'i boş,
  derleme yine başarılı. Rutin akış widget'ı bozmuyor.

#### 🔴 Kodla YAPILAMAYAN tek şey: Apple hesabında App Group kaydı
İmzalı cihaz derlemesi (`-sdk iphoneos`) **her iki target'ta** şu hatayı veriyor:

```
Provisioning profile "..." doesn't support the group.com.exambroapp.sinav App Group.
Provisioning profile "..." doesn't include the App Groups capability.
```

Bu, Apple Developer hesabında yapılacak bir kayıt — **bilerek yapılmadı**, çünkü
kullanıcının geliştirici hesabını değiştiren dışa dönük bir işlem
(`-allowProvisioningUpdates` bunu otomatik yapabilirdi). Adımlar kullanıcıya verildi.

### Aşama 2 — widget'lar yazıldı ✅

Üç boyut: `WidgetViews.swift` (Small/Medium/Large), giriş noktası
`ExamBroWidgetBundle.swift`, tarih/durum mantığı `ExamCountdown.swift`.

#### 🔴 Yerel Capacitor plugin'i kaydetmek — üç adımda çözüldü

Köprü ilk kurulduğunda **hiç çalışmadı**; sebebi ancak simülatör konsolundan
adım adım bulundu. Sırayla:

| Belirti | Gerçek sebep | Çözüm |
|---|---|---|
| `"WidgetBridge" plugin is not implemented on ios` | Capacitor 8, **uygulama target'ındaki** yerel plugin'i otomatik keşfetmiyor | `MainViewController: CAPBridgeViewController` + `capacitorDidLoad()`, storyboard'un sınıfı değiştirildi |
| Kayıt çalışıyor ama JS hâlâ göremiyor | `Capacitor.PluginHeaders` bridge init'te SPM paketlerinden üretiliyor; `capacitorDidLoad`'daki kayıt o liste için **geç** | JS `Capacitor.nativePromise(plugin, method, opts)` ile doğrudan native kayıt defterine gidiyor |
| `Error loading plugin WidgetBridge for call` | `registerPluginType(_:)` tipten örnek üretemiyor | **`registerPluginInstance(WidgetBridgePlugin())`** |

Üçü de **ölçümle** bulundu — `xcrun simctl launch --console-pty` ile uygulamanın
stdout'u okundu. (Capacitor `print()` kullandığı için `log show`'da görünmüyor.)
Ölçülen `PluginHeaders` çıktısı, `WidgetBridge`'in orada olmadığını gösterdi:
`["CapacitorHttp","Console","WebView","CapacitorCookies","SystemBars","StatusBar",
"Keyboard","Preferences","Haptics","SplashScreen","Purchases","LocalNotifications"]`

#### Uçtan uca doğrulama (simülatör, gerçek çalışma)

`containerURL(forSecurityApplicationGroupIdentifier:)` **nil DÖNMÜYOR** — App
Group konteyneri oluştu ve yazma başarılı. Payload App Group'ta:

```json
{"theme":"dark", "exams":[{"id":"AYT","name":"AYT/YDT",
 "date":"2027-06-21T07:15:00.000Z","color":"#ff4d94"}], "updatedAt":"…"}
```

Tema tercihi `light`'a çevrilip uygulama yeniden açıldığında payload **kendiliğinden**:

```json
{"theme":"light", …, "color":"#ae386b"}
```

`theme` çözülmüş değere, `color` ise §6'daki **ink'lenmiş** tona geçti
(`#ff4d94` → `#ae386b`). Yani App Group'a yazma + `reloadAllTimelines()` zinciri
ve tema takibi çalışıyor.

> ⚠️ **Sınav rengi payload'da ink()'ten geçmiş hâlde gidiyor.** İlk sürümde ham
> veri rengi gönderiliyordu ve açık modda widget'ta okunmuyordu (`#10d99e`
> açık zeminde 1.7:1 — snapshot'ta "LGS" ve "Bugün!" neredeyse görünmezdi).
> `ink()` Swift'e **portlanmadı**; tek kaynak JS'te kaldı.

#### Snapshot düzeneği — neden ana ekran görüntüsü değil

Simülatörün ana ekranına widget **eklemek script'lenemiyor** (`simctl`de komut
yok, tek yol elle sürükle-bırak). `ExamBroWidgetSnapshots` logic-test target'ı
aynı View'ları aynı ölçülerde (158×158 / 338×158 / 338×354) `ImageRenderer` ile
PNG'ye basıyor: **22 görüntü**, 3 boyut × 2 tema × {2, 1, 0 sınav} +
"Bugün!"/"Geçti". Yakalamadığı tek şey sistemin çizdiği dış kabuk.

```bash
TEST_RUNNER_SNAPSHOT_DIR=<klasör> xcodebuild test -project ios/App/App.xcodeproj \
  -scheme ExamBroWidgetSnapshots -destination 'platform=iOS Simulator,name=iPhone 17'
```

> `SNAPSHOT_DIR` değil **`TEST_RUNNER_SNAPSHOT_DIR`**: xcodebuild kabuk ortamını
> test sürecine geçirmiyor, yalnızca `TEST_RUNNER_` önekli değişkenleri iletiyor
> (öneki soyarak). Öneksiz ilk denemede PNG'ler simülatör kum havuzuna yazıldı.

Ayrıca iki davranış testi: **negatif gün asla sızmıyor** (−10…+10 gün taraması)
ve tema çözümlemesi (`"system"`/`nil` → koyu).

### ⚠️ Aşama 2 — Xcode'da elle yapılacak adımlar (tamamlandı)
Target ekleme, App Group capability, signing — bunlar **uydurulmadı**. Emin
olunmayan noktalar rapor içinde **açıkça işaretlendi**. Adım listesi kullanıcıya
"hangi ekran, hangi buton" düzeyinde ayrıca verildi.

---

## 12. Faz 6 — Uygulama içinden widget sınavı seçme — **arayüz ✅, köprü Faz 5'te**

`src/widget.js` (yeni) + `WidgetStar` (`App.jsx`) + `IconStar` (`icons.jsx`).
Betik: **`tools/theme-check/widget-select.mjs`**.

Sınav listesindeki **her satırda** yıldız var — hem `FIXED` (ulusal) hem
"Eklediğim Sınavlar". Seçiliyken yıldız dolu, `--gold`, ve üstünde **sıra rozeti**.

### ⚠️ 3. sınavı seçmeye çalışınca: REDDEDİLİR (sessizce kırpılmaz)

Toast: *"Widget'ta en fazla 2 sınav gösterilebilir. Önce birini kaldır."*
Seçim **hiç değişmez**.

**Neden "en eskiyi otomatik bırak" değil:** burada sıra **anlamlı** — 1. seçilen
Small widget'ta görünen sınav. Otomatik düşürme iki şeyi aynı anda ve görünmez
biçimde değiştirirdi: (a) kullanıcının açıkça seçtiği bir sınavı siler,
(b) sıra kayacağı için **Small widget'ın içeriği de** sessizce değişir. İkisi de
kullanıcının istemediği, geri alması zor sonuçlar. Sınır zaten yalnızca 2, yani
"önce birini kaldır" maliyeti tek dokunuş. Reddetme **öngörülebilir ve yıkıcı değil**.

### Sıra ve varsayılan

- Yeni seçim **sona** eklenir; ilk seçilen 1. sırada kalır.
- 1. kaldırılınca 2. **1'e yükselir** (ölçüldü).
- Sıra kullanıcıya iki yerden söyleniyor: yıldızın üstündeki **rozet (1/2)** ve
  liste başındaki açıklama satırı — *"…en fazla 2. **1** numaralı sınav küçük
  widget'ta görünür."*
- Hiç seçim yokken tarihi **en yakın** sınav varsayılan işaretlenir.
  `null` (hiç seçilmemiş) ile `[]` (bilerek hiçbiri) **farklı**: varsayılan
  yalnızca `null`'da devreye girer, kullanıcı hepsini kaldırırsa geri gelmez.
- Widget seçimi **sayaç görünürlüğünden bağımsız**: gizli bir sınav da
  yıldızlanabilir. Bilerek — ikisini bağlamak görünmez bir yan etki olurdu.

### Kontrast (yeni eklenen her şey)

| | Koyu | Açık |
|---|---|---|
| seçili yıldız (`--gold`) | 10.98 ✓ | 5.18 ✓ |
| seçilmemiş yıldız (`--text-4`) | 3.22 ✓ | 5.20 ✓ |
| sıra rozeti (`--on-gold` / `--gold`) | 11.17 ✓ | 5.18 ✓ |
| açıklama satırı (`--text-4`) | **3.39 ✗** | 4.93 ✓ |

> Açıklama satırındaki koyu mod 3.39'u **miras**: hemen üstündeki mevcut
> "Karta dokunarak sayacı göster ya da gizle" satırı da `--text-4` ile tam olarak
> 3.39 veriyor. Faz 4'teki alt açıklamayla aynı durum ve aynı gerekçe (§10).

### Depolama ve Faz 5 bağlantı noktası

`localStorage` → `xb_widget_exams`, `["<id>", "<id>"]`. Uygulamanın geri kalanı
Preferences kullanıyor; burada `localStorage` **bilerek** seçildi (widget köprüsü
senkron okuyabilmeli, tema tercihiyle aynı yerde dursun).

> **`syncToWidget(payload)` — `src/widget.js`.** Gövdesi **bilerek boş.** Faz 5'te
> yalnızca burası doldurulacak: App Group'a (`group.com.exambroapp.sinav`) JSON yaz
> + `WidgetCenter.shared.reloadAllTimelines()`. **Çağrı yerleri zaten bağlı**
> (`App.jsx`): widget seçimi değişince, sınav listesi değişince, tema değişince.
> Gönderilen `payload` §11'deki köprü sözleşmesiyle birebir aynı şekilde —
> `theme` **çözülmüş** değer (asla `"system"`), `exams` en fazla 2 eleman.
> Faz 5'te `App.jsx`'e dokunmak gerekmemeli.

### Kalan (Faz 5/6 ile birlikte)
- Rapor'a küçük bir **"Ana Ekran Widget'ı"** bilgi kartı (nasıl eklenir) — ⬜.
  Widget gerçekten var olmadan yazılması anlamsız, Faz 5'e bırakıldı.

---

## 13. Bilinen açık konular

| Konu | Durum |
|---|---|
| `color-mix` paritesi | ✅ WebKit 26.5'te doğrulandı. **Cihazda (gerçek iOS) kullanıcı ayrıca bakacak.** |
| `manifest.json` `#080810` | ✅ **karar: olduğu gibi kalıyor** (kullanıcı). Gerekçe §13'te |
| `--r-xl`, `--pink` gibi kullanılmayan token'lar | `--r-xl` önceden de kullanılmıyordu; zararsız |
| Lint uyarısı `'Icon' is defined but never used` | Önceden mevcut, `main`'de de var |
| **`.pressable` + `.themed` çakışması** | ✅ **çözüldü** — geçici `html.theme-anim` sınıfı (§8 Q). Ölçüm aşağıda |
| **W — lejant ↔ ısı haritası görsel dili** | ✅ **çözüldü** — A seçeneği, `anxLegend()` (§4) |
| **Rapor grafik 2: v=1 çubuğu "kayıt yok" kütüğünden KISA** | ✅ **çözüldü** (`61b6b5c`) — `v*5.5` → `8 + v*4.7`. v=1 artık 12.7px, kütük 8px'in üstünde; en yüksek çubuk 55px ile DEĞİŞMEDİ. Koyu modun render'ı bilerek değişti, piksel referansı yenilendi |
| **Overlay yüzeyi ↔ perde** | ✅ **çözüldü** — açık mod perdesi %35 → **%45** (kullanıcı kararı). Açık mod 2.43 → **3.68** (en kötü hal 3.36) ✓. Koyu mod 1.36 ile mevcut borç, dokunulmadı. Detay aşağıda |
| **PWA ikonunda eksik glif (tofu)** | ⬜ **açık — kapsam dışı bırakıldı.** `public/icon-{192,512}.png` ortasında boş kutu. Yalnızca **PWA kurulumunda** görünür; App Store iOS ikonu ve Android native ikonu ayrı dosyalardan geliyor, etkilenmiyor. Açık modla ilgisi yok. Düzeltme adımları aşağıda |
| FIXED liste kartının gizli hali | ⬜ `opacity:0.55` her iki modda da metni ~2.2:1'e düşürüyor; **koyu modda da aynı**, yani açık moda özgü regresyon değil. Yanında `IconEyeOff` yedeği var. Değiştirmek koyu modu da değiştirir → dokunulmadı |

### PWA ikonunda eksik glif (tofu) — açılmış, düzeltilmedi

**Ne:** `public/icon-512.png` (ve muhtemelen `icon-192.png`) ortasında amaçlanan
simge yerine **boş dikdörtgen** var — ikon üretilirken bir emoji/glif font'ta
bulunamamış ve "tofu" olarak render edilmiş.

**Nerede görünüyor:**
- PWA olarak kurulunca **ana ekran ikonu** (Android/Chrome "Ana ekrana ekle").
- `public/manifest.json` → `icons[]` bu iki dosyayı gösteriyor.
- Chrome'un kurulum/uygulama listesi görünümleri.

**Nerede görünmüyor — App Store sürümü etkilenmiyor:** iOS uygulama ikonu
Xcode target'ındaki `Assets.xcassets/AppIcon` içinden geliyor, bu PNG'lerden
**değil**. Android'in native ikonu da `android/app/src/main/res/mipmap-*`
altında, yine ayrı. Yani canlı mağaza sürümlerinde bu kusur görünmüyor;
etkisi yalnızca **PWA kurulumuyla** sınırlı.

**Düzeltmek için ne gerekiyor:**
1. Kaynak ikonu (`~/Desktop/app/exam-bro/exam-bro-icon.svg` ya da
   `exam-bro-icon-1024.png`) glif sorunu olmayan bir ortamda 512 ve 192'ye
   yeniden dışa aktar — ya da emojiyi **path'e çevir** (metin olarak bırakma;
   tofu tam olarak bundan çıkıyor).
2. `public/icon-192.png` ve `public/icon-512.png`'yi değiştir.
3. PWA'da ikon agresif önbellekleniyor: kurulu bir kopyada doğrularken
   uygulamayı kaldırıp yeniden kur.

**Açık modla ilgisi yok** — Faz 3 kontrol listesinin 22. maddesini gezerken
tesadüfen bulundu. Kapsam dışı bırakıldı (kullanıcı onayıyla), unutulmasın
diye buraya yazıldı.

### Overlay yüzeyi ↔ perde — ölçüm ve çözüm hesabı

`contrast-overlays.mjs`, grup 7. Kart/sheet yüzeyinin **perdeden** ayırt edilebilirliği:

| | Koyu | Açık |
|---|---|---|
| kart yüzeyi ↔ perde | 1.08 ✗ | **2.67 ✗** |
| kart 1px `--border`'ı ↔ perde | 1.36 ✗ | 1.84 ✗ |
| sheet yüzeyi ↔ perde | 1.11 ✗ | **2.67 ✗** |
| toast kenarlığı ↔ sayfa | 1.20 ✗ | 1.44 ✗ (gölge de ayırıyor) |

**Açık modda sınırı kenarlık değil yüzeyin kendisi taşıyor** — rapor çubuklarındaki
(§4) mantığın tersi. Sebep: perde orta gri (`#9e9ea0`); beyaz yüzey ondan uzak, açık
gri `--border` (`#d5d5e0`) ise yakın. Kenarlığı koyulaştırmak açık modda kartın
çerçevesini görünür kılar ama **koyu modu da değiştirir** (`--border` paylaşılıyor).

**Tek dokunuşluk çözüm perdenin alfası.** Açık modda `--overlay-modal` /
`--overlay-sheet` şu an **0.35**. Perde, arkasındaki içeriğe göre farklı koyulukta
çıkıyor; **en kötü hal perdenin beyaz bir kartın (255) üstüne düştüğü yer**, çünkü
orada perde en açık kalıyor. Beyaz yüzey ↔ perde için hesap:

| α | beyaz kart arkada | sayfa zemini arkada |
|---|---|---|
| **0.35 (şu an)** | `#a6a6a6` = **2.43 ✗** | `#9d9da0` = 2.70 ✗ |
| 0.40 | `#999999` = 2.85 ✗ | `#919194` = 3.14 ✓ |
| 0.42 | `#949494` = 3.03 ✓ | `#8c8c8f` = 3.35 ✓ |
| **0.45** | `#8c8c8c` = **3.36 ✓** | `#858587` = 3.68 ✓ |

Yani eşiği **her yerde** geçmek için **α ≥ 0.42**; pay bırakmak için **0.45**.
(Ölçülen 2.67, sayfa zemini arkadaki 2.70'in blur'la biraz karışmış hali —
en kötü hal olan 2.43 değil. Örnekleme noktası kartın üstündeki başlık şeridine
denk geliyor.)

### ✅ Karar: açık mod perdesi %45

%35 Faz 2'de verilmiş bir palet kararı olduğu için kendiliğinden değiştirilmedi,
**kullanıcıya soruldu** — pay bırakan seçenek olan **%45** seçildi. Uygulandı:

| | Önce (%35) | **Sonra (%45)** | Koyu (referans) |
|---|---|---|---|
| kart/sheet yüzeyi ↔ perde (ölçülen) | 2.67 ✗ | **3.68 ✓** | 1.08 / 1.11 ✗ |
| en kötü hal (beyaz kart arkada) | 2.43 ✗ | **3.36 ✓** | — |
| kenarlık ↔ perde | 1.84 ✗ | 2.53 ✗ | 1.36 / 1.35 ✗ |

**Koyu mod değişmedi** — ayrı token değeri, 14 ekranda piksel farkı 0.
%45 hâlâ koyu modun %72'sinin çok altında, "açık modda daha düşük opaklık"
niyeti korundu.

⚠️ **Sınırı kenarlık değil yüzeyin kendisi taşıyor.** `--border` (`#d5d5e0`)
perdeye beyazdan daha yakın olduğu için kenarlık satırı hâlâ 3'ün altında —
bu bir eksik değil, rapor çubuklarının (§4) **tersi** bir durum: orada dolgu
taşıyamadığı için kenarlık eklenmişti, burada yüzey zaten taşıyor. Kenarlığı
koyulaştırmak ayrıca **koyu modu da değiştirirdi** (`--border` paylaşılıyor).
`contrast-overlays.mjs` bu yüzden ikisinin **en iyisini** ayrı bir satırda
("→ … SINIRI") raporluyor.

### W — lejant, ısı haritası ve seçili buton aynı dili konuşuyor mu? ✅

**Karar: A uygulandı** (`97bcef8`) — açık modda lejant karesi `--anx-*` yerine bandın
**tam yoğunluk harita rengini** kullanıyor (`anxLegend()`). Sonuç, lejant ↔ bandın en
koyu karesi:

| Bant | önce (açık) | **sonra (açık)** | koyu (referans) |
|---|---|---|---|
| low | 2.09:1 | **1.00:1** | 1.22:1 |
| mid | 1.96:1 | **1.00:1** | 1.40:1 |
| high | 1.53:1 | **1.04:1** | 1.27:1 |

Koyu moddaki ilişkiden **daha da yakın** (koyu modda `--anx-*` bandın en koyu karesiyle
tam eşit değil, açık modda artık birebir). Metin taşıyan yüzeyler — seçili buton ve durum
etiketi — `--anx-*`'ta **kaldı**; onların kısıtı AA metin kontrastı.

Aşağıdaki analiz kararın gerekçesi olarak duruyor.

### W — analiz (karar öncesi)

Kaygı sekmesinde **üç** yüzey bant rengini gösteriyor: lejant kareleri, ısı haritası
kareleri, seçili skala butonu + durum etiketi. Hangi token'ı kullandıkları:

| Yüzey | Koyu | Açık |
|---|---|---|
| Lejant karesi | `--anx-*` (opak) | `--anx-*` (opak) |
| Seçili buton / durum etiketi | `anxColor()` yıkaması | `--anx-*` (opak) — grup 4 |
| Isı haritası karesi | `anxColor()` yıkaması | `anxColor()` yıkaması (koyulaştırılmış kanal) |

Lejantın **bandın en koyu karesine** uzaklığı (ölçüldü):

| Bant | Koyu | Açık |
|---|---|---|
| low | 1.22:1 (**pratikte aynı renk**) | 2.09:1 |
| mid | 1.40:1 | 1.96:1 |
| high | 1.27:1 | 1.53:1 |

**Koyu modda lejant karesi ≈ bandın tam yoğunluktaki karesi** — lejant "bu bandın günü
böyle görünür" diyor. **Açık modda bu bağ koptu:** lejant, kendi bandındaki *her* kareden
daha açık; hiçbir kareyle eşleşmiyor. Kopuşun sebebi ısı haritası rampasının (`759a1df`)
kendi koyulaştırılmış kanallarına taşınması — ki o zorunluydu (§4).

Yani açık modda lejant **seçili butonla** aynı dili konuşuyor ama **haritayla** konuşmuyor;
koyu modda tam tersi. Lejant `SectionLabel "son 35 gün"`in hemen üstünde ve haritayı
etiketliyor.

**Seçenekler:**
- **A (önerilen) — lejant haritayı izlesin.** Açık modda lejant karesi `--anx-*` yerine
  bandın tam yoğunluktaki harita rengini (`rgba(var(--anx-*-rgb),1)`) kullansın. Koyu
  moddaki ilişki aynen geri gelir; seçili buton/etiket `--anx-*`'ta kalır (metin
  kontrastı için zorunlu). Koyu mod değişmez.
- **B — harita lejantı izlesin.** Ölçüldü, **mümkün değil** (§4).
- **C — olduğu gibi bırak.** Lejant bandın *kimliğini* (yeşil/kahve/pembe) veriyor, birebir
  renk anahtarı değil; hue üç yüzeyde de korunuyor.

Karar verilmedi.

### `.pressable` + `.themed` — çözüldü (geçici sınıf)

Mekanizma ve gerekçe **§8 Q**'da. Doğrulama gerçek kod yolundan yapıldı: `preference`
`system`'e alınıp Playwright `emulateMedia({colorScheme})` ile `prefers-color-scheme`
değiştirildi → `theme.jsx`'in mq dinleyicisi → `applyTheme(t, true)` → `flashThemeAnim()`.
Sınıf elle eklenmedi. Betik: `tools/theme-check/theme-transition.mjs`.

| Ölçüm | Dingin hal | Mod değişimi anı (200ms) | Pencere kapanınca |
|---|---|---|---|
| `html.theme-anim` | `false` | `true` | `false` |
| `.pressable.themed` | `transform .15s, opacity .15s` | `… + background-color .18s, color .18s` | `transform .15s, opacity .15s` |
| `.themed` (`S.root`) | `background-color .18s, color .18s` | aynı | aynı |
| rakam kutusu (muaf) | `all` (geçiş yok) | **değişmedi** | değişmedi |

- **(a)** Üç buton ("Bugün Çalıştım", psikoloji köşesi, Pro teaser) mod değişiminde artık sıçramıyor.
- **(b)** Koyu modda tap animasyonu ve `doneToday` renk değişimi **değişmedi** — butona
  tıklandıktan sonra bile `transition` hâlâ yalnızca `transform/opacity`.
- **(c)** `BreathingPlayer` çalışırken (`kutu-nefesi`, ücretsiz) mod değiştirildi:
  çemberin `transition: transform 4s ease-in-out` değeri geçiş penceresinde **birebir aynı**
  kaldı, geri sayım 4 → 1 → 3 diye **adım sınırını geçerek** ilerlemeye devam etti.
- **(d)** Koyu mod piksel farkı **0** (home · exams · report · **breath**).
- `prefers-reduced-motion: reduce`: `data-theme` yine değişiyor, `.theme-anim` **hiç eklenmiyor**.

---

## 14. Faz 7 — son doğrulama turu ✅

Tarih: dalın son hâli. Her satır **koşularak** doğrulandı, hiçbiri "herhalde çalışıyor" değil.

| Kontrol | Sonuç |
|---|---|
| Faz 3 kontrol listesi (22 madde + 3 koşul) | ✅ eksik yok — §7'deki tablo geçerli |
| Kontrast çiftleri — **açık** | ✅ **63/63 AA** |
| Kontrast çiftleri — **koyu** | 58/73 · kalan 15 mevcut borç (çoğu `--text-4`), koyu mod referans |
| Koyu mod piksel farkı | ✅ **14 ekranda 0** |
| Temiz kurulum → koyu | ✅ cihaz açık modu tercih etse bile `data-theme=dark` |
| "Sistem" + cihaz modu değişimi | ✅ uygulama **ve widget birlikte** takip ediyor |
| Widget deep link | 🔶 **kısmi** — aşağıda |
| Archive + sürüm guard | ✅ **ARCHIVE SUCCEEDED**, app ↔ widget sürümleri eşit |
| build / lint / test | ✅ lint yalnızca önceden mevcut `'Icon'` uyarısı |
| Ham renk taraması | ✅ yalnızca veri renkleri, `rgba(var(--anx-*-rgb))` ve yorumlar |
| `WidgetTheme.swift` ↔ `index.css` | ✅ `--check` güncel |

### "Sistem" modunda widget takibi — ölçüm

Tercih `system`, cihaz koyudan açığa çevrildi (uygulama **çalışırken**):

| | cihaz KOYU | cihaz AÇIK |
|---|---|---|
| App Group payload `theme` | `"dark"` | `"light"` |
| payload `color` | `#ff4d94` (ham) | `#ae386b` (ink'lenmiş) |

Yani `prefers-color-scheme` → `theme.jsx` mq dinleyicisi → sync effect → App Group
yazma → `reloadAllTimelines()` zinciri uçtan uca çalışıyor.

### 🔶 Widget deep link — kısmi doğrulandı

**Doğrulanan:** `exambro://` şeması kayıtlı — iOS URL'i tanıyıp *"'Exam Bro' ile
Açılsın mı?"* diyaloğunu gösteriyor. Native yol (`AppDelegate` → `pendingURL`,
hem sıcak `open url` hem soğuk `launchOptions[.url]`) ve JS tarafı
(`consumePendingDeepLink()` → `setTab("exams")`) derleniyor ve bağlı.

**Doğrulanamayan:** sekmenin gerçekten değiştiği. `xcrun simctl openurl` iOS'ta
her zaman onay diyaloğu açıyor ve bu diyalog programatik kapatılamadı —
`simctl`de dokunma komutu yok, System Events ile sentetik tıklama da terminale
Accessibility izni verilmediği için Simulator'a geçmiyor. **Gerçek widget
dokunuşunda bu diyalog çıkmaz** (aynı uygulamanın kendi extension'ı).

> **Kalan tek elle adım:** widget'ı ana ekrana ekleyip bir kez dokun, Sınavlar
> sekmesinin açıldığını gözle doğrula. Aynı turda üç boyutun ana ekrandaki
> gerçek görünümüne de bakmakta fayda var — snapshot'lar View'ları birebir
> render ediyor ama sistemin çizdiği dış kabuğu (köşe yarıçapı, iOS 17
> `containerBackground` davranışı) kapsamıyor.
