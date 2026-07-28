# Açık Mod + Ana Ekran Widget'ları — Çalışma Dokümanı

> Bu dosya bağlam sigortasıdır. Oturum bittiğinde / `/clear` yapıldığında yeni bir
> oturum bunu okuyup kaldığı yerden devam edebilmeli. Her grup commit'inden sonra
> **güncelle**.

**Branch:** `feature/light-mode-widgets` (ana dal `master` değil, **`main`**)
**Proje:** `~/Exam-Bro` — Capacitor 8, React 19, Vite. Bundle id `com.exambroapp.sinav`.
**Uyarı:** Uygulama App Store'da canlı (1.3.0 / build 7). Koyu mod referans, dokunulmaz.

---

## 1. Durum

| Faz | Konu | Durum |
|---|---|---|
| 0 | Keşif | ✅ |
| 1 | Tema altyapısı (token'lar, `data-theme`, `useTheme`) | ✅ `567de95` |
| — | `fix:` kaygı etiketi zemini | ✅ `7687f47` |
| 2 | Açık mod paleti | ✅ `42f84dc` |
| 3 | Eksiksiz uygulama | 🔄 devam ediyor |
| 4 | Rapor sekmesine "Görünüm" seçici | ⬜ |
| 5 | iOS widget'ları | ⬜ (Xcode'da elle adım gerekiyor) |
| 6 | Uygulama içinden widget sınavı seçme | ⬜ |
| 7 | Doğrulama | ⬜ |

---

## 2. Kırmızı çizgiler

- **Koyu modun görünümü değişmeyecek.** Tek istisna `7687f47` (ayrı commit, geri alınabilir).
- **Varsayılan koyu kalacak** — `localStorage` kaydı yoksa `dark`.
- `src/config/examDates.js` **verisine dokunma**.
- `src/App.jsx:67` `DEV_PREMIUM` ve RevenueCat key'lerine **dokunma**.
- Sürüm/build numarasını sormadan artırma.
- Bağımlılık eklemeden önce sor. (Eklenen tek şey: `@capacitor/status-bar`, onaylı.)
- Her fazın sonunda dur, onay al.

---

## 3. Tema mekanizması

- **Depolama:** `localStorage`, anahtar `exambro_theme`, değerler `dark` | `light` | `system`.
  Capacitor Preferences **değil** — FOUC engelleyici inline script senkron olmak zorunda.
  Diğer tüm uygulama verisi eskisi gibi Preferences'ta.
- **FOUC:** `index.html` içindeki inline `<script>` React mount olmadan `data-theme` yazar.
  `src/theme.jsx` ile **aynı** mantığı taşır; ikisi ayrışırsa açılışta renk flaşı olur.
- **React:** `src/theme.jsx` → `ThemeProvider` / `useTheme()`.
  `useTheme()` → `{ theme, preference, setPreference }`.
  `theme` çözülmüş değer (`dark`|`light`), `preference` kullanıcı seçimi (`system` olabilir).
- `system` seçiliyken `prefers-color-scheme` dinlenir, anında değişir.

---

## 4. Token sistemi — `src/index.css`

Blok yapısı:

```
:root, :root[data-theme="dark"] { … }   /* koyu = varsayılan */
:root[data-theme="light"]       { … }   /* SONRA gelir, (0,2,0) */
```

### ⚠️ Specificity — bozmayın
Koyu blok iki seçiciye açılır: `:root` (0,1,0) ve `:root[data-theme="dark"]` (0,2,0).
Açık blok **`:root[data-theme="light"]`** yazılmalı (0,2,0) ve koyu bloğun **altında**
durmalı. Sadece `[data-theme="light"]` yazılırsa (0,1,0) olur, bare `:root` ile eşitlenir
ve yalnızca kaynak sırasına bel bağlanır — kırılgan.

### Sayılar
103 koyu token / 92 açık override. Devralınan 11: token referanslı 5 gradyan
(`--grad-brand`, `--grad-brand-135`, `--grad-green`, `--grad-green-bar`, `--grad-gold`
— accent'lerle kendiliğinden koyulaşıyor) + 4 radius + 2 font.

### `color-scheme`
Token bloğunun içinde, tema ile birlikte değişir. **Native date/time picker ve
scrollbar buna bağlı** — ayrı bir yere taşımayın.

---

## 5. `tint()` — veri renklerinin yüzey üstü tonu

Sınav (`FIXED`/`OSYM`/`customs`) ve `PSYCH_COLORS` renkleri **veridir**, token değildir,
iki modda da aynıdır. Soluk tonları `tint()` üretir:

```js
tint(color, token, fallbackAlpha, fallbackColor)
// color-mix destekliyse: color-mix(in srgb, ${color} var(${token}), transparent)
// desteklemiyorsa (iOS 15–16.1): `${color}${fallbackAlpha}` ya da fallbackColor
```

`color-mix(… , transparent)` premultiplied karıştığı için sonuç *alfası X olan renk*
ile **birebir** aynıdır. WebKit 26.5'te 6 çift PNG karşılaştırmasıyla doğrulandı.

### Seviyeler ve iki moddaki yüzdeleri

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

## 6. `ink()` sözleşmesi — veri renklerinin açık moddaki METİN tonu

Koyu zemin için seçilmiş parlak veri renkleri açık zeminde okunmaz: sekizinin de
beyaz üstündeki kontrastı **1.66–3.88:1** (AA eşiği 4.5). `ink()` bunları **yalnızca
açık modda** ve **yalnızca metin/anlamlı grafik** olarak kullanıldıkları yerde
AA'yı geçen **en açık** tona indirir. **Veri dizilerine dokunulmaz.**

```js
ink(color, theme)            // hedef 4.5:1  — normal metin
ink(color, theme, "large")   // hedef 3:1    — büyük metin ve anlamlı grafik
// theme !== "light" → color aynen döner
```

### M — Referans zemin
Tek sabit referans; **aynı sınav rengi her ekranda aynı tonda** görünür.
Referans, rengin karşılaşabileceği **en KOYU** zemin: `{--bg, --surface-2,
tint(c,weak) over --bg, tint(c,soft) over --surface-2}` kümesinin en koyusu.

> En **açık** yüzeye (beyaz) göre hesaplamak yanlış sonuç verir: dark metin için
> daha açık zemin *daha kolay*dır, o yüzden beyaza göre çözülen ton sayfada kalır.
> Ölçüldü: beyaza göre → **8/8 renk sayfada kalıyor** (4.03–4.08). En koyuya göre →
> 0/8 kalıyor. Bu yüzden "en açık yüzey" değil "en koyu yüzey" alındı.

### N — Büyük metin istisnası
WCAG large = **≥24px** normal veya **≥18.66px bold**. `large` varyantı markayı
belirgin şekilde koruyor (TYT %74 yerine %99'da kalıyor).

### P — Önbellek
Anahtar `${theme}|${size}|${color}` — tema veya boyut değişince bayat değer dönmez.

### Hesaplanmış değerler (referans; kod runtime'da üretir)

| Veri rengi | Kullanım | `ink()` 4.5:1 | `ink(…,"large")` 3:1 |
|---|---|---|---|
| `#10d99e` | LGS, KPSS×4, nefes kat. | `#10775e` (%51) | `#109773` (%67) |
| `#9d5cff` | TYT, kaygı kat. | `#7848c4` (%74) | `#9c5bfd` (%99) |
| `#ff4d94` | AYT, sınav günü kat. | `#ae386b` (%66) | `#e04584` (%87) |
| `#ff9736` | ALES×3 | `#935a2a` (%55) | `#be732f` (%73) |
| `#5c9bff` | DGS, mükemmeliyetçilik | `#3f66a9` (%62) | `#4f83d8` (%83) |
| `#b07aff` | MEB-AGS | `#7754ae` (%64.5) | `#996bde` (%85.5) |
| `#ffbe0b` | kullanıcı sınavları | `#866614` (%49.5) | `#ab8111` (%65) |
| `#ffb703` | erteleme kat. | `#89640f` (%50.5) | `#ae7e0c` (%66) |

### Kullanım yerlerinin kovalara dağılımı (N + O)

**Kova 1 — `ink(c, theme)` · normal metin · 4.5:1**

| Yer | Boyut | Neden |
|---|---|---|
| `CountCard` "Sınav günü! Başarılar 🍀" | 18px/700 | 18 < 18.66 → large değil |
| `ExamsTab` FIXED liste sınav adı | 16px/600 | |
| `ExamsTab` FIXED "{n}g" | 14px | |
| `ExamsTab` FIXED "bugün! 🍀" | 13px/700 | |
| `ExamsTab` ÖSYM sınav adı | 15px/600 | |
| `ExamsTab` ÖSYM "{n}g kaldı" | 12px | |
| `ExamsTab` customs sınav adı | 15px/600 | |
| `ExamsTab` customs "{n}g" | 14px | |

**Kova 2 — `ink(c, theme, "large")` · büyük metin + anlamlı grafik · 3:1**

| Yer | Boyut | Neden |
|---|---|---|
| `CountCard` sınav başlığı | 20px/700 | ≥18.66 bold |
| `CountCard` geri sayım rakamları | 22px/700 | ≥18.66 bold |
| `CountCard` sol kenar şeridi | 3px | anlamlı grafik (sınav kimliği) |
| `PsychologyHub` kategori/öğe chevron ikonu | 18px | anlamlı grafik (gezinme) |

**Kova 3 — `ink()` YOK · metin değil · olduğu gibi kalır**

| Yer | Neden |
|---|---|
| `CountCard` rakam kutusu zemini `tint(c,soft)` | zemin |
| `CountCard` rakam kutusu kenarlığı `tint(c,line)` | dekoratif, metin rengiyle yedekli |
| `ExamsTab` kart yıkaması `tint(c,weak)` + kenarlık `tint(c,edge)` | zemin/dekoratif |
| `PsychologyHub` kart gradyanı + kenarlığı | zemin/dekoratif |
| İlerleme çubuğu dolgusu, ısı haritası kareleri, lejant kareleri | token kullanıyor, veri rengi değil |

---

## 7. Faz 3 uygulama kuralları

### Q — `transition`
`*` seçicisine **koyma**. Sadece yüzey/konteyner sınıflarına, sadece
`background-color` ve `color` (150–200ms). **Muaf:** `BreathCircle`,
ilerleme çubukları, "Süpersin!" overlay'i, geri sayım rakamları.
`prefers-reduced-motion: reduce` → tamamen kapalı.

### R — `StatusBar`
Plugin `.d.ts`'inden **teyit edildi** (ezberden yazma):

| Enum | Anlamı | Ne zaman |
|---|---|---|
| `Style.Dark` | *koyu zemin için açık yazı* | tema `dark` |
| `Style.Light` | *açık zemin için koyu yazı* | tema `light` |
| `Style.Default` | cihaz görünümünü izler | **kullanma** — uygulama içi seçimi ezer |

Sadece tema değişiminde değil, **uygulama ön plana geldiğinde de** (resume /
`appStateChange`) tekrar çağır — iOS bazen sıfırlıyor.

### S — Test edilecek geçiş senaryoları
1. **Paywall bottom sheet AÇIKKEN** mod değiştir → bozulmamalı.
2. **BreathingPlayer ÇALIŞIRKEN** mod değiştir → sayaç/animasyon bozulmamalı.

### T — Commit grupları (her grup ayrı commit + koyu/açık ekran görüntüsü)
1. ⬜ kök + nav + header
2. ⬜ ana sayfa + geri sayım (`ink()` burada devreye giriyor)
3. ⬜ sınavlar (liste / ÖSYM / manuel + date picker)
4. ⬜ hedefler + kaygı
5. ⬜ rapor
6. ⬜ psikoloji hub + nefes + program
7. ⬜ paywall + overlay'ler + toast + onay sheet

### Faz 3 kontrol listesi
`~/Downloads/exambro-acik-mod-widget-komutu.md` içindeki liste geçerli. Bu projede
**N/A** olanlar:
- Scrollbar rengi → `::-webkit-scrollbar { width: 0 }`, tamamen gizli.
- Hata ekranı → yok.
- Skeleton / spinner → yok (yükleme durumu sadece `Splash`).

Ayrıca:
- `<meta name="theme-color">` tema ile **dinamik** güncellenecek.
- `public/manifest.json` içindeki `#080810` **şimdilik dokunulmuyor** (PWA/Android),
  Faz 3 sonunda konuşulacak.
- `::selection` rengi tanımlanacak (şu an yok).
- `--shadow-card` `Card` bileşenine bağlanacak (token hazır, koyuda `none`).

---

## 8. Test / doğrulama araçları

Playwright + WebKit **kullanıcının reposuna değil**, scratchpad'e kuruldu.
Ekran görüntüsü ve kontrast betikleri:
`/private/tmp/claude-501/-Users-dilaydemirgan-Desktop-app-exam-bro/<oturum>/scratchpad/`
(`contrast.mjs`, `final.mjs`, `shot.mjs`, `light.mjs`, `mixtest.mjs`, `blocks.mjs`).
Oturum değişirse yeniden kurulmaları gerekir — `npm i playwright && npx playwright install webkit`.

Sürekli doğrulanması gerekenler:
- `npm run build` temiz.
- `npm run lint` → 1 uyarı (`'Icon' is defined but never used`) **önceden mevcut**, `main`'de de var.
- Ham renk taraması: `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/` →
  yalnızca **veri renkleri** (FIXED/OSYM/`c:"#ffbe0b"`/`PSYCH_COLORS`) ve
  `rgba(var(--anx-*-rgb), …)` kalmalı.
- 56 metin/zemin çiftinin tamamı AA.

---

## 9. Faz 5 için önceden bilinenler (henüz yapılmadı)

- `ios/App/App.xcodeproj` — **tek target: `App`**. Widget extension yok.
- **`.entitlements` dosyası hiç yok** → App Group sıfırdan kurulacak.
- Deployment target **iOS 15.0**. SPM (CocoaPods değil): `ios/App/CapApp-SPM/Package.swift`.
- Xcode'da elle yapılacak adımlar **uydurulmayacak**; emin olunmayan yerde durulup sorulacak.
