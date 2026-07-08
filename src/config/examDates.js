// ── Merkezi sınav tarihi konfigürasyonu ──────────────────────────────────────
// Resmi tarih açıklandığında tek yapman gereken: aşağıdaki `official` alanını
// güncellemek. Sayaç, fallback mantığı ve "(tahmini)" etiketleri bu dosyaya
// bağlıdır; başka hiçbir yerde sınav tarihi hardcoded DEĞİLDİR.
//
//   8. sınıf            → lgs
//   12. sınıf + mezun   → yks   (TYT günü; AYT bir gün sonrası, offsetDays ile)
export const EXAM_DATES = {
  lgs: {
    official: "2026-06-13T09:30:00+03:00",   // LGS 2026 - 13 Haziran Cumartesi (MEB, Dünya Kupası nedeniyle 14'ünden öne çekildi)
    isOfficial: true,
    label: "LGS 2026",
  },
  yks: {
    official: "2026-06-20T10:15:00+03:00",   // YKS 2026 - TYT 20 Haziran Cumartesi (AYT/YDT 21 Haziran)
    isOfficial: true,
    label: "YKS 2026",
  },
};

const DAY_MS = 86_400_000;
const YEAR_MS = 365 * DAY_MS;               // spec: "official tarih + 365 gün"
const TR_OFFSET_MS = 3 * 3_600_000;         // Türkiye sabit UTC+3 (2016'dan beri DST yok)

// Verilen zaman damgasının Türkiye saatiyle (UTC+3) o günün 00:00'ına denk gelen
// UTC zaman damgası. Sınav "gününü" tutarlı yakalamak için kullanılır.
function trDayStartMs(ms) {
  const local = ms + TR_OFFSET_MS;
  const dayStartLocal = Math.floor(local / DAY_MS) * DAY_MS;
  return dayStartLocal - TR_OFFSET_MS;
}

// Türkiye saatine göre takvim yılı (etiket için: "YKS 2027" vb.)
function trYear(ms) {
  return new Date(ms + TR_OFFSET_MS).getUTCFullYear();
}

// Etiketten yıl ekini soyup sınav adını döndürür: "LGS 2026" → "LGS"
function baseName(label) {
  return String(label).replace(/\s*\d{4}.*$/, "").trim();
}

export const ESTIMATE_NOTE =
  "Tahmini tarih — ÖSYM/MEB resmi takvimi açıkladığında güncellenecektir.";

// ── getTargetDate / getExamTarget ────────────────────────────────────────────
// Kendini yenileyen hedef tarih mantığı:
//   • now, official tarihten ÖNCEYSE       → official tarih (normal sayaç)
//   • now, sınav GÜNÜNDEYSE                 → isExamDay=true ("Sınav günü! 🍀")
//   • sınav günü GEÇTİYSE                   → official + 365*k gün (tahmini),
//                                             gelecekteki ilk tarihe kadar atlar
//
// Aradan yıllar geçse bile yıl yıl ileri atlar; asla geçmişte/negatifte takılmaz.
//
// opts.offsetDays : official'a eklenecek gün (AYT için +1)
// opts.now        : test/enjeksiyon için "şimdi" (vs. Date.now())
export function getExamTarget(examKey, opts = {}) {
  const conf = EXAM_DATES[examKey];
  if (!conf) return null;

  const offsetDays = opts.offsetDays || 0;
  const now = opts.now != null ? opts.now : Date.now();

  const officialMs = new Date(conf.official).getTime() + offsetDays * DAY_MS;

  // Sınav gününün sonu geçmişse bir sonraki yıla atla (gerekirse defalarca).
  let targetMs = officialMs;
  let years = 0;
  while (now >= trDayStartMs(targetMs) + DAY_MS) {
    targetMs += YEAR_MS;
    years += 1;
  }

  const isEstimate = years > 0;
  const isExamDay =
    now >= trDayStartMs(targetMs) && now < trDayStartMs(targetMs) + DAY_MS;

  const label = isEstimate
    ? `${baseName(conf.label)} ${trYear(targetMs)} (tahmini)`
    : conf.label;

  return {
    examKey,
    date: new Date(targetMs),     // sayacın geri saydığı hedef
    ms: targetMs,
    label,                        // "YKS 2026" / "YKS 2027 (tahmini)"
    isEstimate,                   // resmi tarih geçti → tahmini moda geçildi
    isExamDay,                    // bugün sınav günü → mesaj göster
    note: isEstimate ? ESTIMATE_NOTE : null,
    yearsRolled: years,
  };
}

// Sadece hedef Date isteyen yerler için kısa yardımcı (spec'teki getTargetDate).
export function getTargetDate(examKey, opts = {}) {
  const t = getExamTarget(examKey, opts);
  return t ? t.date : null;
}
