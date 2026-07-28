import { useState, useEffect, useRef } from "react";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { premiumContent, premiumCategoryOrder } from "./premiumContent";
import { getExamTarget } from "./config/examDates";
import { scheduleDailyNotifications, cancelDailyNotifications, refreshIfEnabled, detectLegacyEnabled, NOTIF_HOUR } from "./notifications";
import { useToast, ConfirmSheet, Card, SectionLabel, EmptyState, ProgressBar } from "./ui";
import { useTheme } from "./theme.jsx";
import { ink } from "./ink";
import {
  IconHome, IconCalendar, IconTarget, IconPulse, IconChart, IconFlame,
  IconLock, IconChevronRight, IconChevronLeft, IconX, IconPlus, IconCheck, IconBell,
  IconEye, IconEyeOff, IconTrash, IconSparkle, IconWind, IconBook,
  IconClock, IconSwap, IconGraduation,
} from "./icons";

const tap = (style = "light") => {
  try {
    if (style === "success") Haptics.notification({ type: NotificationType.Success });
    else Haptics.impact({ style: style === "medium" ? ImpactStyle.Medium : ImpactStyle.Light });
  } catch {}
};

// ── Storage helpers ──────────────────────────────────────────
// Native (iOS/Android): Capacitor Preferences → UserDefaults / SharedPreferences
// Web: localStorage fallback
const isNative = typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.();
const store = {
  async get(k) {
    try {
      if (isNative) {
        const { Preferences } = await import("@capacitor/preferences");
        const { value } = await Preferences.get({ key: k });
        return value;
      }
      return localStorage.getItem(k);
    } catch { return null; }
  },
  async set(k, v) {
    try {
      if (v === null || v === undefined) {
        if (isNative) {
          const { Preferences } = await import("@capacitor/preferences");
          await Preferences.remove({ key: k });
        } else {
          localStorage.removeItem(k);
        }
        return;
      }
      const val = typeof v === "string" ? v : JSON.stringify(v);
      if (isNative) {
        const { Preferences } = await import("@capacitor/preferences");
        await Preferences.set({ key: k, value: val });
      } else {
        localStorage.setItem(k, val);
      }
    } catch {}
  },
};

// ── RevenueCat (in-app purchase) ─────────────────────────────
// API keys: RevenueCat dashboard → Project Settings → API Keys (public SDK keys)
const RC_KEYS = {
  ios:     "appl_iAfwRNXIOYjYTuZywgfTpBoQiwS",   // ← Apple App Store public key
  android: "goog_XXXXXXXXXXXXXXXXXXXXXXXXX",   // ← Google Play public key
};
const ENTITLEMENT = "Exam Bro Pro";   // RevenueCat → Entitlements identifier

// ⚠️ DEV ONLY — tüm premium içeriği test etmek için. SUBMIT'TEN ÖNCE false YAP!
const DEV_PREMIUM = false;

async function rcConfigure() {
  if (!isNative) return false;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const platform = window.Capacitor.getPlatform();
    const apiKey = platform === "ios" ? RC_KEYS.ios : RC_KEYS.android;
    await Purchases.configure({ apiKey });
    return true;
  } catch { return false; }
}
async function rcIsPremium() {
  if (!isNative) return false;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const info = await Purchases.getCustomerInfo();
    return !!info?.customerInfo?.entitlements?.active?.[ENTITLEMENT];
  } catch { return false; }
}
async function rcPriceString() {
  if (!isNative) return null;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const off = await Purchases.getOfferings();
    return off?.current?.availablePackages?.[0]?.product?.priceString || null;
  } catch { return null; }
}

// ── Grade → which fixed exams are visible by default ─────────
function defaultHidden(grade) {
  if (grade === "8")               return ["TYT", "AYT"];
  if (grade === "12" || grade === "x") return ["LGS"];
  // 5-7, 9-11: no national exam relevant
  return ["LGS", "TYT", "AYT"];
}

// ── Static data ──────────────────────────────────────────────
// Ulusal sınavların tarihi src/config/examDates.js'ten gelir (kendini
// yenileyen sayaç + fallback). Buradaki `examKey`/`offsetDays` o config'e bağlar;
// burada hardcoded tarih YOKTUR.
const FIXED = [
  { id:"LGS", n:"LGS",     sub:"Liselere Geçiş Sınavı",  examKey:"lgs", offsetDays:0, c:"#10d99e" },
  { id:"TYT", n:"TYT",     sub:"Temel Yeterlilik Testi",  examKey:"yks", offsetDays:0, c:"#9d5cff" },
  { id:"AYT", n:"AYT/YDT", sub:"Alan Yeterlilik Testi",   examKey:"yks", offsetDays:1, c:"#ff4d94" },
];
// Bir sınav nesnesi için canlı hedef bilgisi. FIXED ise config'ten (self-renewing),
// custom/OSYM ise kendi sabit tarihinden.
function examInfoFor(ex) {
  if (ex.examKey) return getExamTarget(ex.examKey, { offsetDays: ex.offsetDays || 0 });
  return null;
}
const OSYM = [
  { id:"ALES1",    n:"ALES / 1",            sub:"Akademik Lisans Tamamlama", date:"2026-05-10T09:30:00", c:"#ff9736", cat:"Lisansüstü" },
  { id:"ALES2",    n:"ALES / 2",            sub:"Akademik Lisans Tamamlama", date:"2026-07-26T09:30:00", c:"#ff9736", cat:"Lisansüstü" },
  { id:"ALES3",    n:"ALES / 3",            sub:"Akademik Lisans Tamamlama", date:"2026-11-29T09:30:00", c:"#ff9736", cat:"Lisansüstü" },
  { id:"DGS",      n:"DGS",                 sub:"Dikey Geçiş Sınavı",        date:"2026-07-19T09:30:00", c:"#5c9bff", cat:"Ön Lisans" },
  { id:"KPSS_GYK", n:"KPSS Lisans GY-GK",  sub:"Genel Yetenek – Genel Kültür", date:"2026-09-06T09:30:00", c:"#10d99e", cat:"Kamu" },
  { id:"KPSS_AB1", n:"KPSS Alan Bil. / 1", sub:"Lisans A Grubu – 1. Gün",   date:"2026-09-12T09:30:00", c:"#10d99e", cat:"Kamu" },
  { id:"KPSS_AB2", n:"KPSS Alan Bil. / 2", sub:"Lisans A Grubu – 2. Gün",   date:"2026-09-13T09:30:00", c:"#10d99e", cat:"Kamu" },
  { id:"KPSS_OOG", n:"KPSS Ortaöğretim",   sub:"Lise Mezunları",             date:"2026-10-25T09:30:00", c:"#10d99e", cat:"Kamu" },
  { id:"MEB_AGS",  n:"MEB-AGS",             sub:"MEB Akademi Giriş Sınavı",  date:"2026-07-12T09:30:00", c:"#b07aff", cat:"Kamu" },
];
const GRADES = [
  { v:"5",  l:"5. Sınıf",  e:"🐣" }, { v:"6",  l:"6. Sınıf",      e:"🐥" },
  { v:"7",  l:"7. Sınıf",  e:"🐤" }, { v:"8",  l:"8. Sınıf (LGS)",e:"😤" },
  { v:"9",  l:"9. Sınıf",  e:"😬" }, { v:"10", l:"10. Sınıf",     e:"😰" },
  { v:"11", l:"11. Sınıf", e:"😱" }, { v:"12", l:"12. Sınıf",     e:"💀" },
  { v:"x",  l:"Mezun",     e:"👻" },
];
const SUBJ = {
  "5":  ["Türkçe","Matematik","Fen Bilimleri","Sosyal Bilgiler","İngilizce","Din Kültürü"],
  "6":  ["Türkçe","Matematik","Fen Bilimleri","Sosyal Bilgiler","İngilizce","Din Kültürü"],
  "7":  ["Türkçe","Matematik","Fen Bilimleri","Sosyal Bilgiler","İngilizce","Din Kültürü"],
  "8":  ["Türkçe","Matematik","Fen Bilimleri","İnkılap Tarihi","İngilizce","Din Kültürü"],
  "9":  ["Türkçe","Matematik","Fizik","Kimya","Biyoloji","Tarih","Coğrafya","İngilizce","Felsefe"],
  "10": ["Türkçe","Matematik","Fizik","Kimya","Biyoloji","Tarih","Coğrafya","İngilizce"],
  "11": ["Edebiyat","Matematik","Fizik","Kimya","Biyoloji","Tarih","Coğrafya","İngilizce","Felsefe","Psikoloji"],
  "12": ["TYT Türkçe","TYT Mat","TYT Fen","TYT Sosyal","AYT Mat","AYT Fizik","AYT Kimya","AYT Biyoloji","AYT Edebiyat"],
  "x":  ["TYT Türkçe","TYT Mat","TYT Fen","TYT Sosyal","AYT Mat","KPSS GY","KPSS GK","ALES Sözel","ALES Sayısal","YDS"],
};

// Sınıfa göre örnek hedef önerileri (yazma alanına basınca chip olarak çıkar)
function goalSuggestions(grade) {
  const subs = SUBJ[grade] || [];
  const out = [];
  // Ders bazlı somut hedefler — ilk 4 dersten
  subs.slice(0, 4).forEach(s => out.push(`${s}'ten 20 soru çöz`));
  // Sınava özel ek öneriler
  if (grade === "8") {
    out.push("LGS denemesi çöz", "Yanlışlarımı analiz et");
  } else if (grade === "12" || grade === "x") {
    out.push("TYT denemesi çöz", "AYT konu tekrarı yap", "Yanlışlarımı analiz et");
  } else {
    out.push("Bir konu tekrarı yap", "Ödevlerimi bitir");
  }
  // Herkese uygun genel hedefler
  out.push("25 dk Pomodoro çalış", "Eksik konuyu tamamla");
  // Tekrarsız, ilk 8
  return [...new Set(out)].slice(0, 8);
}

const MOTIV = [
  "sınav tarihin değişmeyecek. sen değişeceksin.",
  "geçen yılın seni görmesi gerekirdi.",
  "sessiz çalışanlar en çok konuşturur.",
  "kimse saat kaçta çalıştığını sormayacak. sadece puanını.",
  "bugün bitti. yarın var.",
  "bir soru çözdüm. tamam.",
  "en iyi hazırlık sessiz geçer.",
  "sonuçlar açıklandığında herkes anlar.",
  "şu an zor. o yüzden değerli.",
  "ne kadar çalıştığını kimse görmeyecek. puan gösterecek.",
  "yorgunluk geçer. pişmanlık geçmez.",
  "bugün küçük. birikerek büyür.",
  "fark yaratan günler böyle geçer.",
  "sınav seni ölçmez. hazırlığını ölçer.",
  "şu an yaptığın şey aylarca sürecek bir şeyin parçası.",
  "bir gün bugünü hatırlayacaksın.",
  "çalışmak zor değil. başlamak zor. başladın mı zaten oldun.",
  "bugün mükemmel olmak zorunda değilsin. sadece bir adım.",
  "rakamlar yavaş yavaş değişir. sonra birden değişir.",
  "iyi bir gün beklemek zorunda değilsin. orta bir günde de olur.",
  "kaygı geçer. hazırlık kalır.",
  "o soruyu çözdüğünde anlayacaksın neden devam ettin.",
  "şimdi kolay olsaydı herkes yapardı.",
  "bir saat önce başlasaydın diye düşünme. şimdi başla.",
  "not tutuyorsun, soru çözüyorsun. bu yeterli.",
  "sonuna kadar gidecek misin? öyleyse devam et.",
  "bugün kimse görmese de sen gördün.",
  "ne hissettirdiği değil, ne yaptırdığı önemli.",
  "en uzun yolculuklar böyle başlar.",
  "her şeyi anlamak zorunda değilsin. ilerlemek yeterli.",
  "sistemi takip et. sistem seni götürür.",
  "başarı ani değildir. bu gün de dahil.",
  "sınav sabahı bugünleri hatırlayacaksın.",
  "zihin yorulur. devam etmek kası güçlendirir.",
  "hedefin büyük. adımlar küçük olabilir.",
  "hata yaptın. devam et. bu da veri.",
  "planın bozuldu. yeni plan yap. bu da olur.",
  "bazen tek başına çalışmak en verimli çalışmaktır.",
  "bugün nereye kadar gideceğini bil. oraya git.",
  "beyin alışkanlık ister. her gün biraz ver.",
  "soru çözmek konuşmaktan sessizdir ama daha çok şey söyler.",
  "bugün biraz daha. sadece biraz.",
  "isteksizsen de olur. yapıyorsan sayılır.",
  "yeterince iyi günlerin toplamı mükemmel bir sonuç verir.",
  "önemli olan karar verdiğinde ne yaptığın.",
  "bu süreci geçeceksin. nasıl geçtiğin fark yaratır.",
  "küçük bir ilerleme sıfır ilerlemeden her zaman iyidir.",
  "odaklanmak beceridir. her gün biraz daha iyi olursun.",
  "kaç saat çalıştığın değil, ne kadar kaldığın önemli.",
  "bugün zihni taze tut. yarın aynı şekilde gel.",
  "bir konu bitti. bir sonraki var. böyle gider.",
  "sonuç gelmeden önce süreç var. şu an süreç.",
  "her doğru cevap bir önceki çalışmanın ürünü.",
  "bu soruyu bilmiyordun. şimdi biliyorsun. bu ilerleme.",
  "birikimler görünmez başlar. sonra bir anda ortaya çıkar.",
  "sesin yüksek olmak zorunda değil. işin yüksek sesle konuşsun.",
  "zihni koru. besle. dinlendir. tekrar çalıştır.",
  "başkası ne yapıyor fark etmez. sen ne yapıyorsun?",
  "karşılaştırma enerjini yer. o enerjiyi soruya harca.",
  "planı değil, ilerlemeyi takip et.",
  "kötü bir gün de geçer. yarın yeniden başlanır.",
  "tam odak kısa süre, uzun süre yarım odaktan daha değerli.",
  "bilmediğin soruyu geç. sonra geri dön. bu strateji.",
  "hatırlamak için yaz. anlamak için çöz.",
  "özet çıkarmak okumaktan iyidir. çözmek özetten iyidir.",
  "bugün bitince dön bak. ne yaptın? iyi.",
  "sınav gününe kadar kaç gün var? her biri sayılır.",
  "kolay geldiğinde daha fazla yap. zor geldiğinde yine yap.",
  "düşünmekten yorulmak çalışmaktır. devam et.",
  "bu konuyu bir kez daha çalış. bir kez daha.",
  "kalan günlere bak. hepsini kullanmak için hepsi var.",
  "sınav sana gelmez. sen sınava gidersin. hazır git.",
  "çalışmak için mükemmel an yoktur. bu an vardır.",
  "zor sorular herkese zordur. fark hazırlıkta.",
  "bugün öğrendiğin şey sınav gününde seninle olacak.",
  "bir soruyu doğru çözdüğünde küçük bir zafer. hepsini topla.",
  "tempo düşse de devam etmek en iyisi.",
  "bugün isteksizsen yine de masaya otur. 10 dakika.",
  "net bir hedef bulanık bir çabadan iyidir.",
  "düzenli çalışmak deha olmaktan daha güçlüdür.",
  "hafıza tekrarla güçlenir. bir daha bak.",
  "o konudan korkuyorsan o konudan başla.",
  "zihni ısındırmak lazım. kolay bir soruyla başla, sonra gir.",
  "bugün çalışmak gelecekteki kendine bir hediye.",
  "bir şey anlamadıysan sorun değil. tekrar bak. sonra anla.",
  "konsantrasyon kasılır. her gün biraz daha uzun tutmaya çalış.",
  "en iyi not alan kişi en zeki değil, en disiplinli olandır.",
  "bugün bırakmak istiyorsun. bırakma. sadece dur. sonra devam et.",
  "her şeyi çalışmak zorunda değilsin. doğru şeyleri çalışmak yeterli.",
  "zaman geçiyor. seninle birlikte geçmesini sağla.",
  "sınav sabahı uyanacaksın. o günü bugün hazırlıyorsun.",
  "sonuçlar açıklandığında bu günler anlam kazanır.",
  "şu an yaptığın her şey birikimdir. birikim görünmez önce.",
  "bu süreci herkes yaşamaz. sen yaşıyorsun. bu fark.",
  "bugün küçük ama yarınki büyük adımın temeli bu.",
  "sınav gününde paniklemeyeceksin çünkü hazırlıklı olacaksın.",
  "bir sonraki haftanın seni bu haftanı hatırlaması için ne bırakıyorsun?",
  "bugünkü küçük adım, yarınki büyük farkın başlangıcı.",
  "tam hazır hissetmeden başlamak da başlamaktır.",
  "bu masaya her oturuş bir yatırım.",
];
const CBT = [
  { i:"💭", t:"kaygın normal.", b:"Sınav öncesi kaygı beyninin 'bu önemli' demesi. Düşman değil, uyarı sistemi." },
  { i:"🌊", t:"her şeyi bilmek zorunda değilsin.", b:"Sınav beceri ölçer, mükemmellik değil. Çalıştığın kadar götürsün." },
  { i:"🔄", t:"bugün kötü geçtiyse.", b:"Bir kötü gün süreci bitirmez. Yarın yeniden başlarsın, nokta." },
  { i:"👁️", t:"karşılaştırma tuzağı.", b:"Başkası ne kadar çalışıyor, içeride ne yaşıyor bilemezsin. Enerjini onu izlemeye değil, kendi işine harca." },
  { i:"🌬️", t:"nefes al.", b:"4 sn al, 4 sn tut, 4 sn ver. İki kez tekrarla. Hiçbir şeye ihtiyacın yok, hemen işe yarıyor." },
  { i:"🏋️", t:"küçük adım büyük fark.", b:"20 dakika çalışmak hiç çalışmamaktan katlarca iyidir. Mükemmel plan yoktur." },
];

// Kaygı ekranı altındaki günlük değişen sakinleştirici / bilgilendirici notlar
const ANX_NOTES = [
  "Bu ekranda her gün kaygını işaretledikçe, zamanla kendi örüntünü görürsün: hangi günler zorlandığını, neyin işe yaradığını. Fark etmek, yönetmenin ilk adımıdır.",
  "Kaygını bir nota dökmek bile onu biraz hafifletir. İçinde tutmak yerine burada görünür kılıyorsun — bu cesaret ister.",
  "Yüksek kaygılı bir gün, başarısız olduğun anlamına gelmez. Sadece o gün biraz daha zor geçmiş demektir. Yarın yeniden.",
  "Duygular hava durumu gibidir: gelir, kalır, geçer. Bugün bulutluysa, bu kalıcı değil.",
  "Kaygını ölçmek onu yargılamak değil, tanımak içindir. 'Neden böyle hissediyorum?' diye kendine nazik ol.",
  "Bir hafta boyunca işaretlersen, kaygının sabit olmadığını göreceksin. İniş çıkışlar normaldir — sen de öylesin.",
  "Yüksek bir gün gördüğünde, o gün ne olduğunu hatırlamaya çalış. Tetikleyiciyi bilmek, bir sonrakine hazırlıklı olmanı sağlar.",
  "Kaygı seni korumaya çalışan bir alarm sistemidir. Bazen gereksiz çalar. Sen alarmın sahibisin, esiri değil.",
  "Bugün kendine sormayı dene: 'Bu kaygı bana ne söylemeye çalışıyor?' Bazen bir mola, bazen bir plan ister.",
  "Düşük kaygılı günleri de işaretle. Neyin seni sakinleştirdiğini görmek, zor günlerde sığınağın olur.",
  "Kendini 10 üzerinden düşük puanlamak zorunda değilsin. Dürüst ol — bu ekran sadece senin için, kimse görmüyor.",
  "Kaygı yükseldiğinde Psikoloji köşesindeki nefes egzersizlerinden birini dene. Birkaç dakika, gözle görülür fark.",
];

// ── Premium content config ───────────────────────────────────
const PSYCH_COLORS = { kaygi:"#9d5cff", sinavGunu:"#ff4d94", nefes:"#10d99e", mukemmeliyetcilik:"#5c9bff", erteleme:"#ffb703" };
// Free taster items (everything else is behind the paywall)
const PSYCH_FREE = new Set(["kaygi-nedir", "kutu-nefesi"]);

// ── Utils ────────────────────────────────────────────────────
const pad   = n => String(n).padStart(2, "0");
// Gün anahtarı YEREL saate göre üretilir (UTC değil): gece 00:00-03:00 arasında
// çalışan öğrencinin kaydı bir önceki güne yazılmasın.
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today  = () => dayKey(new Date());
function remaining(dateStr) {
  const diff = new Date(dateStr) - Date.now();
  if (diff <= 0) return { d:0, h:0, m:0, s:0, done:true };
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
    done: false,
  };
}
// Kaygı skalası tema-farkındadır: kanal listeleri --anx-*-rgb token'larından
// gelir, alfa rampası (sürekli geçiş) burada hesaplanır. Fonksiyon içinde
// sabit renk YOKTUR.
function anxBand(v) {
  return !v ? null : v <= 3 ? "low" : v <= 6 ? "mid" : "high";
}
// Alfa rampası AÇIK MODDA AYRI. Sebep: kontrast bir ORAN, ve açık zeminin
// üstünde aynı alfa adımları çok daha küçük oranlar üretiyor. Koyu modun
// rampası açık moda uygulandığında ölçülen sonuç (docs/LIGHT-MODE.md §4):
//   bant sınırı 1.57:1 (koyu 2.75) · en soluk kare↔sayfa 1.99:1 (koyu 3.34)
// Yalnız kanalları koyulaştırmak da yetmiyor — alfa rampası sabit tutulunca
// hiçbir kanal üçlüsü koyu modun dört metriğini birden yakalayamıyor (arandı).
// Aşağıdaki açık mod katsayıları --anx-*-rgb ile BİRLİKTE çözüldü; sonuç koyu
// modu dört metrikte de yakalıyor ya da geçiyor. İkisi ayrı ayrı değiştirilemez.
function anxColor(v, theme) {
  const b = anxBand(v);
  if (!b) return "var(--anx-empty)";
  const a = theme === "light"
    ? (b === "low" ? 0.40 + v * 0.20
     : b === "mid" ? 0.40 + (v - 3) * 0.20
     :               0.447 + (v - 6) * 0.1333)
    : (b === "low" ? 0.3 + v * 0.2
     : b === "mid" ? 0.3 + (v - 3) * 0.18
     :               0.35 + (v - 6) * 0.13);
  return `rgba(var(--anx-${b}-rgb),${a.toFixed(2)})`;
}
function anxSolid(v) {
  const b = anxBand(v);
  return b ? `var(--anx-${b})` : "var(--anx-none)";
}
// ── Kaygı skalasının METİN taşıyan yüzeyleri ─────────────────
// Koyu modda bant renginin alfa rampalı yıkaması metni rahat taşıyor.
// Açık modda aynı yıkama beyaz karta doğru açılıyor ve kontrast çöküyor —
// ÖLÇÜLDÜ: seçili buton 2.30:1, durum etiketi 2.89:1 (ikisi de AA altı).
//
// Yıkamayı zayıflatmak ÇÖZÜM DEĞİL: --anx-low (#0d805b) için HİÇBİR yüzde
// 4.5'i geçmiyor (%8'de bile kalıyor) — §4'teki seri rozetiyle birebir aynı
// olgu, zemini accent'e yaklaştırdıkça accent metnin kontrastı düşüyor.
// Bu yüzden açık modda bant rengi TAM OPAK zemin olur, üstüne --on-accent:
// üç bantta da 4.94–5.55:1. Isı haritası ve lejant dokunulmadan kalır,
// alfa rampası orada zaten görünür. Koyu mod her iki yerde de değişmiyor.
function anxFill(v, theme) {
  return theme === "light" ? anxSolid(v) : anxColor(v, theme);
}
// Lejant karesi HARİTAYI etiketliyor ("bu bandın günü böyle görünür"), o yüzden
// haritanın rengini kullanır: bandın TAM YOĞUNLUK tonu. Koyu modda --anx-* zaten
// bandın en koyu karesiyle pratikte aynı (1.22–1.40:1). Açık modda harita kendi
// koyulaştırılmış kanallarına taşındığı için --anx-* hiçbir kareyle eşleşmiyordu
// (2.09/1.96/1.53) — lejant işini yapmıyordu. Metin/buton --anx-*'ta KALIR.
function anxLegend(band, theme) {
  return theme === "light" ? `rgba(var(--anx-${band}-rgb),1)` : `var(--anx-${band})`;
}
// Rapor çubuğu ısı haritasından AYRI bir rampa kullanır — yalnızca AÇIK modda.
// İki sebep: (1) çubuk KARTIN (#ffffff) üstünde, ısı haritası sayfa zemininin
// (#f2f2f6) üstünde; (2) çubukta YÜKSEKLİK zaten değeri kodluyor (v*5.5px),
// yani renkteki rampa orada fazladan bilgi — ısı haritasında yükseklik yok.
// Ortak rampayla en açık çubuk "kayıt yok" kütüğünden yalnızca 2.58:1 ayrılıyordu
// (1.4.11 ≥3). Taban 0.70'e çekilince en zayıf ayrım 3.42:1.
// Isı haritasının tabanı YÜKSELTİLEMEZ: orada bant sınırı düşüyor (§4).
function anxBarColor(v, theme) {
  if (theme !== "light") return anxColor(v, theme);
  const b = anxBand(v);
  if (!b) return "var(--anx-empty)";
  const i = b === "high" ? v - 7 : (v - 1) % 3;
  const n = b === "high" ? 3 : 2;
  return `rgba(var(--anx-${b}-rgb),${(0.70 + 0.30 * (i / n)).toFixed(2)})`;
}
function anxPillStyle(v, theme) {
  if (theme === "light") return { background: anxSolid(v), color: "var(--on-accent)" };
  return {
    background: tint(anxSolid(v), "--tint-edge-2", null, `rgba(var(--anx-${anxBand(v)}-rgb),0.2)`),
    color: anxSolid(v),
  };
}

// ── Veri renklerinin soluk tonu ──────────────────────────────
// Sınav (FIXED/OSYM/customs) ve psikoloji kategorisi renkleri VERİDİR, token
// değildir. Eskiden `${c}14` gibi hex'e alfa eki yazılıyordu; bu, tint'in
// gücünü koyu zemine sabitliyordu. Artık alfa yüzdesi --tint-* token'ından
// gelir, böylece açık modda tint yeniden dengelenebilir.
//
// `color-mix(in srgb, C X%, transparent)` premultiplied karışım yaptığı için
// sonuç, alfası X olan C rengine BİREBİR eşittir → koyu modda piksel farkı yok.
// color-mix desteklenmiyorsa (Safari < 16.2, yani iOS 15–16.1) eski hex-alfa
// ekine düşülür; o cihazlarda koyu mod yine birebir aynıdır.
const SUPPORTS_MIX = typeof CSS !== "undefined" && typeof CSS.supports === "function"
  && CSS.supports("color", "color-mix(in srgb, red 50%, blue)");
// fallbackAlpha: `color` bir hex literal ise sonuna eklenecek hex alfa eki.
// fallbackColor: `color` bir var() ise (hex eki var()'a eklenemez) kullanılacak
// tam renk — verilirse fallbackAlpha yok sayılır.
function tint(color, token, fallbackAlpha, fallbackColor) {
  if (SUPPORTS_MIX) return `color-mix(in srgb, ${color} var(${token}), transparent)`;
  return fallbackColor || `${color}${fallbackAlpha}`;
}

// Breathing phase from a step label (Turkish): "...al" = inhale, "...ver" = exhale, else hold
function phaseOf(label) {
  const l = (label || "").toLowerCase().trim();
  if (l.endsWith("al"))  return "in";
  if (l.endsWith("ver")) return "out";
  return "hold";
}

// ── Root ─────────────────────────────────────────────────────
export default function App() {
  const [loaded,    setLoaded]    = useState(false);
  const [grade,     setGrade]     = useState("");
  const [tab,       setTab]       = useState("home");
  const [,          setTick]      = useState(0);
  const [hidden,    setHidden]    = useState([]);
  const [customs,   setCustoms]   = useState([]);
  const [goals,     setGoals]     = useState({});
  const [anxiety,   setAnxiety]   = useState({});
  const [studied,   setStudied]   = useState([]);
  const [streak,    setStreak]    = useState(0);
  const [doneToday, setDoneToday] = useState(false);
  const [showBoom,  setShowBoom]  = useState(false);
  // premium
  const [isPremium,   setIsPremium]   = useState(DEV_PREMIUM);
  const [psychOpen,   setPsychOpen]   = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [purchasing,  setPurchasing]  = useState(false);
  const [priceString, setPriceString] = useState(null);
  const [psychDone,   setPsychDone]   = useState({});
  // notifications & dialogs
  const [notifOn,      setNotifOn]      = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const { toast, toastEl } = useToast();
  const notifRefreshed = useRef(false);

  useEffect(() => {
    (async () => {
      const g  = await store.get("xb_grade");
      const hd = await store.get("xb_hidden");
      const cu = await store.get("xb_customs");
      const go = await store.get("xb_goals");
      const an = await store.get("xb_anxiety");
      const st = await store.get("xb_studied");
      const sk = await store.get("xb_streak");
      const dt = await store.get("xb_doneday");
      const pj = await store.get("xb_psych");
      const nf = await store.get("xb_notif");
      const loadedGrade = g || "";
      setGrade(loadedGrade);
      // If hidden was never set, apply grade-based defaults
      if (hd) {
        try { setHidden(JSON.parse(hd)); } catch {}
      } else if (loadedGrade) {
        setHidden(defaultHidden(loadedGrade));
      }
      if (cu) try { setCustoms(JSON.parse(cu)); }  catch {}
      if (go) try { setGoals(JSON.parse(go)); }    catch {}
      if (an) try { setAnxiety(JSON.parse(an)); }  catch {}
      let studiedList = [];
      if (st) try { studiedList = JSON.parse(st); setStudied(studiedList); } catch {}
      // Seri: son çalışılan gün dünden eskiyse seri koptu → 0 göster
      let effStreak = parseInt(sk) || 0;
      if (effStreak > 0) {
        const yest = new Date(); yest.setDate(yest.getDate() - 1);
        const yd = dayKey(yest);
        const last = studiedList.length ? studiedList[studiedList.length - 1] : null;
        if (!last || (last < yd)) { effStreak = 0; store.set("xb_streak", "0"); }
      }
      setStreak(effStreak);
      // xb_doneday is stored as a raw date string, not JSON — compare directly
      if (dt && dt === today()) setDoneToday(true);
      if (pj) try { setPsychDone(JSON.parse(pj)); } catch {}
      // Bildirim tercihi + eski tek-bildirim sisteminden sessiz geçiş
      if (nf === "1") setNotifOn(true);
      else if (nf === null && isNative && await detectLegacyEnabled()) {
        setNotifOn(true); store.set("xb_notif", "1");
      }
      setLoaded(true);
    })();
  }, []);

  // RevenueCat: configure + read entitlement once on mount (native only)
  useEffect(() => {
    if (DEV_PREMIUM) return;   // dev override: skip RC, stay premium
    (async () => {
      const ok = await rcConfigure();
      if (!ok) return;
      setIsPremium(await rcIsPremium());
      setPriceString(await rcPriceString());
    })();
  }, []);

  useEffect(() => {
    let t;
    const start = () => { t = setInterval(() => setTick(n => n+1), 1000); };
    const stop = () => clearInterval(t);
    const onVis = () => { if (document.hidden) stop(); else { stop(); start(); } };
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  const saveGrade = async g => {
    const dh = defaultHidden(g);
    setGrade(g);
    setHidden(dh);
    await store.set("xb_grade", g);
    await store.set("xb_hidden", dh);
  };
  const changeGrade = async () => {
    setGrade("");
    setTab("home");
    await store.set("xb_grade", "");
  };
  const resetAll = async () => {
    for (const k of ["xb_grade","xb_hidden","xb_customs","xb_studied","xb_streak","xb_doneday","xb_lastStudy","xb_anxiety","xb_goals","xb_psych","xb_chat_welcomed","xb_notif"]) {
      await store.set(k, null);
    }
    await cancelDailyNotifications();
    location.reload();
  };
  const toggleHide = async id => {
    const n = hidden.includes(id) ? hidden.filter(x => x !== id) : [...hidden, id];
    setHidden(n);
    await store.set("xb_hidden", n);
  };
  const addExam = async ex => {
    const n = [...customs, ex]; setCustoms(n); await store.set("xb_customs", n);
  };
  const delExam = async id => {
    const n = customs.filter(e => e.id !== id); setCustoms(n); await store.set("xb_customs", n);
  };
  const markStudied = async () => {
    tap("success");
    if (doneToday) return;
    const d = today(), ns = [...studied, d];
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    const yd = dayKey(yest);
    const ns2 = studied.includes(yd) ? streak + 1 : 1;
    setStudied(ns); setStreak(ns2); setDoneToday(true); setShowBoom(true);
    setTimeout(() => setShowBoom(false), 2600);
    await store.set("xb_studied", ns);
    await store.set("xb_streak", String(ns2));
    await store.set("xb_doneday", today());
  };
  const rateAnxiety = async (day, val) => {
    const n = { ...anxiety, [day]: val }; setAnxiety(n); await store.set("xb_anxiety", n);
  };
  const addGoal = async (day, text) => {
    const n = { ...goals, [day]: [...(goals[day] || []), { id: Date.now(), text, done: false }] };
    setGoals(n); await store.set("xb_goals", n);
  };
  const toggleGoal = async (day, id) => {
    const n = { ...goals, [day]: (goals[day] || []).map(g => g.id === id ? { ...g, done: !g.done } : g) };
    setGoals(n); await store.set("xb_goals", n);
  };
  const delGoal = async (day, id) => {
    const n = { ...goals, [day]: (goals[day] || []).filter(g => g.id !== id) };
    setGoals(n); await store.set("xb_goals", n);
  };
  const togglePsychDay = async (pid, day) => {
    const cur = psychDone[pid] || [];
    const next = cur.includes(day) ? cur.filter(x => x !== day) : [...cur, day];
    const n = { ...psychDone, [pid]: next };
    setPsychDone(n); await store.set("xb_psych", n); tap();
  };

  // ── Purchases ──
  const buyPremium = async () => {
    if (!isNative) { toast("Satın alma yalnızca uygulamada (App Store / Play) çalışır."); return; }
    setPurchasing(true);
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      const off = await Purchases.getOfferings();
      const pkg = off?.current?.availablePackages?.[0];
      if (!pkg) { toast("Ürün bulunamadı. Lütfen daha sonra tekrar dene."); setPurchasing(false); return; }
      const res = await Purchases.purchasePackage({ aPackage: pkg });
      if (res?.customerInfo?.entitlements?.active?.[ENTITLEMENT]) {
        setIsPremium(true); setPaywallOpen(false); tap("success");
        toast("Hoş geldin — artık Pro üyesin ✦");
      }
    } catch (e) {
      if (!e?.userCancelled) toast("Satın alma tamamlanamadı.");
    }
    setPurchasing(false);
  };
  const restorePremium = async () => {
    if (!isNative) { toast("Geri yükleme yalnızca uygulamada çalışır."); return; }
    setPurchasing(true);
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      const res = await Purchases.restorePurchases();
      if (res?.customerInfo?.entitlements?.active?.[ENTITLEMENT]) {
        setIsPremium(true); setPaywallOpen(false); tap("success");
        toast("Premium geri yüklendi ✓");
      } else {
        toast("Geri yüklenecek bir satın alma bulunamadı.");
      }
    } catch { toast("Geri yükleme başarısız."); }
    setPurchasing(false);
  };

  // ── Derived data (bildirim planı da bunları kullanır) ──
  const gradeInfo = GRADES.find(g => g.v === grade) || GRADES[0];
  // Deterministic daily pick cycling through all 100 messages
  const dayIndex  = Math.floor(Date.now() / 86400000);
  const motivText = MOTIV[dayIndex % MOTIV.length];
  const cbtTip    = CBT[dayIndex % CBT.length];
  // FIXED sınavlar kendini yenileyen sayaçtır → tarih filtresine takılmaz, hep görünür.
  // Custom sınavlar tek seferlik → geçmişte kalanlar gizlenir.
  const visFixed       = FIXED.filter(e => !hidden.includes(e.id));
  const futureCustoms  = customs.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).filter(ex => new Date(ex.date) > Date.now());
  const allExams       = [...visFixed, ...futureCustoms];

  const notifCtx = () => ({
    exams: [
      ...visFixed.map(ex => { const info = examInfoFor(ex); return info ? { name: ex.n, ms: info.ms } : null; }).filter(Boolean),
      ...futureCustoms.map(ex => ({ name: ex.n, ms: new Date(ex.date).getTime() })),
    ],
    streak,
  });

  // Açılışta bildirim planını güncel geri sayım verisiyle tazele (izin istemez)
  useEffect(() => {
    if (!loaded || !isNative || notifRefreshed.current) return;
    notifRefreshed.current = true;
    refreshIfEnabled(notifOn, notifCtx());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, notifOn]);

  const toggleNotif = async () => {
    tap();
    if (!isNative) { toast("Bildirimler yalnızca uygulamada çalışır."); return; }
    if (notifOn) {
      await cancelDailyNotifications();
      setNotifOn(false); await store.set("xb_notif", "0");
      toast("Günlük hatırlatma kapatıldı.");
    } else {
      const ok = await scheduleDailyNotifications(notifCtx());
      if (ok) {
        setNotifOn(true); await store.set("xb_notif", "1"); tap("success");
        toast(`Her akşam ${NOTIF_HOUR}:00'de kısa bir hatırlatma alacaksın.`);
      } else {
        toast("Bildirim izni verilmedi. Ayarlar > Bildirimler'den açabilirsin.");
      }
    }
  };

  if (!loaded) return <Splash />;
  if (!grade)  return <Onboard onPick={saveGrade} />;

  const TABS = [
    ["home",    IconHome,     "Ana Sayfa"],
    ["exams",   IconCalendar, "Sınavlar"],
    ["goals",   IconTarget,   "Hedefler"],
    ["anxiety", IconPulse,    "Kaygı"],
    ["report",  IconChart,    "Rapor"],
  ];

  return (
    <div style={S.root} className="themed">
      {/* .no-theme-anim: boomFade/popIn animasyonlarının ortasından kesilmesin
          — geçici tema geçişinden muaf (docs/LIGHT-MODE.md §8). */}
      {showBoom && (
        <div style={S.boom} className="no-theme-anim">
          <div style={{ textAlign:"center", animation:"popIn 0.45s ease" }} className="no-theme-anim">
            <div style={{
              width:104, height:104, borderRadius:"50%", margin:"0 auto",
              background:"var(--grad-boom)",
              border:"1px solid var(--orange-edge)", display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"var(--glow-orange)", color:"var(--orange)",
            }}><IconFlame size={52} /></div>
            <div style={{ fontSize:28, fontWeight:700, color:"var(--gold)", marginTop:16 }}>Süpersin!</div>
            <div style={{ color:"var(--text-3)", fontSize:15, marginTop:6 }}>bugün de işini yaptın</div>
            {streak > 1 && (
              <div style={{
                display:"inline-flex", alignItems:"center", gap:6, marginTop:14,
                background:"var(--streak-pill-bg)", border:"1px solid var(--orange-edge-2)", borderRadius:999,
                padding:"7px 16px", color:"var(--orange)", fontSize:14, fontWeight:600,
              }}><IconFlame size={16} /> {streak} günlük seri</div>
            )}
          </div>
        </div>
      )}
      <header style={S.header} className="themed">
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ color:"var(--violet)", display:"flex" }}><IconGraduation size={26} /></div>
          <div>
            <div style={S.logo}>Exam Bro</div>
            <div style={S.headerSub}>{gradeInfo.e} {gradeInfo.l}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {isPremium && <div style={S.proBadge}><IconSparkle size={13} /> PRO</div>}
          {streak > 0 && (
            <div style={S.streakBadge} aria-label={`${streak} günlük çalışma serisi`}>
              <IconFlame size={15} /> <span className="num">{streak}</span>
            </div>
          )}
        </div>
      </header>
      <main style={S.scroll}>
        {tab === "home"    && <HomeTab    motivText={motivText} cbt={cbtTip} doneToday={doneToday} streak={streak} onStudied={markStudied} exams={allExams} onOpenPsych={() => setPsychOpen(true)} isPremium={isPremium} />}
        {tab === "exams"   && <ExamsTab   grade={grade} hidden={hidden} onToggle={toggleHide} customs={customs} onAdd={addExam} onDel={delExam} />}
        {tab === "goals"   && <GoalsTab   grade={grade} goals={goals} onAdd={addGoal} onToggle={toggleGoal} onDel={delGoal} />}
        {tab === "anxiety" && <AnxietyTab log={anxiety} onRate={rateAnxiety} />}
        {tab === "report"  && <ReportTab  studied={studied} streak={streak} anxiety={anxiety} goals={goals}
                                          onReset={() => setConfirmReset(true)}
                                          notifOn={notifOn} onToggleNotif={toggleNotif}
                                          onChangeGrade={changeGrade} gradeInfo={gradeInfo} />}
      </main>
      <nav style={S.nav} role="tablist" aria-label="Ana gezinme" className="themed">
        {TABS.map(([id, Icon, label]) => {
          const active = tab === id;
          return (
            <button key={id} role="tab" aria-selected={active} aria-label={label}
              style={S.navBtn} onClick={() => { if (!active) { tap(); setTab(id); } }}>
              {active && <div style={S.navLine} />}
              <span style={{ color: active ? "var(--violet)" : "var(--text-4)", display:"flex", transition:"color 0.2s" }}>
                <Icon size={22} />
              </span>
              <span style={{ fontSize:10, fontWeight:600, color: active ? "var(--text-1)" : "var(--text-4)", transition:"color 0.2s" }}>{label}</span>
            </button>
          );
        })}
      </nav>

      {psychOpen && (
        <PsychologyHub
          isPremium={isPremium}
          psychDone={psychDone}
          onToggleDay={togglePsychDay}
          onClose={() => setPsychOpen(false)}
          onRequirePremium={() => setPaywallOpen(true)}
        />
      )}
      {paywallOpen && (
        <Paywall
          priceString={priceString}
          purchasing={purchasing}
          onBuy={buyPremium}
          onRestore={restorePremium}
          onClose={() => setPaywallOpen(false)}
        />
      )}
      <ConfirmSheet
        open={confirmReset}
        title="Tüm veriler silinsin mi?"
        body="Sınavların, hedeflerin, kaygı kayıtların ve çalışma serin kalıcı olarak silinir. Bu işlem geri alınamaz."
        confirmLabel="Evet, hepsini sil"
        danger
        onConfirm={() => { setConfirmReset(false); resetAll(); }}
        onCancel={() => setConfirmReset(false)}
      />
      {toastEl}
    </div>
  );
}

// ── Splash ───────────────────────────────────────────────────
function Splash() {
  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
      <div style={{ color:"var(--violet)", filter:"var(--glow-logo)" }}>
        <IconGraduation size={56} />
      </div>
      <div style={{ fontSize:22, fontWeight:700, color:"var(--text-1)", letterSpacing:-0.3 }}>Exam Bro</div>
    </div>
  );
}

// ── Onboard ──────────────────────────────────────────────────
function Onboard({ onPick }) {
  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh", color:"var(--text-0)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px 24px" }} className="fadein">
      <div style={{ color:"var(--violet)", filter:"var(--glow-logo-lg)" }}>
        <IconGraduation size={64} />
      </div>
      <h1 style={{ fontSize:32, fontWeight:700, textAlign:"center", background:"var(--grad-brand)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:"12px 0 0", letterSpacing:-0.5 }}>Exam Bro</h1>
      <p style={{ fontSize:15, color:"var(--text-3)", margin:"10px 0 6px", textAlign:"center", lineHeight:1.6, maxWidth:300 }}>
        Sınav geri sayımı, günlük hedefler ve kaygı takibi — hepsi tek yerde.
      </p>
      <p style={{ fontSize:14, color:"var(--text-4)", margin:"0 0 28px", textAlign:"center" }}>Başlamak için sınıfını seç:</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, width:"100%", maxWidth:360 }}>
        {GRADES.map(g => (
          <button key={g.v} className="pressable" onClick={() => { tap(); onPick(g.v); }}
            style={{ background:"var(--surface-3)", border:"1px solid var(--border)", borderRadius:16, padding:"16px 8px", cursor:"pointer", color:"var(--text-0)", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:28 }} aria-hidden="true">{g.e}</span>
            <span style={{ fontSize:12.5, fontWeight:600 }}>{g.l}</span>
          </button>
        ))}
      </div>
      <p style={{ fontSize:12, color:"var(--text-4)", marginTop:24, textAlign:"center" }}>Sınıfını sonra Rapor sekmesinden değiştirebilirsin.</p>
    </div>
  );
}

// ── Home ─────────────────────────────────────────────────────
function HomeTab({ motivText, cbt, doneToday, streak, onStudied, exams, onOpenPsych, isPremium }) {
  return (
    <div className="fadeup">
      {/* Motivation */}
      <div className="themed" style={{ marginBottom:14, padding:"20px 22px", background:"var(--surface-1)", border:"1px solid var(--border-soft)", borderRadius:"var(--r-lg)", borderLeft:"3px solid var(--violet)" }}>
        <SectionLabel style={{ color:"var(--violet)", marginBottom:10 }}>bugün</SectionLabel>
        <div style={{ fontSize:17.5, color:"var(--text-1)", lineHeight:1.6, fontStyle:"italic" }}>{motivText}</div>
      </div>
      {/* Studied button */}
      <button className="pressable themed" onClick={onStudied} aria-label={doneToday ? "Bugün çalıştın" : "Bugün çalıştım olarak işaretle"} style={{
        width:"100%", marginBottom:14, padding:"17px 20px",
        background: doneToday ? "var(--green-soft)" : "var(--grad-green)",
        border: doneToday ? "1px solid var(--green-edge)" : "none",
        borderRadius:"var(--r-lg)", color: doneToday ? "var(--green)" : "var(--on-green)", fontSize:18, fontWeight:700,
        cursor: doneToday ? "default" : "pointer",
        boxShadow: doneToday ? "none" : "var(--glow-green)",
        display:"flex", alignItems:"center", justifyContent:"center", gap:10,
      }}>
        <IconCheck size={22} />
        {doneToday ? "Bugün çalıştın" : "Bugün Çalıştım"}
      </button>
      {/* Streak */}
      {streak > 1 && (
        <Card style={{ marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--grad-streak)", borderColor:"var(--orange-edge-3)" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:600, color:"var(--orange)", display:"flex", alignItems:"center", gap:7 }}>
              <IconFlame size={17} /> seri devam ediyor
            </div>
            <div style={{ fontSize:13, color:"var(--orange-text)", marginTop:4 }}>bu tempoda devam et.</div>
          </div>
          <div className="num" style={{ fontSize:36, fontWeight:700, color:"var(--gold)" }}>{streak}</div>
        </Card>
      )}
      {/* Countdowns */}
      {exams.length === 0 ? (
        <EmptyState icon={<IconCalendar size={30} />} title="Henüz sayaç yok"
          body="Sınavlar sekmesinden bir sınav seç ya da kendi sınavını ekle." />
      ) : (
        <>
          <SectionLabel>geri sayım</SectionLabel>
          {exams.map(ex => <CountCard key={ex.id} ex={ex} />)}
        </>
      )}
      {/* CBT — daily free tip, tappable to open the full Psikoloji hub */}
      <button onClick={() => { tap(); onOpenPsych(); }} className="pressable themed" style={{
        display:"block", width:"100%", textAlign:"left", cursor:"pointer", marginTop:8, marginBottom:4,
        padding:"20px 22px", background:"var(--surface-1)", border:"1px solid var(--border-soft)",
        borderRadius:"var(--r-lg)", borderLeft:"3px solid var(--blue)", color:"inherit",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <SectionLabel style={{ color:"var(--blue)", marginBottom:0 }}>psikoloji köşesi</SectionLabel>
          <span style={{ fontSize:12.5, color:"var(--blue)", fontWeight:600, display:"flex", alignItems:"center", gap:2 }}>
            tümünü gör <IconChevronRight size={14} />
          </span>
        </div>
        <div style={{ fontSize:22, marginBottom:8 }} aria-hidden="true">{cbt.i}</div>
        <div style={{ fontSize:15.5, fontWeight:600, marginBottom:6, color:"var(--text-1)" }}>{cbt.t}</div>
        <div style={{ fontSize:14, color:"var(--text-3)", lineHeight:1.65 }}>{cbt.b}</div>
      </button>
      {/* Premium teaser */}
      {!isPremium && (
        <button onClick={() => { tap(); onOpenPsych(); }} className="pressable themed" style={{
          display:"flex", width:"100%", textAlign:"left", cursor:"pointer", marginTop:12,
          padding:"16px 20px", background:"var(--grad-pro)",
          border:"1px solid var(--violet-line-2)", borderRadius:"var(--r-lg)", alignItems:"center", gap:14, color:"inherit",
        }}>
          <span style={{ color:"var(--violet)", display:"flex" }}><IconSparkle size={24} /></span>
          <span style={{ flex:1 }}>
            <span style={{ display:"block", fontSize:14.5, fontWeight:600, color:"var(--violet-text-2)" }}>Psikoloji Programı — Pro</span>
            <span style={{ display:"block", fontSize:12.5, color:"var(--text-3)", marginTop:3 }}>Kaygı modülleri, nefes egzersizleri, sınav günü rehberi</span>
          </span>
          <span style={{ color:"var(--violet)", display:"flex" }}><IconChevronRight size={18} /></span>
        </button>
      )}
    </div>
  );
}
function CountCard({ ex }) {
  const { theme } = useTheme();
  // Sınav rengi VERİ. Metin/anlamlı grafik olarak kullanıldığı yerde açık modda
  // ink()'ten geçer (docs/LIGHT-MODE.md §6 — kova dağılımı orada):
  //   cBig  → başlık 20px/700 ve rakamlar 22px/700 (büyük metin) + sol şerit (grafik) → 3:1
  //   cText → "Sınav günü!" 18px/700 (18 < 18.66, büyük metin DEĞİL)          → 4.5:1
  // Rakam kutusunun zemini ve kenarlığı metin değil → ink() YOK, tint() aynen.
  const cBig  = ink(ex.c, theme, "large");
  const cText = ink(ex.c, theme);
  // FIXED sınav → config'ten canlı hedef (kendini yenileyen). Custom → kendi tarihi.
  const info       = examInfoFor(ex);
  const targetDate = info ? info.date : ex.date;
  const isExamDay  = info ? info.isExamDay : false;
  const isEstimate = info ? info.isEstimate : false;
  const r          = remaining(targetDate);
  const title      = isEstimate ? `${ex.n} (tahmini)` : ex.n;
  return (
    <div className="themed" style={{
      background:"var(--surface-2)", border:"1px solid var(--border-soft)",
      borderLeft:`3px solid ${cBig}`, borderRadius:"var(--r-lg)",
      boxShadow:"var(--shadow-card)", padding:"18px 20px", marginBottom:12,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:700, color:cBig, letterSpacing:-0.2 }}>{title}</div>
          {ex.sub && <div style={{ fontSize:13, color:"var(--text-4)", marginTop:2 }}>{ex.sub}</div>}
        </div>
        {!isExamDay && !r.done && (
          <div style={{ fontSize:12, color:"var(--text-4)" }}>
            {targetDate instanceof Date
              ? targetDate.toLocaleDateString("tr-TR",{ day:"numeric", month:"long" })
              : new Date(targetDate).toLocaleDateString("tr-TR",{ day:"numeric", month:"long" })}
          </div>
        )}
      </div>
      {isExamDay ? (
        <div style={{ fontSize:18, fontWeight:700, color:cText, padding:"4px 0" }}>Sınav günü! Başarılar 🍀</div>
      ) : r.done ? (
        <div style={{ fontSize:15, color:"var(--text-3)" }}>Sınav geçti 🎉</div>
      ) : (
        <div style={{ display:"flex", gap:8 }}>
          {[["d","gün"],["h","saat"],["m","dk"],["s","sn"]].map(([k, lbl]) => (
            <div key={k} style={{ flex:1, textAlign:"center" }}>
              {/* .no-theme-anim: rakam kutuları geçici tema geçişinden muaf (§8) */}
              <div className="num no-theme-anim" style={{
                fontSize:22, fontWeight:700, color:cBig,
                background:tint(ex.c, "--tint-soft", "14"), border:`1px solid ${tint(ex.c, "--tint-line", "22")}`,
                borderRadius:"var(--r-sm)", padding:"8px 2px",
              }}>{pad(r[k])}</div>
              <div style={{ fontSize:10, color:"var(--text-4)", marginTop:6, letterSpacing:1, textTransform:"uppercase" }}>{lbl}</div>
            </div>
          ))}
        </div>
      )}
      {isEstimate && !isExamDay && (
        <div style={{ fontSize:11.5, color:"var(--text-4)", marginTop:12, lineHeight:1.5 }}>
          ⓘ Tahmini tarih — ÖSYM/MEB resmi takvimi açıkladığında güncellenecektir.
        </div>
      )}
    </div>
  );
}

// ── Psychology Hub (premium) ─────────────────────────────────
function PsychologyHub({ isPremium, psychDone, onToggleDay, onClose, onRequirePremium }) {
  // PSYCH_COLORS de sınav renkleri gibi VERİ. Bu ekranda accent yalnızca iki yerde
  // ANLAM taşıyan grafik olarak kullanılıyor (chevron = gezinme göstergesi) →
  // ink(…, "large") kovası, 3:1 (docs/LIGHT-MODE.md §6 kova 2). Kart gradyanı ve
  // kenarlığı dekoratif → tint() ham accent ile kalır (kova 3).
  const { theme } = useTheme();
  const [catId, setCatId] = useState(null);   // selected category
  const [item,  setItem]  = useState(null);   // selected item

  const openItem = (it) => {
    if (!isPremium && !PSYCH_FREE.has(it.id)) { onRequirePremium(); return; }
    tap(); setItem(it);
  };

  // Item detail view
  if (item) {
    const back = () => setItem(null);
    if (item.type === "exercise") return <BreathingPlayer exercise={item} onClose={back} />;
    if (item.type === "program")
      return <ProgramView program={item} done={psychDone[item.id] || []} onToggle={(d) => onToggleDay(item.id, d)} onClose={back} />;
    return <LessonReader lesson={item} onClose={back} />;
  }

  // Category item list
  if (catId) {
    const cat = premiumContent[catId];
    const accent = PSYCH_COLORS[catId] || "#9d5cff";
    return (
      <div style={S.overlay}>
        <HubBar title={`${cat.icon} ${cat.title}`} onBack={() => setCatId(null)} onClose={onClose} />
        <div style={S.overlayScroll} className="fadeup">
          <div style={{ fontSize:14, color:"var(--text-3)", lineHeight:1.6, marginBottom:18 }}>{cat.subtitle}</div>
          {cat.items.map(it => {
            const locked = !isPremium && !PSYCH_FREE.has(it.id);
            const meta = it.type === "exercise" ? "Egzersiz" : it.type === "program" ? "5 günlük program" : `${it.readMin} dk okuma`;
            const prog = it.type === "program" ? (psychDone[it.id] || []).length : 0;
            return (
              <button key={it.id} onClick={() => openItem(it)} className="pressable"
                style={{ display:"flex", width:"100%", textAlign:"left", cursor:"pointer", background:"var(--surface-2)", border:`1px solid ${locked ? "var(--border)" : tint(accent, "--tint-edge-2", "33")}`, borderRadius:16, padding:"17px 18px", marginBottom:10, alignItems:"center", gap:12, opacity:locked?0.72:1, color:"inherit" }}>
                <span style={{ flex:1 }}>
                  <span style={{ display:"block", fontSize:15.5, fontWeight:600, color: locked ? "var(--text-3)" : "var(--text-1)", lineHeight:1.35 }}>{it.title}</span>
                  <span style={{ display:"block", fontSize:13, color:"var(--text-4)", marginTop:4 }}>
                    {meta}{it.type === "program" && prog > 0 ? ` · ${prog}/${it.days.length} gün` : ""}
                  </span>
                </span>
                <span style={{ color: locked ? "var(--violet)" : ink(accent, theme, "large"), display:"flex" }} aria-label={locked ? "Pro içerik" : undefined}>
                  {locked ? <IconLock size={18} /> : <IconChevronRight size={18} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Category grid (hub home)
  return (
    <div style={S.overlay}>
      <HubBar title="Psikoloji" onClose={onClose} />
      <div style={S.overlayScroll} className="fadeup">
        <div style={{ fontSize:14.5, color:"var(--text-3)", lineHeight:1.6, marginBottom:18 }}>
          Sınav kaygısıyla başa çıkmak için Psk. Dilay Demirgan tarafından hazırlanan rehberler.
        </div>
        {premiumCategoryOrder.map(id => {
          const cat = premiumContent[id];
          const accent = PSYCH_COLORS[id] || "#9d5cff";
          return (
            <button key={id} onClick={() => { tap(); setCatId(id); }} className="pressable"
              style={{ display:"flex", width:"100%", textAlign:"left", cursor:"pointer", background:`linear-gradient(135deg,${tint(accent, "--tint-weak", "12")},transparent)`, border:`1px solid ${tint(accent, "--tint-edge", "30")}`, borderRadius:"var(--r-lg)", padding:"18px 18px", marginBottom:12, alignItems:"center", gap:14, color:"inherit" }}>
              <span style={{ fontSize:30 }} aria-hidden="true">{cat.icon}</span>
              <span style={{ flex:1 }}>
                <span style={{ display:"block", fontSize:17, fontWeight:700, color:"var(--text-1)" }}>{cat.title}</span>
                <span style={{ display:"block", fontSize:13.5, color:"var(--text-3)", marginTop:4, lineHeight:1.55 }}>{cat.subtitle}</span>
              </span>
              <span style={{ color:ink(accent, theme, "large"), display:"flex" }}><IconChevronRight size={18} /></span>
            </button>
          );
        })}
        <div style={{ textAlign:"center", color:"var(--text-4)", fontSize:12, lineHeight:1.7, margin:"22px 6px 8px" }}>
          Bu içerikler genel bilgilendirme amaçlıdır ve profesyonel psikolojik desteğin yerini tutmaz.
          Zorlandığını hissedersen güvendiğin bir yetişkine ya da bir uzmana danış.
        </div>
      </div>
    </div>
  );
}

function HubBar({ title, onBack, onClose }) {
  return (
    <div style={S.hubBar}>
      {onBack
        ? <button onClick={onBack} className="pressable" style={S.hubBackBtn} aria-label="Geri">
            <IconChevronLeft size={18} /> Geri
          </button>
        : <span style={{ width:84 }} />}
      <div style={{ fontSize:18, fontWeight:600, color:"var(--text-1)", flex:1, textAlign:"center" }}>{title}</div>
      <button onClick={onClose} className="pressable" style={S.hubCloseBtn} aria-label="Kapat"><IconX size={18} /></button>
    </div>
  );
}

// ── Lesson reader ────────────────────────────────────────────
function LessonReader({ lesson, onClose }) {
  return (
    <div style={S.overlay}>
      <HubBar title={`${lesson.readMin} dk okuma`} onBack={onClose} onClose={onClose} />
      <div style={S.overlayScroll} className="fadeup">
        <div style={{ fontSize:24, fontWeight:700, color:"var(--text-1)", lineHeight:1.3, marginBottom:18, letterSpacing:-0.3 }}>{lesson.title}</div>
        {lesson.sections.map((s, i) => (
          <div key={i} style={{ marginBottom:20 }}>
            <div style={{ fontSize:16, fontWeight:600, color:"var(--violet-text)", marginBottom:8 }}>{s.heading}</div>
            <div style={{ fontSize:15, color:"var(--text-2)", lineHeight:1.75 }}>{s.body}</div>
          </div>
        ))}
        {lesson.takeaway && (
          <div className="themed" style={{ marginTop:8, padding:"16px 18px", background:"var(--surface-2)", borderLeft:"3px solid var(--violet)", borderRadius:12 }}>
            <SectionLabel style={{ color:"var(--violet)", marginBottom:6 }}>aklında kalsın</SectionLabel>
            <div style={{ fontSize:15, color:"var(--text-2)", lineHeight:1.6, fontStyle:"italic" }}>{lesson.takeaway}</div>
          </div>
        )}
        <button onClick={onClose} className="pressable" style={S.doneBtn}>Bitir ✓</button>
      </div>
    </div>
  );
}

// ── Breathing / guided exercise player ───────────────────────
// Find the resting scale for a step: walk back to the last inhale/exhale
function scaleForStep(steps, idx) {
  for (let i = idx; i >= 0; i--) {
    const p = phaseOf(steps[i].label);
    if (p === "in")  return 1;
    if (p === "out") return 0.45;
  }
  return 0.55;
}

function BreathingPlayer({ exercise, onClose }) {
  const steps = exercise.steps;
  const totalCycles = exercise.cycles || 1;
  const selfPaced = !!exercise.selfPaced;
  const [phase,   setPhase]   = useState("idle");  // idle | running | done
  const [cycle,   setCycle]   = useState(1);
  const [stepIdx, setStepIdx] = useState(0);
  const [secLeft, setSecLeft] = useState(steps[0].sec);

  const step = steps[stepIdx];
  const transSec = step ? step.sec : 1;
  const scale = phase === "running" ? scaleForStep(steps, stepIdx) : 0.55;

  // Advance to the next step / cycle / finish. Resets secLeft in the SAME
  // update so the countdown effect never sees a stale 0 (which caused skips).
  const advance = () => {
    if (stepIdx < steps.length - 1) {
      const ni = stepIdx + 1;
      setStepIdx(ni); setSecLeft(steps[ni].sec); tap();
    } else if (cycle < totalCycles) {
      setCycle(cycle + 1); setStepIdx(0); setSecLeft(steps[0].sec); tap();
    } else {
      setPhase("done"); tap("success");
    }
  };

  // Single countdown timer. Depends only on phase + secLeft → no race.
  useEffect(() => {
    if (phase !== "running") return;
    if (secLeft <= 0) { advance(); return; }
    const id = setTimeout(() => setSecLeft(s => s - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secLeft]);

  const start   = () => { tap(); setCycle(1); setStepIdx(0); setSecLeft(steps[0].sec); setPhase("running"); };
  const restart = () => { setPhase("idle"); };

  return (
    <div style={S.overlay}>
      <HubBar title={exercise.title} onBack={onClose} onClose={onClose} />
      <div style={{ ...S.overlayScroll, display:"flex", flexDirection:"column", alignItems:"center" }} className="fadeup">
        {phase === "idle" && (
          <>
            <div style={{ fontSize:15, color:"var(--text-3)", lineHeight:1.7, textAlign:"center", margin:"6px 4px 26px" }}>{exercise.intro}</div>
            <BreathCircle scale={0.55} transSec={1} centerTop={<IconWind size={40} />} centerBottom="" />
            {exercise.note && <div style={{ fontSize:13, color:"var(--text-4)", lineHeight:1.6, textAlign:"center", margin:"26px 6px 0" }}>{exercise.note}</div>}
            <button onClick={start} className="pressable" style={{ ...S.doneBtn, background:"var(--grad-green)", color:"var(--on-green)", maxWidth:280 }}>Başla ▶</button>
          </>
        )}

        {phase === "running" && (
          <>
            <div style={{ fontSize:12, color:"var(--text-4)", letterSpacing:1.5, marginTop:6, marginBottom:24 }}>
              {selfPaced ? `ADIM ${stepIdx + 1}/${steps.length}` : `TUR ${cycle}/${totalCycles}`}
            </div>
            <BreathCircle scale={scale} transSec={transSec} centerTop={<span className="num">{secLeft}</span>} centerBottom="sn" />
            <div style={{ fontSize:22, fontWeight:600, color:"var(--text-1)", marginTop:30, textAlign:"center", minHeight:30 }}>{step.label}</div>
            {selfPaced && (
              <button onClick={advance} className="pressable" style={{ ...S.doneBtn, background:"var(--grad-green)", color:"var(--on-green)", maxWidth:280, marginTop:18 }}>
                {stepIdx < steps.length - 1 ? "Sıradaki →" : "Bitir ✓"}
              </button>
            )}
            <button onClick={onClose} className="pressable" style={{ ...S.doneBtn, background:"transparent", border:"1px solid var(--border)", color:"var(--text-3)", maxWidth:200, marginTop:selfPaced?10:24 }}>Durdur</button>
          </>
        )}

        {phase === "done" && (
          <div style={{ textAlign:"center", marginTop:30 }} className="fadein">
            <div style={{ fontSize:56 }} aria-hidden="true">🌿</div>
            <div style={{ fontSize:22, fontWeight:700, color:"var(--green)", marginTop:12 }}>Tamamlandı</div>
            <div style={{ fontSize:14, color:"var(--text-3)", marginTop:8, lineHeight:1.6 }}>Bir an dur, nasıl hissettiğini fark et.</div>
            <button onClick={restart} className="pressable" style={{ ...S.doneBtn, background:"transparent", border:"1px solid var(--border)", color:"var(--text-2)", maxWidth:240 }}>Tekrar yap</button>
            <button onClick={onClose} className="pressable" style={{ ...S.doneBtn, background:"var(--grad-green)", color:"var(--on-green)", maxWidth:240, marginTop:10 }}>Bitir ✓</button>
          </div>
        )}
      </div>
    </div>
  );
}
function BreathCircle({ scale, transSec, centerTop, centerBottom }) {
  return (
    <div style={{ width:240, height:240, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
      <div style={{
        position:"absolute", width:240, height:240, borderRadius:"50%",
        background:"var(--grad-breath-halo)",
      }} />
      <div className="no-theme-anim" style={{
        width:200, height:200, borderRadius:"50%",
        background:"var(--grad-breath)",
        border:"2px solid var(--green-edge)",
        boxShadow:"var(--glow-breath)",
        transform:`scale(${scale})`,
        // Nefes döngüsü mod değişiminde kesilmemeli → geçici tema geçişinden muaf (§8)
        transition:`transform ${transSec}s ease-in-out`,
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        color:"var(--breath-text)",
      }}>
        <div style={{ fontSize:46, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{centerTop}</div>
        {centerBottom && <div style={{ fontSize:13, color:"var(--breath-text-2)", marginTop:-2 }}>{centerBottom}</div>}
      </div>
    </div>
  );
}

// ── Program viewer (5-day guided program) ────────────────────
function ProgramView({ program, done, onToggle, onClose }) {
  const total = program.days.length;
  const completed = done.length;
  const pct = Math.round((completed / total) * 100);
  return (
    <div style={S.overlay}>
      <HubBar title="Program" onBack={onClose} onClose={onClose} />
      <div style={S.overlayScroll} className="fadeup">
        <div style={{ fontSize:22, fontWeight:700, color:"var(--text-1)", lineHeight:1.3, marginBottom:10, letterSpacing:-0.3 }}>{program.title}</div>
        <div style={{ fontSize:15, color:"var(--text-2)", lineHeight:1.7, marginBottom:16 }}>{program.intro}</div>
        <ProgressBar pct={pct} gradient="linear-gradient(90deg,var(--blue),var(--violet))" />
        <div style={{ fontSize:12, color:"var(--text-4)", margin:"6px 0 20px" }}>{completed}/{total} gün tamamlandı</div>

        {program.days.map(d => {
          const isDone = done.includes(d.day);
          return (
            <div key={d.day} className="themed" style={{ background:"var(--surface-2)", border:`1px solid ${isDone?"var(--green-line)":"var(--border)"}`, borderRadius:16, padding:"16px 18px", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div className="num" style={{ fontSize:12.5, fontWeight:700, color:"var(--blue)", background:"var(--badge-blue-bg)", borderRadius:8, padding:"3px 9px" }}>GÜN {d.day}</div>
                <div style={{ fontSize:15, fontWeight:600, color:"var(--text-1)", flex:1 }}>{d.title}</div>
              </div>
              <div style={{ fontSize:15, color:"var(--text-2)", lineHeight:1.7, marginBottom:12 }}>{d.body}</div>
              <div className="themed" style={{ padding:"12px 14px", background:"var(--surface-1)", borderLeft:"3px solid var(--amber)", borderRadius:10, marginBottom:12 }}>
                <SectionLabel style={{ color:"var(--amber)", marginBottom:5 }}>bugünkü görev</SectionLabel>
                <div style={{ fontSize:15, color:"var(--text-1)", lineHeight:1.6 }}>{d.task}</div>
              </div>
              <button onClick={() => onToggle(d.day)} className="pressable" style={{
                width:"100%", padding:"12px", borderRadius:12, cursor:"pointer", fontSize:14, fontWeight:600,
                background: isDone ? "var(--green-soft)" : "var(--surface-3)",
                border: `1px solid ${isDone ? "var(--green)" : "var(--border)"}`,
                color: isDone ? "var(--green)" : "var(--text-2)",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              }}>
                {isDone && <IconCheck size={16} />}
                {isDone ? "Tamamlandı" : "Tamamladım olarak işaretle"}
              </button>
            </div>
          );
        })}

        {completed === total && program.closing && (
          <div style={{ marginTop:4, padding:"18px 20px", background:"var(--grad-closing)", border:"1px solid var(--green-line)", borderRadius:16 }}>
            <div style={{ fontSize:32, textAlign:"center", marginBottom:8 }} aria-hidden="true">🎉</div>
            <div style={{ fontSize:15, color:"var(--success-text)", lineHeight:1.7, textAlign:"center" }}>{program.closing}</div>
          </div>
        )}
        <button onClick={onClose} className="pressable" style={S.doneBtn}>Kapat</button>
      </div>
    </div>
  );
}

// ── Paywall ──────────────────────────────────────────────────
function Paywall({ priceString, purchasing, onBuy, onRestore, onClose }) {
  const benefits = [
    [<IconBook size={19} key="b" />,    "Kaygı modülleri",             "Düşünce tuzakları, kaygı dalgası, sınav anında kilitlenme"],
    [<IconTarget size={19} key="t" />,  "Sınav günü rehberi",          "Önceki gece, sabah rutini, sınav anı stratejileri"],
    [<IconWind size={19} key="w" />,    "Nefes & gevşeme",             "Süreli, rehberli nefes ve gevşeme egzersizleri"],
    [<IconSparkle size={19} key="s" />, "Mükemmeliyetçilik programı",  "5 günlük rehberli mini program"],
    [<IconClock size={19} key="c" />,   "Erteleme programı",           "5 günlük rehberli mini program"],
  ];
  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div style={S.modalCard} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Exam Bro Pro">
        <div style={{ width:36, height:4, borderRadius:999, background:"var(--handle)", margin:"0 auto 18px" }} />
        <div style={{ textAlign:"center", marginBottom:6 }}>
          <div style={{ color:"var(--violet)", display:"flex", justifyContent:"center" }}><IconSparkle size={36} /></div>
          <div style={{ fontSize:23, fontWeight:700, color:"var(--text-1)", marginTop:8, letterSpacing:-0.3 }}>Exam Bro Pro</div>
          <div style={{ fontSize:13.5, color:"var(--text-3)", marginTop:4 }}>Bir psikolog tarafından hazırlanan tüm içeriklere erişim</div>
        </div>
        <div style={{ margin:"18px 0" }}>
          {benefits.map(([icon, t, s]) => (
            <div key={t} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:14, textAlign:"left" }}>
              <span style={{
                width:36, height:36, borderRadius:10, background:"var(--violet-soft)",
                border:"1px solid var(--violet-line)", color:"var(--violet)",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              }}>{icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:600, color:"var(--text-1)", lineHeight:1.3 }}>{t}</div>
                <div style={{ fontSize:13, color:"var(--text-3)", marginTop:3, lineHeight:1.5 }}>{s}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center", fontSize:13, color:"var(--text-3)", marginBottom:12 }}>
          Tek seferlik ödeme · ömür boyu erişim · abonelik yok
        </div>
        <button onClick={onBuy} disabled={purchasing} className="pressable" style={{
          width:"100%", padding:"15px", borderRadius:"var(--r-md)", border:"none", cursor:purchasing?"default":"pointer",
          background:"var(--grad-brand-135)", color:"var(--on-accent)", fontSize:16.5, fontWeight:700, opacity:purchasing?0.6:1,
        }}>
          {purchasing ? "İşleniyor..." : (priceString ? `${priceString} — Pro'ya Geç` : "Pro'ya Geç")}
        </button>
        <button onClick={onRestore} disabled={purchasing} className="pressable" style={{ width:"100%", marginTop:10, padding:"12px", borderRadius:12, background:"transparent", border:"1px solid var(--border)", color:"var(--text-3)", fontSize:13.5, cursor:"pointer" }}>
          Satın alımı geri yükle
        </button>
        <button onClick={onClose} className="pressable" style={{ width:"100%", marginTop:8, padding:"10px", background:"none", border:"none", color:"var(--text-4)", fontSize:13.5, cursor:"pointer" }}>
          Şimdi değil
        </button>
      </div>
    </div>
  );
}

// ── Exams ────────────────────────────────────────────────────
function ExamsTab({ grade, hidden, onToggle, customs, onAdd, onDel }) {
  // Sınav rengi VERİ. Bu sekmede METİN olarak kullanıldığı 7 yerde açık modda
  // ink()'ten geçer (docs/LIGHT-MODE.md §6). Hepsi kova 1 (normal metin, 4.5:1):
  // en büyüğü 16px/600, hiçbiri WCAG'in "büyük metin" eşiğini (18.66px bold)
  // geçmiyor. Kart yıkaması / kenarlığı metin değil → tint() ham ex.c ile kalır.
  const { theme } = useTheme();
  const [view,  setView]  = useState("list");
  const [name,  setName]  = useState("");
  const [date,  setDate]  = useState("");
  const [time,  setTime]  = useState("09:00");
  const [subj,  setSubj]  = useState("");
  const subjects = SUBJ[grade] || [];
  const cats     = [...new Set(OSYM.map(e => e.cat))];
  const isAdded  = id => customs.some(e => e.id === id);
  const handleAdd = () => {
    if (!name.trim() || !date) return;
    onAdd({ id:`m_${Date.now()}`, n:name.trim(), sub:subj, date:`${date}T${time}:00`, c:"#ffbe0b" });
    setName(""); setDate(""); setTime("09:00"); setSubj(""); setView("list");
    tap("success");
  };
  if (view === "osym") return (
    <div className="fadeup">
      <BackBtn onClick={() => setView("list")} title="ÖSYM Takvimi" />
      <div style={{ fontSize:12.5, color:"var(--text-4)", marginBottom:18 }}>Kaynak: ÖSYM 2026 Resmi Sınav Takvimi</div>
      {cats.map(cat => (
        <div key={cat}>
          <SectionLabel>{cat}</SectionLabel>
          {OSYM.filter(e => e.cat === cat).map(ex => {
            const r = remaining(ex.date);
            const added = isAdded(ex.id);
            const c = ink(ex.c, theme);
            return (
              <Card key={ex.id} style={{ marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center", borderColor:added?"var(--green-line)":undefined }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:15, color:c }}>{ex.n}</div>
                  <div style={{ fontSize:12.5, color:"var(--text-3)", marginTop:2 }}>{ex.sub}</div>
                  <div style={{ fontSize:11.5, color:"var(--text-4)", marginTop:2 }}>{new Date(ex.date).toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"})}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                  {!r.done && <div className="num" style={{ fontSize:12, color:c }}>{r.d}g kaldı</div>}
                  {r.done  && <div style={{ fontSize:12, color:"var(--text-4)" }}>Geçti</div>}
                  {!r.done && (
                    <button onClick={() => { if (!added) { tap(); onAdd({...ex}); } }} className={added ? "" : "pressable"}
                      aria-label={added ? `${ex.n} eklendi` : `${ex.n} sınavını ekle`}
                      style={{ background:added?"var(--green-soft)":"var(--surface-3)", border:`1px solid ${added?"var(--green)":"var(--border)"}`, color:added?"var(--green)":"var(--text-2)", borderRadius:10, padding:"8px 14px", cursor:added?"default":"pointer", fontSize:13, fontWeight:600, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:5 }}>
                      {added ? <><IconCheck size={14} /> Eklendi</> : <><IconPlus size={14} /> Ekle</>}
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
  if (view === "manual") return (
    <div className="fadeup">
      <BackBtn onClick={() => setView("list")} title="Manuel Sınav Ekle" />
      <input className="themed" value={name} onChange={e => setName(e.target.value)} placeholder="Sınav adı (örn. Matematik Yazılı)" style={S.inp} aria-label="Sınav adı" />
      {/* date/time picker'ının açık/koyu görünümü :root'taki color-scheme'den
          kalıtılıyor — buraya inline colorScheme YAZMA (docs/LIGHT-MODE.md §4). */}
      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        <input className="themed" type="date" value={date} onChange={e => setDate(e.target.value)} style={{...S.inp, flex:2, marginBottom:0}} aria-label="Sınav tarihi" />
        <input className="themed" type="time" value={time} onChange={e => setTime(e.target.value)} style={{...S.inp, flex:1, marginBottom:0}} aria-label="Sınav saati" />
      </div>
      <div style={{ fontSize:13, color:"var(--text-3)", margin:"12px 0 8px" }}>Ders (opsiyonel):</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
        {subjects.map(s => (
          <button key={s} onClick={() => { tap(); setSubj(subj === s ? "" : s); }} className="pressable"
            style={{ background:subj===s?"var(--violet)":"var(--surface-3)", border:"1px solid " + (subj===s?"var(--violet)":"var(--border)"), borderRadius:20, padding:"8px 14px", color:subj===s?"var(--on-accent)":"var(--text-2)", fontSize:13, cursor:"pointer", fontWeight:500 }}>
            {s}
          </button>
        ))}
      </div>
      <input className="themed" value={subjects.includes(subj) ? "" : subj} onChange={e => setSubj(e.target.value)} placeholder="Veya farklı bir şey yaz..." style={{...S.inp, marginBottom:16}} aria-label="Farklı ders" />
      <button onClick={handleAdd} disabled={!name.trim() || !date} className="pressable" style={{
        width:"100%", background: (!name.trim() || !date) ? "var(--surface-3)" : "var(--grad-gold)",
        border:"none", borderRadius:"var(--r-md)", padding:15,
        color: (!name.trim() || !date) ? "var(--text-4)" : "var(--on-gold)",
        fontSize:16.5, fontWeight:700, cursor: (!name.trim() || !date) ? "default" : "pointer",
      }}>Sınav Ekle</button>
    </div>
  );
  return (
    <div className="fadeup">
      <div style={S.pageTitle}>Sınavlarım</div>
      <div style={S.pageSub}>Görmek istediklerini seç, istediklerini ekle</div>
      <SectionLabel>Ulusal Sınavlar</SectionLabel>
      <div style={{ fontSize:12.5, color:"var(--text-4)", marginBottom:12 }}>Karta dokunarak sayacı göster ya da gizle</div>
      {FIXED.map(ex => {
        const hide = hidden.includes(ex.id);
        const info = examInfoFor(ex);
        const r = remaining(info ? info.date : ex.date);
        const c = ink(ex.c, theme);
        return (
          <button key={ex.id} onClick={() => { tap(); onToggle(ex.id); }} className="pressable"
            aria-pressed={!hide} aria-label={`${ex.n} sayacı ${hide ? "gizli" : "görünür"}`}
            style={{ display:"flex", width:"100%", textAlign:"left", background:hide?"var(--surface-1)":`linear-gradient(135deg,${tint(ex.c, "--tint-weak", "12")},transparent)`, border:`1px solid ${hide?"var(--border-soft)":tint(ex.c, "--tint-edge", "30")}`, borderRadius:"var(--r-md)", padding:"14px 16px", marginBottom:8, justifyContent:"space-between", alignItems:"center", cursor:"pointer", opacity:hide?0.55:1, transition:"all 0.2s", color:"inherit" }}>
            <span>
              <span style={{ display:"block", fontWeight:600, fontSize:16, color:hide?"var(--text-4)":c }}>{ex.n}{info?.isEstimate ? " (tahmini)" : ""}</span>
              <span style={{ display:"block", fontSize:11.5, color:"var(--text-4)", marginTop:3 }}>{(info ? info.date : new Date(ex.date)).toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"})}</span>
            </span>
            <span style={{ display:"flex", gap:12, alignItems:"center" }}>
              {info?.isExamDay && !hide && <span style={{ fontSize:13, color:c, fontWeight:700 }}>bugün! 🍀</span>}
              {!info?.isExamDay && !r.done && !hide && <span className="num" style={{ fontSize:14, color:c }}>{r.d}g</span>}
              <span style={{ color: hide ? "var(--text-4)" : "var(--text-2)", display:"flex" }}>
                {hide ? <IconEyeOff size={20} /> : <IconEye size={20} />}
              </span>
            </span>
          </button>
        );
      })}
      {customs.length > 0 && (
        <>
          <SectionLabel style={{ color:"var(--gold)", margin:"18px 0 10px" }}>Eklediğim Sınavlar</SectionLabel>
          {customs.map(ex => {
            const r = remaining(ex.date);
            const c = ink(ex.c, theme);   // ex.c yoksa ink() undefined döner → alttaki || devreye girer
            return (
              <Card key={ex.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, padding:"13px 16px" }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:15, color:c||"var(--text-1)" }}>{ex.n}</div>
                  {ex.sub && <div style={{ fontSize:12.5, color:"var(--text-3)", marginTop:2 }}>{ex.sub}</div>}
                  <div style={{ fontSize:11.5, color:"var(--text-4)", marginTop:2 }}>{new Date(ex.date).toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"})}</div>
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <span className="num" style={{ fontSize:14, color:c||"var(--gold)" }}>{r.done?"✓":`${r.d}g`}</span>
                  <button onClick={() => { tap(); onDel(ex.id); }} className="pressable" aria-label={`${ex.n} sınavını sil`}
                    style={{ background:"transparent", border:"none", color:"var(--danger-muted)", width:44, height:44, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <IconTrash size={18} />
                  </button>
                </div>
              </Card>
            );
          })}
        </>
      )}
      <div style={{ display:"flex", gap:10, marginTop:18 }}>
        <button onClick={() => { tap(); setView("osym"); }} className="pressable" style={{ flex:1, background:"var(--surface-2)", border:"1px solid var(--violet-line-3)", borderRadius:"var(--r-md)", padding:"16px 10px", color:"var(--violet-light)", fontSize:14.5, fontWeight:600, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <IconCalendar size={24} />ÖSYM Takvimi
        </button>
        <button onClick={() => { tap(); setView("manual"); }} className="pressable" style={{ flex:1, background:"var(--surface-2)", border:"1px dashed var(--gold-line)", borderRadius:"var(--r-md)", padding:"16px 10px", color:"var(--gold)", fontSize:14.5, fontWeight:600, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <IconPlus size={24} />Manuel Ekle
        </button>
      </div>
    </div>
  );
}

// ── Goals ────────────────────────────────────────────────────
function GoalsTab({ grade, goals, onAdd, onToggle, onDel }) {
  const d = today();
  const [inp, setInp] = useState("");
  const [focused, setFocused] = useState(false);
  const list = goals[d] || [];
  const done = list.filter(g => g.done).length;
  const pct  = list.length ? Math.round(done / list.length * 100) : 0;
  const add  = () => { if (!inp.trim()) return; onAdd(d, inp.trim()); setInp(""); tap(); };
  const suggestions = goalSuggestions(grade);
  // Henüz bugün eklenmemiş önerileri göster
  const freshSuggestions = suggestions.filter(s => !list.some(g => g.text === s));
  const showSuggestions = (focused || inp === "") && freshSuggestions.length > 0;
  return (
    <div className="fadeup">
      <div style={S.pageTitle}>Günlük Hedefler</div>
      <div style={S.pageSub}>Bugün ne yapacaksın?</div>
      {list.length > 0 && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontSize:14, fontWeight:600, color:"var(--text-2)" }}>İlerleme</span>
            <span className="num" style={{ fontSize:15, fontWeight:700, color:pct===100?"var(--green)":pct>=50?"var(--gold)":"var(--text-3)" }}>{done}/{list.length} — %{pct}</span>
          </div>
          <ProgressBar pct={pct} />
          {pct === 100 && <div style={{ textAlign:"center", color:"var(--green)", fontWeight:600, fontSize:15, marginTop:12 }}>🎉 Hepsini bitirdin.</div>}
        </Card>
      )}
      {list.map(g => (
        <div key={g.id} className="themed" style={{ background:"var(--surface-3)", border:`1px solid ${g.done?"var(--green-line)":"var(--border)"}`, borderRadius:"var(--r-md)", padding:"6px 6px 6px 8px", marginBottom:8, display:"flex", alignItems:"center", gap:4 }}>
          <button onClick={() => { tap(); onToggle(d, g.id); }} aria-label={g.done ? `${g.text} — tamamlandı, geri al` : `${g.text} — tamamla`}
            style={{ width:44, height:44, background:"transparent", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, padding:0 }}>
            <span style={{ width:26, height:26, borderRadius:"50%", border:`2px solid ${g.done?"var(--green)":"var(--border-strong)"}`, background:g.done?"var(--green)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", color:"var(--on-green)" }}>
              {g.done && <IconCheck size={15} />}
            </span>
          </button>
          <span style={{ flex:1, fontSize:15, textDecoration:g.done?"line-through":"none", color:g.done?"var(--text-4)":"var(--text-1)", padding:"10px 0" }}>{g.text}</span>
          <button onClick={() => { tap(); onDel(d, g.id); }} aria-label={`${g.text} hedefini sil`}
            style={{ background:"none", border:"none", color:"var(--text-4)", cursor:"pointer", width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, padding:0 }}>
            <IconX size={16} />
          </button>
        </div>
      ))}
      {showSuggestions && (
        <div style={{ marginTop:8, marginBottom:2 }}>
          <div style={{ fontSize:11.5, color:"var(--text-4)", marginBottom:8, marginLeft:2 }}>öneriler · dokun, ekle</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
            {freshSuggestions.map(s => (
              <button key={s} onMouseDown={e => { e.preventDefault(); onAdd(d, s); tap(); }} className="pressable"
                style={{ background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:20, padding:"9px 14px", color:"var(--violet-text-3)", fontSize:13, cursor:"pointer", fontWeight:500 }}>
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display:"flex", gap:8, marginTop:10 }}>
        <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Yeni hedef ekle..." aria-label="Yeni hedef" className="themed"
          style={{ flex:1, background:"var(--surface-3)", border:"1px solid var(--border)", borderRadius:"var(--r-sm)", padding:"13px 16px", color:"var(--text-1)", fontSize:15 }} />
        <button onClick={add} className="pressable" aria-label="Hedefi ekle" style={{ background:"var(--grad-green)", border:"none", borderRadius:"var(--r-sm)", width:52, color:"var(--on-green)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <IconPlus size={22} />
        </button>
      </div>
      {list.length === 0 && (
        <EmptyState style={{ marginTop:16 }} icon={<IconTarget size={30} />} title="Henüz hedef yok"
          body="Küçük bir şey bile yaz — bir konu, 10 soru, kısa bir tekrar." />
      )}
    </div>
  );
}

// ── Anxiety ──────────────────────────────────────────────────
function AnxietyTab({ log, onRate }) {
  const { theme } = useTheme();
  const d = today();
  const [val, setVal] = useState(log[d] || null);
  const pick = v => { tap(); setVal(v); onRate(d, v); };
  const noteText = ANX_NOTES[Math.floor(Date.now() / 86400000) % ANX_NOTES.length];
  const days = [];
  for (let i = 34; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    days.push(dayKey(dt));
  }
  const weekHeads = days.slice(0, 7).map(ds => new Date(ds).toLocaleDateString("tr-TR", { weekday:"narrow" }));
  const label = v => !v?"—":v<=3?"😊 sakin & odaklı":v<=6?"😐 orta seviye":v<=8?"😰 yoğun":"🆘 çok yüksek";
  return (
    <div className="fadeup">
      <div style={S.pageTitle}>Kaygı Takibi</div>
      <div style={S.pageSub}>Duygusal örüntülerini keşfet</div>
      <Card style={{ marginBottom:20 }}>
        <div style={{ fontSize:15, fontWeight:600, marginBottom:14, color:"var(--text-1)" }}>bugün nasıl hissediyorsun?</div>
        <div role="radiogroup" aria-label="Kaygı seviyesi, 1 sakin, 10 çok yüksek">
          {[[1,2,3,4,5],[6,7,8,9,10]].map((row, ri) => (
            <div key={ri} style={{ display:"flex", gap:6, marginBottom:6 }}>
              {row.map(v => (
                <button key={v} role="radio" aria-checked={val===v} aria-label={`${v}`} onClick={() => pick(v)} style={{
                  flex:1, height:48, borderRadius:"var(--r-sm)", minWidth:0,
                  background: val===v ? anxFill(v, theme) : "var(--surface-input)",
                  border: `2px solid ${val===v ? anxSolid(v) : "transparent"}`,
                  color: val===v ? "var(--on-accent)" : "var(--text-3)", fontSize:15, fontWeight:700,
                  cursor:"pointer",
                  transform: val===v ? "scale(1.06)" : "scale(1)",
                  transition:"all 0.15s",
                  boxShadow: val===v ? `0 4px 14px ${anxColor(v, theme)}` : "none",
                }} className="num">{v}</button>
              ))}
            </div>
          ))}
        </div>
        {val
          ? <div style={{ textAlign:"center", fontSize:16, fontWeight:600, padding:10, borderRadius:12, marginTop:8, ...anxPillStyle(val, theme) }}>{label(val)}</div>
          : <div style={{ textAlign:"center", fontSize:13, color:"var(--text-4)", marginTop:8 }}>1 = tamamen sakin &nbsp;·&nbsp; 10 = çok yüksek kaygı</div>
        }
      </Card>
      <div style={{ display:"flex", gap:16, marginBottom:14, fontSize:12 }}>
        {[["low","1–3 Sakin"],["mid","4–6 Orta"],["high","7–10 Yüksek"]].map(([b,l]) => (
          <div key={l} style={{ display:"flex", alignItems:"center", gap:5, color:"var(--text-3)" }}>
            <div style={{ width:11, height:11, borderRadius:3, background:anxLegend(b, theme) }} />{l}
          </div>
        ))}
      </div>
      <SectionLabel>son 35 gün</SectionLabel>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5, marginBottom:6 }}>
        {weekHeads.map((w, i) => (
          <div key={i} style={{ textAlign:"center", fontSize:10, color:"var(--text-4)", fontWeight:600 }}>{w}</div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5 }}>
        {days.map(ds => (
          <div key={ds} title={ds} style={{ aspectRatio:"1", borderRadius:7, background:anxColor(log[ds]||null, theme), border:ds===d?"2px solid var(--today-ring)":"1px solid var(--border-grid)", position:"relative" }}>
            {ds === d && <div style={{ position:"absolute", bottom:2, right:2, width:5, height:5, background:"var(--gold)", borderRadius:"50%" }} />}
          </div>
        ))}
      </div>
      <div style={{ textAlign:"center", marginTop:10, fontSize:11.5, color:"var(--text-4)" }}>her kare bir gün — bugün sağ altta işaretli</div>
      <div className="themed" style={{ marginTop:20, padding:"18px 20px", background:"var(--surface-1)", border:"1px solid var(--border-soft)", borderRadius:"var(--r-lg)", borderLeft:"3px solid var(--green)" }}>
        <SectionLabel style={{ color:"var(--green)" }}>günün notu</SectionLabel>
        <div style={{ fontSize:14, color:"var(--text-2)", lineHeight:1.7 }}>{noteText}</div>
      </div>
    </div>
  );
}

// ── Report ───────────────────────────────────────────────────
function ReportTab({ studied, streak, anxiety, goals, onReset, notifOn, onToggleNotif, onChangeGrade, gradeInfo }) {
  const { theme } = useTheme();
  const now  = new Date();
  const week = Array.from({length:7}, (_, i) => { const d = new Date(now); d.setDate(now.getDate()-6+i); return dayKey(d); });
  const studiedW = week.filter(d => studied.includes(d)).length;
  const anxVals  = week.map(d => anxiety[d]).filter(Boolean);
  const avgAnx   = anxVals.length ? (anxVals.reduce((a,b)=>a+b,0)/anxVals.length).toFixed(1) : null;
  const todayG   = goals[today()] || [];
  const donePct  = todayG.length ? Math.round(todayG.filter(g=>g.done).length/todayG.length*100) : null;
  const [msg, detail] = studiedW>=5
    ? ["bu hafta iyi geçti.","Zirvede uçuyorsun. Böyle devam et."]
    : studiedW>=3
    ? ["gidiyorsun.","Ortalamanın üstündesin. Küçük adımlar büyük yolculuklar."]
    : studiedW>=1
    ? ["başladın.","Bu önemli. Haftaya daha fazlasını yapabilirsin."]
    : ["henüz başlamadın.","Yarın sadece 20 dakika. O kadar."];
  return (
    <div className="fadeup">
      <div style={S.pageTitle}>Haftalık Rapor</div>
      <div style={S.pageSub}>son 7 günün özeti</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
        <Stat icon={<IconBook size={20} />}  label="Çalışılan Gün" value={`${studiedW}/7`}   color="var(--green)" />
        <Stat icon={<IconFlame size={20} />} label="Seri"          value={`${streak} gün`}   color="var(--orange)" />
        <Stat icon={<IconPulse size={20} />} label="Ort. Kaygı"    value={avgAnx?`${avgAnx}/10`:"—"} color={avgAnx?anxSolid(parseFloat(avgAnx)):"var(--text-4)"} />
        <Stat icon={<IconTarget size={20} />} label="Bugün Hedef"  value={donePct!=null?`%${donePct}`:"—"} color="var(--violet)" />
      </div>
      <Card style={{ marginBottom:14 }}>
        <div style={{ fontWeight:600, marginBottom:14, color:"var(--text-2)", fontSize:14.5 }}>bu hafta çalışma</div>
        <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:60 }}>
          {week.map(d => {
            const s=studied.includes(d), isT=d===today();
            return (
              <div key={d} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                {/* Kütüğe kenarlık: koyu modda --track-line saydam → render aynı */}
                <div className="no-theme-anim" style={{ width:"100%", background:s?"var(--grad-green-bar)":"var(--track)", border:s?"none":"1px solid var(--track-line)", borderRadius:5, height:s?48:8, transition:"height 0.3s", outline:isT?"2px solid var(--gold)":"none", outlineOffset:-1 }} />
                <div style={{ fontSize:10, color:isT?"var(--gold)":"var(--text-4)", fontWeight:isT?700:400 }}>{new Date(d).toLocaleDateString("tr-TR",{weekday:"narrow"})}</div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card style={{ marginBottom:14 }}>
        <div style={{ fontWeight:600, marginBottom:14, color:"var(--text-2)", fontSize:14.5 }}>bu hafta kaygı</div>
        <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:60 }}>
          {week.map(d => {
            const v = anxiety[d];
            return (
              <div key={d} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div className="no-theme-anim" style={{ width:"100%", background:v?anxBarColor(v, theme):"var(--track)", border:v?"none":"1px solid var(--track-line)", borderRadius:5, height:v?v*5.5:8, transition:"height 0.3s" }} />
                <div style={{ fontSize:10, color:"var(--text-4)" }}>{new Date(d).toLocaleDateString("tr-TR",{weekday:"narrow"})}</div>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="themed" style={{ padding:"20px 22px", background:"var(--surface-1)", border:"1px solid var(--border-soft)", borderRadius:"var(--r-lg)", borderLeft:"3px solid var(--violet)", marginBottom:24 }}>
        {/* 18px/700 → 18 < 18.66, WCAG'de BÜYÜK metin değil → 4.5:1 kovası */}
        <div style={{ fontSize:18, fontWeight:700, marginBottom:8, color:"var(--text-1)" }}>{msg}</div>
        <div style={{ fontSize:14, color:"var(--text-3)", lineHeight:1.65 }}>{detail}</div>
      </div>

      {/* ── Ayarlar ── */}
      <SectionLabel>ayarlar</SectionLabel>
      <Card style={{ padding:"4px 0", marginBottom:20 }}>
        <SettingsRow
          icon={<IconBell size={19} />}
          title="Günlük hatırlatma"
          sub={notifOn ? "Her akşam 20:00 · içerik her gün değişir" : "Kapalı"}
          right={<ToggleSwitch on={notifOn} />}
          onClick={onToggleNotif}
          ariaLabel={notifOn ? "Günlük hatırlatmayı kapat" : "Günlük hatırlatmayı aç"}
        />
        <div style={S.divider} />
        <SettingsRow
          icon={<IconSwap size={19} />}
          title="Sınıfı değiştir"
          sub={`Şu an: ${gradeInfo.l}`}
          right={<span style={{ color:"var(--text-4)", display:"flex" }}><IconChevronRight size={17} /></span>}
          onClick={() => { tap(); onChangeGrade(); }}
          ariaLabel="Sınıfı değiştir"
        />
        <div style={S.divider} />
        <SettingsRow
          icon={<IconTrash size={19} />}
          title="Tüm verileri sıfırla"
          sub="Geri alınamaz"
          danger
          onClick={() => { tap(); onReset(); }}
          ariaLabel="Tüm verileri sıfırla"
        />
      </Card>
    </div>
  );
}

function SettingsRow({ icon, title, sub, right, onClick, danger, ariaLabel }) {
  return (
    <button onClick={onClick} aria-label={ariaLabel} className="pressable" style={{
      display:"flex", width:"100%", alignItems:"center", gap:14, padding:"14px 18px",
      background:"transparent", border:"none", cursor:"pointer", textAlign:"left", color:"inherit",
    }}>
      <span style={{ color: danger ? "var(--danger)" : "var(--text-3)", display:"flex", flexShrink:0 }}>{icon}</span>
      <span style={{ flex:1 }}>
        <span style={{ display:"block", fontSize:15, fontWeight:500, color: danger ? "var(--danger)" : "var(--text-1)" }}>{title}</span>
        {sub && <span style={{ display:"block", fontSize:12.5, color:"var(--text-4)", marginTop:2 }}>{sub}</span>}
      </span>
      {right}
    </button>
  );
}
function ToggleSwitch({ on }) {
  return (
    <span aria-hidden="true" style={{
      width:46, height:28, borderRadius:999, flexShrink:0, position:"relative",
      background: on ? "var(--green)" : "var(--switch-off)", transition:"background 0.2s",
      display:"inline-block",
    }}>
      <span style={{
        position:"absolute", top:3, left: on ? 21 : 3, width:22, height:22,
        borderRadius:"50%", background:"var(--switch-knob)", transition:"left 0.2s",
        boxShadow:"var(--shadow-knob)",
      }} />
    </span>
  );
}

// ── Shared UI ────────────────────────────────────────────────
function Stat({ icon, label, value, color }) {
  return (
    <div className="themed" style={{ background:"var(--surface-2)", border:"1px solid var(--border-soft)", borderRadius:16, padding:"16px 14px", textAlign:"center" }}>
      <div style={{ color, display:"flex", justifyContent:"center" }}>{icon}</div>
      <div className="num" style={{ fontSize:21, fontWeight:700, color, marginTop:8 }}>{value}</div>
      <div style={{ fontSize:12, color:"var(--text-4)", marginTop:3 }}>{label}</div>
    </div>
  );
}
function BackBtn({ onClick, title }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
      <button onClick={onClick} className="pressable" aria-label="Geri" style={{ background:"var(--surface-3)", border:"1px solid var(--border)", color:"var(--text-2)", padding:"9px 14px 9px 10px", borderRadius:"var(--r-sm)", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", gap:4, fontWeight:500 }}>
        <IconChevronLeft size={16} /> Geri
      </button>
      <div style={{ fontSize:19, fontWeight:700, color:"var(--text-1)" }}>{title}</div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────
const S = {
  root:       { background:"var(--bg)", minHeight:"100vh", color:"var(--text-1)", paddingBottom:"calc(84px + env(safe-area-inset-bottom))", maxWidth:480, margin:"0 auto", position:"relative" },
  header:     { padding:"calc(16px + env(safe-area-inset-top)) 20px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:"var(--header-bg)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", zIndex:10, borderBottom:"1px solid var(--border-soft)" },
  logo:       { fontSize:21, fontWeight:700, background:"var(--grad-logo)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:-0.4, lineHeight:1.15 },
  headerSub:  { fontSize:12, color:"var(--text-4)", marginTop:1 },
  proBadge:   { background:"var(--grad-brand-135)", borderRadius:20, padding:"5px 10px", fontSize:11.5, fontWeight:700, color:"var(--on-accent)", display:"flex", alignItems:"center", gap:4 },
  streakBadge:{ background:"var(--orange-soft)", borderRadius:20, padding:"5px 12px", fontSize:14, fontWeight:700, border:"1px solid var(--orange-line)", color:"var(--orange)", display:"flex", alignItems:"center", gap:5 },
  scroll:     { padding:"14px 16px 0" },
  nav:        { position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:"var(--nav-bg)", borderTop:"1px solid var(--border-soft)", display:"flex", zIndex:100, paddingBottom:"env(safe-area-inset-bottom)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)" },
  navBtn:     { flex:1, background:"none", border:"none", padding:"11px 4px 9px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, position:"relative", minHeight:56 },
  navLine:    { position:"absolute", top:0, left:"26%", right:"26%", height:2.5, background:"var(--grad-brand)", borderRadius:999 },
  boom:       { position:"fixed", inset:0, zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--overlay-boom)", pointerEvents:"none", animation:"boomFade 2.6s forwards", backdropFilter:"blur(3px)" },
  pageTitle:  { fontSize:23, fontWeight:700, marginBottom:4, color:"var(--text-1)", letterSpacing:-0.3 },
  pageSub:    { fontSize:14, color:"var(--text-4)", marginBottom:18 },
  inp:        { width:"100%", background:"var(--surface-1)", border:"1px solid var(--border)", borderRadius:"var(--r-sm)", padding:"13px 14px", color:"var(--text-1)", fontSize:15, marginBottom:10, display:"block" },
  // overlay (psychology hub & detail screens)
  overlay:    { position:"fixed", inset:0, zIndex:300, background:"var(--bg)", maxWidth:480, margin:"0 auto", display:"flex", flexDirection:"column" },
  hubBar:     { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"calc(12px + env(safe-area-inset-top)) 16px 12px", borderBottom:"1px solid var(--border-soft)", background:"var(--bg)", position:"sticky", top:0, zIndex:5 },
  hubBackBtn: { background:"var(--surface-3)", border:"1px solid var(--border)", color:"var(--text-2)", padding:"10px 14px 10px 8px", borderRadius:12, cursor:"pointer", fontSize:14, width:84, display:"flex", alignItems:"center", gap:2, fontWeight:500, minHeight:44 },
  hubCloseBtn:{ background:"var(--surface-3)", border:"1px solid var(--border)", color:"var(--text-1)", width:44, height:44, borderRadius:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  overlayScroll:{ flex:1, overflowY:"auto", padding:"16px 16px calc(28px + env(safe-area-inset-bottom))" },
  doneBtn:    { width:"100%", marginTop:24, padding:"14px", borderRadius:"var(--r-md)", border:"none", cursor:"pointer", background:"var(--surface-3)", color:"var(--text-2)", fontSize:15, fontWeight:600 },
  divider:    { height:1, background:"var(--border-soft)", margin:"0 18px" },
  // paywall modal
  modalWrap:  { position:"fixed", inset:0, zIndex:400, background:"var(--overlay-modal)", display:"flex", alignItems:"flex-end", justifyContent:"center", backdropFilter:"blur(4px)" },
  modalCard:  { width:"100%", maxWidth:480, background:"var(--surface-modal)", borderTopLeftRadius:24, borderTopRightRadius:24, border:"1px solid var(--border)", borderBottom:"none", padding:"14px 22px calc(26px + env(safe-area-inset-bottom))", animation:"sheetUp 0.3s ease", maxHeight:"88vh", overflowY:"auto" },
};
