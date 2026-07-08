// Saf mantık testi — `node src/config/examDates.test.mjs` ile çalışır.
// getExamTarget'a opts.now enjekte ederek tüm zaman senaryolarını dener.
import { getExamTarget, EXAM_DATES } from "./examDates.js";

let pass = 0, fail = 0;
const ms = (iso) => new Date(iso).getTime();
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  ${extra}`); }
}

console.log("LGS (examKey: lgs, official 2026-06-13T09:30:00+03:00)");
{
  // 1) Sınavdan önce → normal sayaç
  const t = getExamTarget("lgs", { now: ms("2026-06-10T12:00:00+03:00") });
  check("önce: normal mod", !t.isEstimate && !t.isExamDay);
  check("önce: hedef = official", t.ms === ms(EXAM_DATES.lgs.official), `got ${t.date.toISOString()}`);
  check("önce: label 'LGS 2026'", t.label === "LGS 2026", t.label);

  // 2) Sınav günü (sabah, sınav saatinden önce) → mesaj modu
  const d = getExamTarget("lgs", { now: ms("2026-06-13T06:00:00+03:00") });
  check("sınav günü sabahı: isExamDay", d.isExamDay && !d.isEstimate);

  // 3) Sınav günü, sınav saatinden sonra → hâlâ exam day (ertesi güne kadar)
  const a = getExamTarget("lgs", { now: ms("2026-06-13T20:00:00+03:00") });
  check("sınav günü akşamı: hâlâ isExamDay", a.isExamDay && !a.isEstimate);

  // 4) Ertesi gün → fallback, +365, tahmini
  const f = getExamTarget("lgs", { now: ms("2026-06-14T00:30:00+03:00") });
  check("ertesi gün: isEstimate", f.isEstimate && !f.isExamDay);
  check("ertesi gün: hedef geleceğe kaydı", f.ms > ms("2026-06-14T00:30:00+03:00"));
  check("ertesi gün: label '(tahmini)' içerir", /tahmini/.test(f.label), f.label);
  check("ertesi gün: label 'LGS 2027 (tahmini)'", f.label === "LGS 2027 (tahmini)", f.label);
  check("ertesi gün: not metni var", !!f.note);

  // 5) Yıllar sonra → her zaman gelecekte, asla negatif/sıfır
  const future = getExamTarget("lgs", { now: ms("2031-01-01T00:00:00+03:00") });
  check("2031: hedef hâlâ gelecekte", future.ms > ms("2031-01-01T00:00:00+03:00"));
  check("2031: çok yıl atlandı", future.yearsRolled >= 5, `rolled=${future.yearsRolled}`);
  check("2031: tahmini", future.isEstimate);
}

console.log("\nYKS / TYT (examKey: yks, official 2026-06-20T10:15:00+03:00)");
{
  const before = getExamTarget("yks", { now: ms("2026-06-01T00:00:00+03:00") });
  check("TYT önce: hedef = official", before.ms === ms(EXAM_DATES.yks.official));
  const examday = getExamTarget("yks", { now: ms("2026-06-20T08:00:00+03:00") });
  check("TYT 20 Haziran: isExamDay", examday.isExamDay);
  const next = getExamTarget("yks", { now: ms("2026-06-21T11:00:00+03:00") });
  check("TYT 21 Haziran: fallback (tahmini)", next.isEstimate, next.label);
}

console.log("\nAYT (examKey: yks, offsetDays: 1 → 2026-06-21)");
{
  const t = getExamTarget("yks", { offsetDays: 1, now: ms("2026-06-01T00:00:00+03:00") });
  check("AYT hedef = TYT + 1 gün", t.ms === ms(EXAM_DATES.yks.official) + 86400000, t.date.toISOString());
  const examday = getExamTarget("yks", { offsetDays: 1, now: ms("2026-06-21T08:00:00+03:00") });
  check("AYT 21 Haziran: isExamDay", examday.isExamDay);
  // 20 Haziran AYT için sınav günü DEĞİL (o gün TYT)
  const tytDay = getExamTarget("yks", { offsetDays: 1, now: ms("2026-06-20T08:00:00+03:00") });
  check("AYT 20 Haziran: henüz sınav günü değil", !tytDay.isExamDay && !tytDay.isEstimate);
}

console.log("\nBilinmeyen examKey → null");
check("getExamTarget('xyz') === null", getExamTarget("xyz") === null);

console.log(`\n${fail === 0 ? "✅ TÜM TESTLER GEÇTİ" : "❌ BAŞARISIZ"}  (${pass} passed, ${fail} failed)`);
process.exit(fail === 0 ? 0 : 1);
