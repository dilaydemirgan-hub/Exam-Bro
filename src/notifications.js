// ── Günlük bildirim planlayıcısı ─────────────────────────────
// İlke: günde EN FAZLA 1 bildirim, sakin ton, kendini tekrar etmeyen içerik.
// 14 gün ileriye dönük planlanır; uygulama her açıldığında güncel geri sayım
// verisiyle yeniden kurulur (böylece "X gün kaldı" her zaman doğrudur).
//
// İçerik türleri haftalık bir desenle dönüşümlü kullanılır:
//   geri sayım → motivasyon → nazik hatırlatma → motivasyon → seri → ...
// Mesaj seçimi epoch-gün indeksine bağlı deterministik rotasyondur;
// aynı mesaj ~3 hafta içinde tekrar görünmez.

import { LocalNotifications } from "@capacitor/local-notifications";

export const NOTIF_HOUR = 20;      // 20:00 — akşam çalışma dilimi
export const NOTIF_DAYS = 14;      // ileriye dönük planlanan gün sayısı
const ID_BASE = 100;               // 100..113 bu modüle ait
const LEGACY_ID = 1;               // eski tek-bildirim sistemi

// Not: Türkçe ek uyumu (LGS'ye / TYT'ye / AYT'na...) hataya açık olduğu için
// tüm şablonlar sınav adından SONRA ek almayan kalıplarla yazıldı.
const T_COUNTDOWN = [
  (e, d) => `${e} için ${d} gün kaldı. Bugünün küçük payını ayır, yeter.`,
  (e, d) => `${e} yaklaşıyor: ${d} gün. Panik yok — bugün tek bir konu.`,
  (e, d) => `Takvimde ${e} var: ${d} gün. Şimdi 20 dakika, sınavda fark.`,
  (e, d) => `${e} sayacı: ${d} gün. Bugün bir soru bile ileriye sayılır.`,
  (e, d) => `${d} gün sonra ${e}. Bu akşam kısa bir tekrar iyi gider.`,
  (e, d) => `${e} hedefin için ${d} gün var. Hepsini kullanmak için hepsi senin.`,
];

const T_STREAK = [
  n => `${n} günlük serin devam ediyor. Bugün de bir işaret koy.`,
  n => `Seri: ${n} gün. Zinciri bugün de kırma, küçük bir adım yeter.`,
  n => `${n} gündür üst üste çalışıyorsun. Bugünü de ekleyelim mi?`,
  n => `Tam ${n} gün oldu. Bu düzen senin — bugün de sürdür.`,
];

const T_GENTLE = [
  "Zor bir gündeyse sorun değil. 10 dakika da sayılır.",
  "Bugün yoğun geçtiyse kısa bir tekrar bile kazanç.",
  "Masaya oturmak işin yarısı. Sadece başla, gerisi gelir.",
  "Kendine nazik ol: küçük bir hedef seç, onu bitir.",
  "Yorgunsan ağır bir şey seçme. Kolay bir konudan 10 soru?",
  "Bugün hiç mi hiç istemiyorsan, yarın için planını yaz. O da çalışmaktır.",
];

const T_MOTIV = [
  "Bir soru çöz, gerisi gelir.",
  "Bugünün 20 dakikası, sınav günü bir nefes rahatlık.",
  "Küçük adımlar birikir. Bugünkünü atmaya ne dersin?",
  "Şu an açacağın defter, gelecekteki sana bir hediye.",
  "Kolay bir soruyla ısın, sonra asıl konuya gir.",
  "Dün ne yaptıysan yaptın. Bugün yeni bir sayfa.",
  "En verimli çalışma, başlanan çalışmadır.",
  "Bir konu tekrarı akşamı güzel kapatır.",
  "Yanlışlarına bakmak da çalışmaktır — 10 dakikanı ayır.",
  "Sessiz bir 25 dakika: telefon uzakta, sen ve bir konu.",
  "Bugün öğrendiğin bir şey, sınav günü yanında olacak.",
  "Plan bozulduysa yenisini yap. Bu da sürecin parçası.",
  "Az ama düzenli, çok ama dağınıktan iyidir.",
  "Aklındaki o eksik konu var ya? Bugün tam sırası.",
  "Beş dakikalık bir başlangıç, çoğu zaman bir saate dönüşür.",
  "Kimse görmese de sen görüyorsun. Bugünü de say.",
];

// Sakin, kısa başlıklar — dönüşümlü
const TITLES = ["Exam Bro", "Bugünün adımı", "Küçük bir hatırlatma", "Geri sayım", "Selam 👋"];

// Haftalık içerik deseni (7 günlük döngü; çeşitlilik için karışık)
const PATTERN = ["countdown", "motiv", "gentle", "motiv", "countdown", "motiv", "streak"];

const DAY_MS = 86_400_000;

// Saf plan üretici — test edilebilir. exams: [{ name, ms }] (ms = sınav zamanı)
export function buildPlan({ exams = [], streak = 0, from = Date.now(), days = NOTIF_DAYS }) {
  const plan = [];
  const startEpochDay = Math.floor(from / DAY_MS);
  const nearest = exams
    .filter(e => e && e.ms > from)
    .sort((a, b) => a.ms - b.ms)[0] || null;

  for (let i = 0; i < days; i++) {
    const at = new Date(from + i * DAY_MS);
    at.setHours(NOTIF_HOUR, 0, 0, 0);
    if (at.getTime() <= from) continue;               // bugünün saati geçtiyse atla

    const epochDay = startEpochDay + i;
    let type = PATTERN[epochDay % PATTERN.length];
    if (type === "countdown" && !nearest) type = "motiv";
    if (type === "streak" && streak < 3)  type = "gentle";

    let body;
    if (type === "countdown") {
      const dLeft = Math.max(1, Math.ceil((nearest.ms - at.getTime()) / DAY_MS));
      body = T_COUNTDOWN[epochDay % T_COUNTDOWN.length](nearest.name, dLeft);
    } else if (type === "streak") {
      body = T_STREAK[epochDay % T_STREAK.length](streak);
    } else if (type === "gentle") {
      body = T_GENTLE[epochDay % T_GENTLE.length];
    } else {
      body = T_MOTIV[epochDay % T_MOTIV.length];
    }

    plan.push({
      id: ID_BASE + i,
      title: TITLES[epochDay % TITLES.length],
      body,
      schedule: { at, allowWhileIdle: true },
    });
  }
  return plan;
}

async function cancelIds() {
  const ids = [{ id: LEGACY_ID }];
  for (let i = 0; i < NOTIF_DAYS; i++) ids.push({ id: ID_BASE + i });
  try { await LocalNotifications.cancel({ notifications: ids }); } catch { /* yoksa sorun değil */ }
}

// İzin ister + 14 günlük planı kurar. true = kuruldu.
export async function scheduleDailyNotifications(ctx) {
  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return false;
    await cancelIds();
    const plan = buildPlan(ctx);
    if (plan.length) await LocalNotifications.schedule({ notifications: plan });
    return true;
  } catch {
    return false;
  }
}

export async function cancelDailyNotifications() {
  await cancelIds();
}

// Eski sürümdeki tek-bildirim sistemi (id 1) kuruluysa true döner.
// Tercih anahtarı hiç yazılmamış eski kullanıcıları yeni sisteme taşımak için.
export async function detectLegacyEnabled() {
  try {
    const pending = await LocalNotifications.getPending();
    return !!pending?.notifications?.some(n => Number(n.id) === LEGACY_ID);
  } catch {
    return false;
  }
}

// Uygulama açılışında sessiz tazeleme: izin zaten verilmişse planı güncel
// geri sayım verisiyle yeniden kurar; izin istemez, kullanıcıyı rahatsız etmez.
export async function refreshIfEnabled(enabled, ctx) {
  if (!enabled) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return;
    await cancelIds();
    const plan = buildPlan(ctx);
    if (plan.length) await LocalNotifications.schedule({ notifications: plan });
  } catch { /* sessiz */ }
}
