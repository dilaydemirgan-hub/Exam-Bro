# Exam Bro

Sınav geri sayımı, günlük hedefler ve kaygı takibi. **App Store'da canlı** (1.3.0 / build 7,
`com.exambroapp.sinav`). `feature/light-mode-widgets` dalı 1.4.0 / build 8'e hazırlanıyor. Mevcut davranışı bozmak kabul edilemez.

Capacitor 8 + React 19 + Vite. Native: `ios/` (SPM, tek target `App`) ve `android/`.

## Komutlar

```bash
npm run dev      # vite dev sunucusu
npm run build    # dist/ üretir
npm run lint     # eslint
npx cap sync ios # dist + plugin'leri iOS'a senkronlar
```

`npm run lint` şu an 1 uyarı veriyor (`'Icon' is defined but never used`, `src/App.jsx`).
Bu **önceden mevcut** ve `main`'de de var — yeni bir regresyon değil.

## Mimari notlar

- Neredeyse tüm UI `src/App.jsx` içinde, stiller **inline `style={{}}`** olarak.
  Paylaşılan primitive'ler `src/ui.jsx`, ikonlar `src/icons.jsx` (hepsi `currentColor`).
- Renkler `src/index.css` içindeki CSS değişkenlerinden gelir. **Componentlerde ham hex yazma.**
- Sınav tarihleri `src/config/examDates.js` — kendini yenileyen sayaç mantığı. **Verisine dokunma.**
- Sınav renkleri (`FIXED`/`OSYM`/`customs`/`PSYCH_COLORS`) **veridir**, token değildir.
- Kalıcı veri: native'de Capacitor Preferences, web'de localStorage (`src/App.jsx` → `store`).
  **İstisna:** tema tercihi her zaman `localStorage` (`exambro_theme`) — FOUC engelleyici
  inline script senkron okumak zorunda.

## Açık mod / tema

Devam eden iş. Token listesi, `tint()` ve `ink()` sözleşmeleri, verilen kararlar ve kalan
iş listesi için **[`docs/LIGHT-MODE.md`](docs/LIGHT-MODE.md)** — tema veya renklerle ilgili
herhangi bir değişiklik yapmadan önce onu oku.

Özet kurallar:
- Varsayılan tema **koyu**; kayıtlı tercih yoksa `dark`.
- **Koyu modun görünümü değişmez.**
- `src/index.css`'teki açık blok `:root[data-theme="light"]` olarak ve koyu bloğun
  **altında** kalmalı (specificity gerekçesi dokümanda).

## Dokunulmayacaklar

- `src/App.jsx` içindeki `DEV_PREMIUM` ve RevenueCat API key'leri.
- `src/config/examDates.js` verisi.
- Sürüm / build numarası (sormadan artırma).
- Yeni bağımlılık (eklemeden önce sor).
