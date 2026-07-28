# Açık Mod + Ana Ekran Widget'ları — Devir Teslim Dokümanı

> **Bu dosya bağlam sigortasıdır.** Yeni bir oturum bunu okuyup kaldığı yerden devam
> edebilmeli. Her grup commit'inden sonra **güncelle**.
>
> Okuma sırası: §1 durum → §2 kırmızı çizgiler → §7 kalan iş → gerekirse detay bölümleri.

**Branch:** `feature/light-mode-widgets` — ana dal `master` **değil**, **`main`**.
**Proje:** `~/Exam-Bro` — Capacitor 8, React 19, Vite. Bundle id `com.exambroapp.sinav`.
**Uyarı:** Uygulama App Store'da canlı (1.3.0 / build 7). **Koyu mod referans, dokunulmaz.**

---

## 1. Durum

| Faz | Konu | Durum |
|---|---|---|
| 0 | Keşif | ✅ |
| 1 | Tema altyapısı (token'lar, `data-theme`, `useTheme`) | ✅ `567de95` |
| — | `fix:` kaygı etiketi zemini | ✅ `7687f47` |
| 2 | Açık mod paleti | ✅ `42f84dc` |
| 3 | Eksiksiz uygulama | 🔄 **7 gruptan 3'ü bitti** |
| 4 | Rapor sekmesine "Görünüm" seçici | ⬜ başlamadı |
| 5 | iOS widget'ları | ⬜ başlamadı (Xcode'da elle adım gerekiyor) |
| 6 | Uygulama içinden widget sınavı seçme | ⬜ başlamadı |
| 7 | Doğrulama | ⬜ başlamadı |

Commit geçmişi (yeniden eskiye): `acdd868` faz3-3 · `edd7ec8` chore · `da1470f` docs ·
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
| `--text-4` | `#62627e` | `#6b6b82` |
| `--violet` | `#9d5cff` | `#7c3aed` |
| `--pink` | `#ff4d94` | `#db2777` |
| `--green` | `#10d99e` | `#0d805b` |
| `--gold` | `#ffbe0b` | `#9c5f08` |
| `--orange` | `#ff9736` | `#a8560e` |
| `--blue` | `#5c9bff` | `#2563eb` |
| `--amber` | `#ffb703` | `#976801` |
| `--on-green` / `--on-gold` | `#04120c` / `#1a1200` | `#fff` / `#fff` |
| `--overlay-sheet` | `rgba(0,0,0,.7)` | `rgba(0,0,0,.35)` |
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
| `PsychologyHub` kategori/öğe chevron ikonu | ~966/975 | 18px | anlamlı grafik (gezinme) | ⬜ |

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
| `#ff9736` | ALES×3 | `#955b2a` | `#be732f` |
| `#5c9bff` | DGS, mükemmeliyetçilik | `#3f66a9` | `#4f83d7` |
| `#b07aff` | MEB-AGS | `#7754ae` | `#996bde` |
| `#ffbe0b` | kullanıcı sınavları | `#856514` | `#aa8011` |
| `#ffb703` | erteleme kat. | `#886410` | `#ae7e0c` |

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
> `Card` (zaten `.themed`), ya da `.pressable` butonlar. `.pressable` üzerinde `.themed`
> **etkisiz** — aşağıdaki §13 maddesine bak. FIXED liste kartları ise kendi inline
> `transition:"all 0.2s"`'i ile zaten geçiş yapıyor; oraya `.themed` eklemek ölü kod olurdu.

### Kalan gruplar (her biri ayrı commit + koyu/açık ekran görüntüsü)

Not: aşağıdaki satır numaraları grup 3'ten sonra ~10 satır kaymıştır.

| # | Grup | Kapsam (`src/App.jsx`) | Yapılacaklar |
|---|---|---|---|
| 4 | **Hedefler + Kaygı** | `GoalsTab` ~1390–1461, `AnxietyTab` ~1462–1532 | Kaygı ısı haritasının açık modda okunurluğu (§4), 1–10 skalası seçili/seçilmemiş halleri, hedef checkbox'ı, öneri çipleri, boş durumlar |
| 5 | **Rapor** | `ReportTab` ~1533–1624, `Stat` ~1657, `SettingsRow` ~1625, `ToggleSwitch` ~1640 | İki çubuk grafik (`--track`, `--grad-green-bar`), istatistik kutuları, ayarlar kartı, toggle |
| 6 | **Psikoloji hub + nefes + program** | `PsychologyHub` 895–977, `HubBar` 978, `LessonReader` 993–1027, `BreathingPlayer` 1028–1107, `BreathCircle` 1108–1132, `ProgramView` 1133–1185 | Chevron ikonuna `ink(…, "large")`; `--grad-breath` / `--grad-closing` açık karşılıkları zaten tanımlı, uygulamada doğrula; **BreathCircle transition'dan MUAF** |
| 7 | **Paywall + overlay'ler** | `Paywall` 1186–1238, `ui.jsx` toast + `ConfirmSheet` | `--overlay-sheet` / `--overlay-modal` (%35), `--surface-modal`, `--handle`, `--shadow-toast` |

### Grup sonrası her seferinde
1. `npm run build` + `npm run lint` + `npm test`
2. Koyu mod piksel farkı (§8) → **0 piksel** olmalı
3. Koyu + açık ekran görüntüsü
4. **Bu dosyayı güncelle**, ayrı commit

### Faz 3 sonunda ayrıca
- **S — geçiş senaryoları:** ① Paywall bottom sheet **açıkken** mod değiştir ② `BreathingPlayer`
  **çalışırken** mod değiştir. İkisi de bozulmamalı.
- Kontrol listesini (`~/Downloads/exambro-acik-mod-widget-komutu.md`, Faz 3) madde madde geç.
- `public/manifest.json`'daki `#080810` **hâlâ dokunulmadı** (PWA/Android) — Faz 3 sonunda
  kullanıcıyla konuşulacak.
- Koyu zemin için yapılmış PNG/görsel açık modda kötü duruyorsa bildir
  (`src/assets/hero.png`, `public/icon-*.png`).

### Bu projede **N/A** olan kontrol listesi maddeleri
- **Scrollbar rengi** → `::-webkit-scrollbar { width: 0 }`, tamamen gizli.
- **Hata ekranı** → yok.
- **Skeleton / spinner** → yok (yükleme durumu sadece `Splash`).
- **SVG ikonlar** → `src/icons.jsx` zaten tamamen `currentColor`, düzeltilecek bir şey yok.

---

## 8. Q / R — uygulama kuralları

### Q — `transition` kapsamı
`.themed` sınıfı `src/index.css`'te:

```css
.themed { transition: background-color 180ms ease, color 180ms ease; }
```

`*` seçicisine **konmadı**; elle ekleniyor. `prefers-reduced-motion: reduce` mevcut global
blokta `transition-duration: 0.01ms !important` ile zaten kapatıyor.

**Sınıfı ALAN öğeler:** `S.root`, `S.header`, `S.nav`, `Card` (`ui.jsx`), `CountCard` kökü,
ana sayfadaki motivasyon kartı, "Bugün Çalıştım" butonu, psikoloji köşesi kartı, Pro teaser,
`ExamsTab` manuel ekleme ekranındaki 3 input.

> ⚠️ Bunlardan `.pressable` de taşıyanlarda (`"Bugün Çalıştım"`, psikoloji köşesi, Pro
> teaser) `.themed` **şu an etkisiz** — sebebi ve kararı §13'te.

**Sınıftan MUAF (bilerek — kendi transform/width animasyonları var, tema geçişi eklenirse
mod değişiminde sürüklenme görünüyor):**
- `BreathCircle` (`transform` + `transition: transform Ns`)
- `ProgressBar` ve rapor çubukları (`width` / `height` animasyonlu)
- `S.boom` — "Süpersin!" overlay'i (`boomFade` animasyonu)
- `CountCard` rakam kutuları

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

### Koyu mod regresyon testi (piksel farkı) — **en önemli güvenlik ağı**

Playwright + WebKit **kullanıcının reposuna değil**, scratchpad'e kuruldu. Oturum
değişirse yeniden kurulmalı:

```bash
cd <scratchpad>
echo '{"name":"scratch","private":true,"type":"module"}' > package.json
npm install playwright pixelmatch pngjs
npx playwright install webkit
```

Betikler scratchpad'de: `cap.mjs` (ekran görüntüsü), `diff.mjs` (piksel farkı),
`states.mjs` (etkileşimli durumlar), `contrast.mjs` (WCAG hesabı), `final.mjs`
(56 çiftlik kontrast tablosu), `mixtest.mjs` (color-mix paritesi),
`blocks.mjs` (koyu/açık token karşılaştırması).
**Oturum değişirse bunlar da kaybolur** — grup 3'te `cap.mjs`/`diff.mjs`/`states.mjs`
sıfırdan yeniden yazıldı, mantıkları aşağıda. (WebKit binary'si
`~/Library/Caches/ms-playwright` altında kalıyor, yeniden indirilmedi.)

`cap.mjs`, onboarding'i atlamak için `addInitScript` ile tohum veri yazıyor:
`xb_grade="12"` → `hidden` varsayılanı `["LGS"]`, yani FIXED listede hem **görünür**
(TYT/AYT) hem **gizli** (LGS) kart aynı ekranda; ayrıca bir kullanıcı sınavı
(`xb_customs`). Böylece `ExamsTab`'in üç bölümü de tek görüntüde yakalanıyor.

Akış:

```bash
# 1) Referans: değişiklikleri stash'le, Faz 2 durumunu derle, çek
cd ~/Exam-Bro && git stash -q && npm run build
cd <scratchpad>
node cap.mjs dark base-home.png   full
node cap.mjs dark base-exams.png  tab:Sınavlar full
node cap.mjs dark base-goals.png  tab:Hedefler full
node cap.mjs dark base-anx.png    tab:Kaygı    full
node cap.mjs dark base-report.png tab:Rapor    full

# 2) Değişiklikleri geri al, derle, tekrar çek (new-*.png)
cd ~/Exam-Bro && git stash pop -q && npm run build

# 3) Karşılaştır — sonuç 0 piksel olmalı
node diff.mjs '[["base-home.png","new-home.png","home"], …]'
```

Grup 3'te çekilen 7 ekran (hepsi **0 piksel**): `home` · `exams` · `osym` · `manual` ·
`goals` · `anx` · `report`. Sınavlar sekmesinin alt görünümleri `btn:` adımıyla açılıyor:
`node cap.mjs dark new-osym.png tab:Sınavlar "btn:ÖSYM Takvimi" full`

`cap.mjs` kullanımı: `node cap.mjs <dark|light> <çıktı.png> [adım…]`
adımlar: `tab:Rapor` · `btn:Metin` · `radio:8` · `wait:500` · `full` (tam sayfa).
Sunucu: `npx vite preview --port 4173 --strictPort` (arka planda).

#### ⚠️ `pg.clock.setFixedTime` ŞART
`cap.mjs` sayfayı açmadan önce saati donduruyor:

```js
await pg.clock.setFixedTime(new Date("2026-07-28T09:00:00Z"));
```

Yoksa **geri sayımın saniyeleri sahte fark üretiyor**. İlk denemede ana sayfada 1488
piksel (%0.08) fark çıktı ve gerçek bir regresyon sanıldı; diff görüntüsüne bakınca
farkın yalnızca DK/SN hanelerinde olduğu görüldü. Saat dondurulunca 0'a indi.

### Sürekli doğrulanacaklar
- `npm run build` temiz.
- `npm run lint` → **1 uyarı** (`'Icon' is defined but never used`, `App.jsx`) —
  **önceden mevcut**, `main`'de de var, regresyon değil.
- Ham renk taraması:
  `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/ --include="*.jsx" --include="*.js" --include="*.css"`
  → yalnızca **veri renkleri** (`FIXED`/`OSYM`/`c:"#ffbe0b"`/`PSYCH_COLORS`) ve
  `rgba(var(--anx-*-rgb), …)` kalmalı. `src/ink.js` ve `src/ink.test.mjs` içindeki
  hex'ler de meşru (mürekkep sabiti ve test verisi).
- 56 metin/zemin çiftinin tamamı AA (Faz 7'de tabloyu yeniden üret).
- Yeni kurulum: `localStorage` temizle → uygulama **koyu** açılmalı.

---

## 10. Faz 4 — Rapor sekmesine "Görünüm" seçici (başlamadı)

Verilmiş kararlar:
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

### ⚠️ Xcode'da elle yapılacak adımlar
Target ekleme, App Group capability, signing — bunlar **uydurulmayacak**. Emin olunmayan
her noktada **durulup kullanıcıya sorulacak**. Kullanıcı Xcode'u kendi açacak; adımlar
"hangi ekran, hangi buton" düzeyinde yazılacak.

---

## 12. Faz 6 — Uygulama içinden widget sınavı seçme (başlamadı)

- Sınav listesinde her satıra "widget'ta göster" işaretleyicisi (yıldız ya da checkbox).
- **En fazla 2 sınav.** 3.'yü seçmeye çalışınca ne olacağı (nazik uyarı mı, en eskiyi
  otomatik bırakma mı) **gerekçelendirilerek seçilecek** — henüz karar verilmedi.
- Seçim `localStorage`'da **ve** App Group'ta saklanır.
- **Sıra önemli:** 1. seçilen sınav Small widget'ta görünen olur; sıralama kullanıcıya gösterilir.
- Hiç seçim yoksa ve takip edilen sınav varsa, tarihi **en yakın** olan varsayılan işaretlenir.
- Rapor'daki tema seçicinin yanına ya da Ayarlar'a küçük bir **"Ana Ekran Widget'ı"**
  bilgi kartı: nasıl ekleneceğini 1-2 cümleyle anlatır.

---

## 13. Bilinen açık konular

| Konu | Durum |
|---|---|
| `color-mix` paritesi | ✅ WebKit 26.5'te doğrulandı. **Cihazda (gerçek iOS) kullanıcı ayrıca bakacak.** |
| `manifest.json` `#080810` | ⬜ dokunulmadı, Faz 3 sonunda konuşulacak |
| `--r-xl`, `--pink` gibi kullanılmayan token'lar | `--r-xl` önceden de kullanılmıyordu; zararsız |
| Lint uyarısı `'Icon' is defined but never used` | Önceden mevcut, `main`'de de var |
| **`.pressable` + `.themed` çakışması** | ⬜ **karar kullanıcıda** — aşağıya bak |
| FIXED liste kartının gizli hali | ⬜ `opacity:0.55` her iki modda da metni ~2.2:1'e düşürüyor; **koyu modda da aynı**, yani açık moda özgü regresyon değil. Yanında `IconEyeOff` yedeği var. Değiştirmek koyu modu da değiştirir → dokunulmadı |

### `.pressable` + `.themed` — tema geçişi düşüyor

`index.css`'te iki sınıf da `transition` kısayolunu yazıyor ve **ikisi de (0,1,0)
specificity**. `.themed` 338. satırda, `.pressable` 360. satırda → kaynak sırası gereği
`.pressable` kazanıyor ve `.themed`'in geçişini tamamen eziyor. WebKit'te ölçüldü:

```
S.root (.themed)                     → background-color 0.18s, color 0.18s
"Bugün Çalıştım" (.pressable .themed)→ transform 0.15s, opacity 0.15s   ← tema geçişi YOK
```

Etkilenenler grup 1–2'den geliyor: "Bugün Çalıştım", psikoloji köşesi kartı, Pro teaser.
**Statik görünüm etkilenmiyor** (piksel farkı 0), yalnızca mod değiştirirken bu üç buton
animasyon yerine anında sıçrıyor.

**Grup 3'te bilerek düzeltilmedi.** Tek satırlık düzeltmesi var:

```css
.pressable.themed { transition: transform .15s ease, opacity .15s ease,
                                background-color 180ms ease, color 180ms ease; }
```

Ama bu, arka planı **duruma göre değişen** butonlarda (`"Bugün Çalıştım"` →
`doneToday` olunca `--grad-green` → `--green-soft`) koyu modda da 180ms'lik bir renk
geçişi başlatır. Yani **koyu modun davranışı değişir** — §2'deki kırmızı çizgi.
Bu yüzden ölü `.themed` eklemek yerine durum kullanıcıya bırakıldı; Faz 3 sonunda
"geçiş senaryoları" maddesiyle birlikte karara bağlanacak.
