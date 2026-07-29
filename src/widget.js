// ── Ana ekran widget'ı: hangi sınavlar gösterilecek ──────────
// Faz 6'nın UYGULAMA İÇİ kısmı. Köprünün kendisi (App Group + WidgetCenter)
// Faz 5'te geliyor; aşağıdaki syncToWidget() onun TEK bağlanma noktası.
//
// Depolama: localStorage. Uygulamanın geri kalanı Capacitor Preferences
// kullanıyor (App.jsx → store); burada bilerek localStorage seçildi çünkü
// widget köprüsü bu değeri senkron okuyabilmeli ve tema tercihiyle (exambro_theme)
// aynı yerde durması tutarlı. docs/LIGHT-MODE.md §12.

export const WIDGET_KEY = "xb_widget_exams";
/** Small/Medium widget iki sınavdan fazlasını okunur biçimde gösteremiyor. */
export const WIDGET_MAX = 2;

/**
 * @returns {string[]|null} id dizisi, ya da **null** = kullanıcı HİÇ seçim
 * yapmadı. null ile boş dizi farklıdır: null'da varsayılan işaretlenir,
 * boş dizi "bilerek hiçbiri" demektir ve öylece bırakılır.
 */
export function readWidgetIds() {
  try {
    const raw = localStorage.getItem(WIDGET_KEY);
    if (raw === null) return null;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter(x => typeof x === "string").slice(0, WIDGET_MAX) : null;
  } catch { return null; }
}

export function writeWidgetIds(ids) {
  try { localStorage.setItem(WIDGET_KEY, JSON.stringify(ids.slice(0, WIDGET_MAX))); }
  catch { /* kota dolu / özel mod — sessiz geç, seçim yine de bu oturumda çalışır */ }
}

/**
 * Hiç seçim yokken varsayılan: tarihi EN YAKIN olan sınav.
 * @param {{id:string,date:string|Date}[]} exams takip edilen sınavlar
 * @returns {string[]} tek elemanlı dizi, sınav yoksa boş
 */
export function defaultWidgetIds(exams) {
  if (!exams?.length) return [];
  const soonest = exams.reduce((a, b) =>
    new Date(a.date) <= new Date(b.date) ? a : b);
  return [soonest.id];
}

/**
 * ⚠️ FAZ 5 BAĞLANTI NOKTASI — gövdesi BİLEREK boş.
 *
 * Buraya gelecek olan:
 *   1. App Group'a (`group.com.exambroapp.sinav`) `payload`'ı JSON yaz.
 *   2. `WidgetCenter.shared.reloadAllTimelines()` çağır.
 *
 * `payload` şeması docs/LIGHT-MODE.md §11'deki köprü sözleşmesiyle aynı:
 *   { theme: "dark"|"light",            // ÇÖZÜLMÜŞ değer, asla "system"
 *     exams: [{ id, name, date, color }] // en fazla WIDGET_MAX
 *     updatedAt: ISO }
 *
 * Çağrı yerleri ZATEN bağlı (App.jsx): widget seçimi değişince, sınav
 * eklenince/silinince ve tema değişince. Faz 5'te yalnızca bu gövdeyi
 * doldurmak yeterli olmalı — App.jsx'e dokunmaya gerek kalmamalı.
 */
export function syncToWidget(_payload) {
  // Faz 5'te doldurulacak.
}
