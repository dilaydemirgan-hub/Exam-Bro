// ── Ana ekran widget'ı: hangi sınavlar gösterilecek ──────────
// Faz 6'nın UYGULAMA İÇİ kısmı. Köprünün kendisi (App Group + WidgetCenter)
// Faz 5'te geliyor; aşağıdaki syncToWidget() onun TEK bağlanma noktası.
//
// Depolama: localStorage. Uygulamanın geri kalanı Capacitor Preferences
// kullanıyor (App.jsx → store); burada bilerek localStorage seçildi çünkü
// widget köprüsü bu değeri senkron okuyabilmeli ve tema tercihiyle (exambro_theme)
// aynı yerde durması tutarlı. docs/LIGHT-MODE.md §12.

import { registerPlugin, Capacitor } from "@capacitor/core";

/** Native tarafı: ios/App/App/WidgetBridge.swift (@objc(WidgetBridgePlugin)). */
const WidgetBridge = registerPlugin("WidgetBridge");

/**
 * ⚠️ `registerPlugin` proxy'si bu plugin'i GÖREMİYOR — ölçüldü.
 *
 * Capacitor `Capacitor.PluginHeaders` listesini bridge init sırasında, yani
 * SPM paketlerinden gelen plugin'lerden üretiyor. UYGULAMA TARGET'INDAKİ yerel
 * plugin ise `capacitorDidLoad()` içinde `bridge.registerPluginType(...)` ile
 * kaydediliyor ve bu, header üretimi için GEÇ kalıyor. Sonuç: native tarafta
 * plugin kayıtlı ama JS proxy'si "not implemented on ios" diye reddediyor.
 * Simülatörde doğrulandı — PluginHeaders çıktısında WidgetBridge yok:
 *   ["CapacitorHttp","Console","WebView","CapacitorCookies","SystemBars",
 *    "StatusBar","Keyboard","Preferences","Haptics","SplashScreen",
 *    "Purchases","LocalNotifications"]
 *
 * `Capacitor.nativePromise(plugin, method, options)` ise doğrudan NATIVE kayıt
 * defterine gidiyor, yani geç kaydedilmiş plugin'i buluyor. Proxy'yi yedek
 * olarak tutuyoruz: ileride plugin SPM paketine taşınırsa o yol da çalışır.
 */
function callBridge(method, options) {
  const cap = typeof window !== "undefined" ? window.Capacitor : undefined;
  if (typeof cap?.nativePromise === "function") {
    return cap.nativePromise("WidgetBridge", method, options);
  }
  return WidgetBridge[method](options);
}

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
 * Widget'a dokunulduysa bekleyen deep link'i alır ve TÜKETİR (bir kez okunur).
 * `exambro://exam/<id>` ya da `exambro://exams`.
 *
 * `@capacitor/app` **eklenmedi** — yeni bağımlılık gerektirmesin diye mevcut
 * köprü plugin'i kullanılıyor. Native tarafta AppDelegate URL'i yakalayıp
 * `WidgetBridgePlugin.pendingURL`'e yazıyor (hem sıcak `open url` hem soğuk
 * açılıştaki `launchOptions[.url]` yolu bağlı).
 *
 * @returns {Promise<string|null>} sınav id'si, ya da liste için "" , yoksa null
 */
export async function consumePendingDeepLink() {
  if (!Capacitor?.isNativePlatform?.()) return null;
  try {
    const { url } = await callBridge("consumePendingURL", {});
    if (typeof url !== "string" || !url.startsWith("exambro://")) return null;
    const m = url.match(/^exambro:\/\/exam\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : "";
  } catch { return null; }
}

let warned = false;

/**
 * Seçimi native köprüye gönderir: App Group'a yazılır + widget timeline'ları
 * yeniden yüklenir. Native tarafı `ios/App/App/WidgetBridge.swift`.
 *
 * ⚠️ **`@capacitor/preferences` bu iş için KULLANILAMAZ.** Kurulu sürümün
 * (8.0.1) kaynağına bakıldı: `Preferences.swift` her zaman
 * `UserDefaults.standard` kullanıyor ve plugin'in `group` seçeneği bir App
 * Group değil, yalnızca anahtar ÖNEKİ. Yani Preferences'la yazılan veri
 * paylaşılan konteynere girmiyor, widget okuyamıyor.
 *
 * `payload` şeması docs/LIGHT-MODE.md §11'deki köprü sözleşmesiyle aynı:
 *   { theme: "dark"|"light",             // ÇÖZÜLMÜŞ değer, asla "system"
 *     exams: [{ id, name, date, color }] // en fazla WIDGET_MAX
 *     updatedAt: ISO }
 *
 * Hata YUTULUR: widget target'ı henüz eklenmemişken ya da App Group hakkı
 * yokken uygulamanın çalışmaya devam etmesi gerekiyor. Teşhis için konsola
 * bir kez uyarı basılır.
 */
export async function syncToWidget(payload) {
  if (!Capacitor?.isNativePlatform?.()) return;   // web/PWA'da widget yok
  try {
    // Savunma amaçlı: köprüye "system" ASLA gitmemeli. Çağıran zaten çözülmüş
    // değeri veriyor (App.jsx → useTheme().theme), burada bir kez daha sabitliyoruz.
    const theme = payload?.theme === "light" ? "light" : "dark";
    await callBridge("sync", { json: JSON.stringify({ ...payload, theme }) });
  } catch (err) {
    if (!warned) {
      warned = true;
      console.warn("[widget] köprü çağrılamadı — widget güncellenmedi:", err?.message || err);
    }
  }
}
