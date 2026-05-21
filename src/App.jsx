import { useState, useEffect } from "react";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";

const tap = (style = "light") => {
  try {
    if (style === "success") Haptics.notification({ type: NotificationType.Success });
    else Haptics.impact({ style: style === "medium" ? ImpactStyle.Medium : ImpactStyle.Light });
  } catch {}
};

const scheduleDaily = async () => {
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") { alert("Bildirim izni verilmedi."); return false; }
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    await LocalNotifications.schedule({
      notifications: [{
        id: 1,
        title: "Exam Bro 🎓",
        body: "Bugün çalıştın mı? Geri sayım devam ediyor.",
        schedule: { on: { hour: 20, minute: 0 }, repeats: true, allowWhileIdle: true }
      }]
    });
    return true;
  } catch (e) { return false; }
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

// ── Grade → which fixed exams are visible by default ─────────
function defaultHidden(grade) {
  if (grade === "8")               return ["TYT", "AYT"];
  if (grade === "12" || grade === "x") return ["LGS"];
  // 5-7, 9-11: no national exam relevant
  return ["LGS", "TYT", "AYT"];
}

// ── Static data ──────────────────────────────────────────────
const FIXED = [
  { id:"LGS", n:"LGS",     sub:"Liselere Geçiş Sınavı",  date:"2026-06-14T10:00:00", c:"#06D6A0", em:"🏫" },
  { id:"TYT", n:"TYT",     sub:"Temel Yeterlilik Testi",  date:"2026-06-20T09:30:00", c:"#8338EC", em:"📚" },
  { id:"AYT", n:"AYT/YDT", sub:"Alan Yeterlilik Testi",   date:"2026-06-21T09:30:00", c:"#FF006E", em:"🎓" },
];

const OSYM = [
  { id:"ALES1",    n:"ALES / 1",            sub:"Akademik Lisans Tamamlama", date:"2026-05-10T09:30:00", c:"#FF8C00", em:"📝", cat:"Lisansüstü" },
  { id:"ALES2",    n:"ALES / 2",            sub:"Akademik Lisans Tamamlama", date:"2026-07-26T09:30:00", c:"#FF8C00", em:"📝", cat:"Lisansüstü" },
  { id:"ALES3",    n:"ALES / 3",            sub:"Akademik Lisans Tamamlama", date:"2026-11-29T09:30:00", c:"#FF8C00", em:"📝", cat:"Lisansüstü" },
  { id:"DGS",      n:"DGS",                 sub:"Dikey Geçiş Sınavı",        date:"2026-07-19T09:30:00", c:"#3A86FF", em:"🔼", cat:"Ön Lisans" },
  { id:"KPSS_GYK", n:"KPSS Lisans GY‑GK",  sub:"Genel Yetenek – Genel Kültür", date:"2026-09-06T09:30:00", c:"#06D6A0", em:"🏛️", cat:"Kamu" },
  { id:"KPSS_AB1", n:"KPSS Alan Bil. / 1", sub:"Lisans A Grubu – 1. Gün",   date:"2026-09-12T09:30:00", c:"#06D6A0", em:"🏛️", cat:"Kamu" },
  { id:"KPSS_AB2", n:"KPSS Alan Bil. / 2", sub:"Lisans A Grubu – 2. Gün",   date:"2026-09-13T09:30:00", c:"#06D6A0", em:"🏛️", cat:"Kamu" },
  { id:"KPSS_OOG", n:"KPSS Ortaöğretim",   sub:"Lise Mezunları",             date:"2026-10-25T09:30:00", c:"#06D6A0", em:"🏛️", cat:"Kamu" },
  { id:"MEB_AGS",  n:"MEB‑AGS",             sub:"MEB Akademi Giriş Sınavı",  date:"2026-07-12T09:30:00", c:"#a855f7", em:"🏫", cat:"Kamu" },
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
  { i:"👁️", t:"karşılaştırma tuzağı.", b:"O kadar çalışıyor — ama sen onun beyninde değilsin. Kendi yoluna bak." },
  { i:"🌬️", t:"nefes al.", b:"4sn içeri — 4sn tut — 4sn dışarı. İki kez yap. Parasız ve işe yarar." },
  { i:"🏋️", t:"küçük adım büyük fark.", b:"20 dakika çalışmak hiç çalışmamaktan katlarca iyidir. Mükemmel plan yoktur." },
];

// ── Utils ────────────────────────────────────────────────────
const pad   = n => String(n).padStart(2, "0");
const today = () => new Date().toISOString().split("T")[0];

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

function anxColor(v) {
  if (!v) return "#1a1a2e";
  if (v <= 3) return `rgba(6,214,160,${(0.3 + v * 0.2).toFixed(2)})`;
  if (v <= 6) return `rgba(255,183,3,${(0.3 + (v-3) * 0.18).toFixed(2)})`;
  return `rgba(255,0,110,${(0.35 + (v-6) * 0.13).toFixed(2)})`;
}
function anxSolid(v) {
  if (!v) return "#444";
  if (v <= 3) return "#06D6A0";
  if (v <= 6) return "#FFB703";
  return "#FF006E";
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
      if (st) try { setStudied(JSON.parse(st)); }  catch {}
      if (sk) setStreak(parseInt(sk) || 0);
      if (dt) try { if (JSON.parse(dt) === today()) setDoneToday(true); } catch {}

      setLoaded(true);
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


  const logout = async () => {
    setGrade("");
    setTab("home");
    await store.set("xb_grade", "");
  };

  const resetAll = async () => {
    if (!confirm("Tüm verileriniz silinecek. Emin misin?")) return;
    for (const k of ["xb_grade","xb_hidden","xb_customs","xb_studied","xb_streak","xb_lastStudy","xb_anxiety","xb_goals","xb_chat_welcomed"]) {
      await store.set(k, null);
    }
    location.reload();
  };

  const enableReminder = async () => {
    const ok = await scheduleDaily();
    if (ok) { tap("success"); alert("Her gün 20:00'de hatırlatma açıldı."); }
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
    const yd = yest.toISOString().split("T")[0];
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

  if (!loaded) return <Splash />;
  if (!grade)  return <Onboard onPick={saveGrade} />;

  const gradeInfo = GRADES.find(g => g.v === grade) || GRADES[0];
  // Deterministic daily pick cycling through all 100 messages
  const dayIndex  = Math.floor(Date.now() / 86400000);
  const motivText = MOTIV[dayIndex % MOTIV.length];
  const cbtTip    = CBT[dayIndex % CBT.length];
  const visFixed  = FIXED.filter(e => !hidden.includes(e.id));
  const allExams  = [...visFixed, ...customs.slice().sort((a, b) => new Date(a.date) - new Date(b.date))].filter(ex => new Date(ex.date) > Date.now());

  const TABS = [
    ["home","🏠","Ana Sayfa"],
    ["exams","📅","Sınavlar"],
    ["goals","🎯","Hedefler"],
    ["anxiety","😰","Kaygı"],
    ["report","📊","Rapor"],
  ];

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {showBoom && (
        <div style={S.boom}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:88 }}>🔥</div>
            <div style={{ fontFamily:"'Fredoka',sans-serif", fontSize:32, fontWeight:700, color:"#FFBE0B", marginTop:8 }}>SÜPERSİN!</div>
            {streak > 1 && <div style={{ color:"#FF8C00", fontSize:20, marginTop:4 }}>{streak} günlük seri 🔥</div>}
          </div>
        </div>
      )}

      <div style={S.header}>
        <div>
          <div style={S.logo}>Exam Bro 🎓</div>
          <div style={S.headerSub}>{gradeInfo.e} {gradeInfo.l}</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {streak > 0 && <div style={S.streakBadge}>🔥 {streak}</div>}
          <button style={S.outBtn} onClick={logout}>↩️</button>
        </div>
      </div>

      <div style={S.scroll}>
        {tab === "home"    && <HomeTab    motivText={motivText} cbt={cbtTip} doneToday={doneToday} streak={streak} onStudied={markStudied} exams={allExams} />}
        {tab === "exams"   && <ExamsTab   grade={grade} hidden={hidden} onToggle={toggleHide} customs={customs} onAdd={addExam} onDel={delExam} />}
        {tab === "goals"   && <GoalsTab   goals={goals} onAdd={addGoal} onToggle={toggleGoal} onDel={delGoal} />}
        {tab === "anxiety" && <AnxietyTab log={anxiety} onRate={rateAnxiety} />}
        {tab === "report"  && <ReportTab  studied={studied} streak={streak} anxiety={anxiety} goals={goals} onReset={resetAll} onEnableReminder={enableReminder} />}
      </div>

      <div style={S.nav}>
        {TABS.map(([id, emoji, label]) => (
          <button key={id} style={S.navBtn} onClick={() => setTab(id)}>
            {tab === id && <div style={S.navLine} />}
            <span style={{ fontSize:22, filter:tab===id ? "none" : "grayscale(1) opacity(0.4)" }}>{emoji}</span>
            <span style={{ fontSize:10, fontWeight:600, color:tab===id ? "#FFBE0B" : "#444", fontFamily:"'Fredoka',sans-serif" }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Splash ───────────────────────────────────────────────────
function Splash() {
  return (
    <div style={{ background:"#080810", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
      <style>{CSS}</style>
      <div style={{ fontSize:56 }}>🎓</div>
      <div style={{ color:"#8338EC", fontFamily:"monospace", fontSize:13, letterSpacing:2 }}>yükleniyor...</div>
    </div>
  );
}

// ── Onboard ──────────────────────────────────────────────────
function Onboard({ onPick }) {
  return (
    <div style={{ background:"#080810", minHeight:"100vh", fontFamily:"'Fredoka',sans-serif", color:"#fff", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{CSS}</style>
      <div style={{ fontSize:72, filter:"drop-shadow(0 0 24px #8338ECAA)" }}>🎓</div>
      <div style={{ fontSize:34, fontWeight:700, textAlign:"center", background:"linear-gradient(90deg,#8338EC,#FF006E)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginTop:8 }}>Exam Bro</div>
      <div style={{ fontSize:15, color:"#666", margin:"8px 0 32px", textAlign:"center" }}>Kaçıncı sınıftasın?</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, width:"100%", maxWidth:360 }}>
        {GRADES.map(g => (
          <button key={g.v} onClick={() => onPick(g.v)}
            style={{ background:"#1a1a2e", border:"2px solid #252540", borderRadius:16, padding:"16px 8px", cursor:"pointer", color:"#fff", display:"flex", flexDirection:"column", alignItems:"center", gap:6, fontFamily:"'Fredoka',sans-serif" }}>
            <span style={{ fontSize:28 }}>{g.e}</span>
            <span style={{ fontSize:12, fontWeight:600 }}>{g.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Home ─────────────────────────────────────────────────────
function HomeTab({ motivText, cbt, doneToday, streak, onStudied, exams }) {
  return (
    <div className="fadeup">
      {/* Motivation — clean, no emoji spam */}
      <div style={{ marginBottom:14, padding:"22px 24px", background:"#0f0f1a", border:"1px solid #1e1e35", borderRadius:20, borderLeft:"3px solid #8338EC" }}>
        <div style={{ fontSize:10, color:"#8338EC", fontWeight:700, textTransform:"uppercase", letterSpacing:2, marginBottom:12 }}>bugün</div>
        <div style={{ fontSize:18, color:"#e0e0ff", lineHeight:1.6, fontStyle:"italic" }}>{motivText}</div>
      </div>

      {/* Studied button */}
      <button onClick={onStudied} style={{
        width:"100%", marginBottom:14, padding:"17px 20px",
        background: doneToday ? "linear-gradient(135deg,#0b3a1a,#0f4a22)" : "linear-gradient(135deg,#06D6A0,#059669)",
        border: doneToday ? "2px solid #06D6A033" : "none",
        borderRadius:20, color:"#fff", fontSize:19, fontWeight:700,
        cursor: doneToday ? "default" : "pointer",
        fontFamily:"'Fredoka',sans-serif",
        boxShadow: doneToday ? "none" : "0 8px 28px rgba(6,214,160,0.4)",
        animation: doneToday ? "none" : "pulse 2s infinite",
        display:"flex", alignItems:"center", justifyContent:"center", gap:10,
      }}>
        <span style={{ fontSize:26 }}>{doneToday ? "✅" : "💪"}</span>
        {doneToday ? "bugün çalıştın." : "Bugün Çalıştım"}
      </button>

      {/* Streak */}
      {streak > 1 && (
        <Card style={{ marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center", background:"linear-gradient(135deg,#2a1200,#3d1a00)", borderColor:"#FF8C0033" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#FF8C00" }}>seri devam ediyor</div>
            <div style={{ fontSize:12, color:"#886633", marginTop:3 }}>bu tempoda devam et.</div>
          </div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:38, fontWeight:700, color:"#FFBE0B" }}>{streak}</div>
        </Card>
      )}

      {/* Countdowns */}
      {exams.length === 0 ? (
        <div style={{ textAlign:"center", color:"#333", padding:"36px 0", lineHeight:2.2 }}>
          <div style={{ fontSize:44 }}>📅</div>
          <div style={{ color:"#444", fontSize:14 }}>Sınavlar sekmesinden ekle.</div>
        </div>
      ) : (
        <>
          <div style={S.label}>⏳ geri sayım</div>
          {exams.map(ex => <CountCard key={ex.id} ex={ex} />)}
        </>
      )}

      {/* CBT — also toned down */}
      <div style={{ marginTop:8, marginBottom:4, padding:"20px 22px", background:"#0d0d1f", border:"1px solid #1e1e35", borderRadius:20, borderLeft:"3px solid #3A86FF" }}>
        <div style={{ fontSize:10, color:"#3A86FF", fontWeight:700, textTransform:"uppercase", letterSpacing:2, marginBottom:12 }}>psikoloji köşesi</div>
        <div style={{ fontSize:24, marginBottom:8 }}>{cbt.i}</div>
        <div style={{ fontSize:15, fontWeight:600, marginBottom:6, color:"#c0c0ff" }}>{cbt.t}</div>
        <div style={{ fontSize:14, color:"#777", lineHeight:1.65 }}>{cbt.b}</div>
      </div>
    </div>
  );
}

function CountCard({ ex }) {
  const r = remaining(ex.date);
  return (
    <div style={{ background:`linear-gradient(135deg,${ex.c}18,${ex.c}06)`, border:`2px solid ${ex.c}30`, borderRadius:20, padding:20, marginBottom:12, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-18, right:-14, fontSize:88, opacity:0.06, pointerEvents:"none" }}>{ex.em}</div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:ex.c }}>{ex.n}</div>
          <div style={{ fontSize:13, color:"#555", marginTop:-2 }}>{ex.sub}</div>
        </div>
        <span style={{ fontSize:24 }}>{ex.em}</span>
      </div>
      {r.done ? (
        <div style={{ fontSize:15, color:"#555" }}>Sınav geçti 🎉</div>
      ) : (
        <div style={{ display:"flex", gap:7 }}>
          {[["d","GÜN"],["h","SAAT"],["m","DAK"],["s","SN"]].map(([k, lbl]) => (
            <div key={k} style={{ flex:1, textAlign:"center" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color:ex.c, background:"rgba(0,0,0,0.32)", borderRadius:10, padding:"7px 2px" }}>{pad(r[k])}</div>
              <div style={{ fontSize:9, color:"#555", marginTop:5, letterSpacing:1 }}>{lbl}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Exams ────────────────────────────────────────────────────
function ExamsTab({ grade, hidden, onToggle, customs, onAdd, onDel }) {
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
    onAdd({ id:`m_${Date.now()}`, n:name.trim(), sub:subj, date:`${date}T${time}:00`, c:"#FFBE0B", em:"✏️" });
    setName(""); setDate(""); setTime("09:00"); setSubj(""); setView("list");
  };

  if (view === "osym") return (
    <div className="fadeup">
      <BackBtn onClick={() => setView("list")} title="ÖSYM Takvimi 📋" />
      <div style={{ fontSize:12, color:"#555", marginBottom:18 }}>Kaynak: ÖSYM 2026 Resmi Sınav Takvimi</div>
      {cats.map(cat => (
        <div key={cat}>
          <div style={S.label}>{cat}</div>
          {OSYM.filter(e => e.cat === cat).map(ex => {
            const r = remaining(ex.date);
            const added = isAdded(ex.id);
            return (
              <Card key={ex.id} style={{ marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center", borderColor:added?"#06D6A033":undefined }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:ex.c }}>{ex.em} {ex.n}</div>
                  <div style={{ fontSize:12, color:"#666", marginTop:2 }}>{ex.sub}</div>
                  <div style={{ fontSize:11, color:"#555", marginTop:2 }}>{new Date(ex.date).toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"})}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                  {!r.done && <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, color:ex.c }}>{r.d}g kaldı</div>}
                  {r.done  && <div style={{ fontSize:12, color:"#555" }}>Geçti</div>}
                  <button onClick={() => !added && onAdd({...ex})}
                    style={{ background:added?"#06D6A018":"#252550", border:`1px solid ${added?"#06D6A0":"#3a3a5e"}`, color:added?"#06D6A0":"#aaa", borderRadius:10, padding:"5px 14px", cursor:added?"default":"pointer", fontSize:13, fontWeight:700, fontFamily:"'Fredoka',sans-serif", whiteSpace:"nowrap" }}>
                    {added ? "✓ Eklendi" : "+ Ekle"}
                  </button>
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
      <BackBtn onClick={() => setView("list")} title="Manuel Sınav Ekle ✏️" />
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Sınav adı (örn. Matematik Yazılı)" style={S.inp} />
      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{...S.inp, flex:2, marginBottom:0, colorScheme:"dark"}} />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{...S.inp, flex:1, marginBottom:0, colorScheme:"dark"}} />
      </div>
      <div style={{ fontSize:13, color:"#888", margin:"12px 0 8px" }}>Ders (opsiyonel):</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
        {subjects.map(s => (
          <button key={s} onClick={() => setSubj(subj === s ? "" : s)}
            style={{ background:subj===s?"#8338EC":"#252540", border:"none", borderRadius:20, padding:"4px 12px", color:"#fff", fontSize:13, cursor:"pointer", fontFamily:"'Fredoka',sans-serif" }}>
            {s}
          </button>
        ))}
      </div>
      <input value={subjects.includes(subj) ? "" : subj} onChange={e => setSubj(e.target.value)} placeholder="Veya farklı bir şey yaz..." style={{...S.inp, marginBottom:16}} />
      <button onClick={handleAdd} style={{ width:"100%", background:"linear-gradient(135deg,#FFBE0B,#FF8C00)", border:"none", borderRadius:14, padding:14, color:"#000", fontSize:17, fontWeight:700, cursor:"pointer", fontFamily:"'Fredoka',sans-serif" }}>Sınav Ekle ✓</button>
    </div>
  );

  return (
    <div className="fadeup">
      <div style={S.pageTitle}>Sınavlarım 📅</div>
      <div style={{ fontSize:14, color:"#666", marginBottom:18 }}>Görmek istediklerini seç, istediklerini ekle</div>

      <div style={S.label}>Ulusal Sınavlar</div>
      <div style={{ fontSize:12, color:"#555", marginBottom:12 }}>👁️ görünür &nbsp;·&nbsp; 🙈 gizli &nbsp;— tıkla değiştir</div>
      {FIXED.map(ex => {
        const hide = hidden.includes(ex.id);
        const r = remaining(ex.date);
        return (
          <div key={ex.id} onClick={() => onToggle(ex.id)}
            style={{ background:hide?"#111118":`linear-gradient(135deg,${ex.c}14,transparent)`, border:`1px solid ${hide?"#252530":ex.c+"30"}`, borderRadius:14, padding:"13px 16px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", opacity:hide?0.45:1, transition:"all 0.2s" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:hide?"#555":ex.c }}>{ex.em} {ex.n}</div>
              <div style={{ fontSize:11, color:"#555", marginTop:3 }}>{new Date(ex.date).toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"})}</div>
            </div>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              {!r.done && !hide && <span style={{ fontFamily:"'Space Mono',monospace", fontSize:14, color:ex.c }}>{r.d}g</span>}
              <span style={{ fontSize:22 }}>{hide ? "🙈" : "👁️"}</span>
            </div>
          </div>
        );
      })}

      {customs.length > 0 && (
        <>
          <div style={{...S.label, color:"#FFBE0B", margin:"18px 0 10px"}}>Eklediğim Sınavlar</div>
          {customs.map(ex => {
            const r = remaining(ex.date);
            return (
              <Card key={ex.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, color:ex.c||"#fff" }}>{ex.em} {ex.n}</div>
                  {ex.sub && <div style={{ fontSize:12, color:"#888", marginTop:2 }}>{ex.sub}</div>}
                  <div style={{ fontSize:11, color:"#555", marginTop:2 }}>{new Date(ex.date).toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"})}</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:14, color:ex.c||"#FFBE0B" }}>{r.done?"✓":`${r.d}g`}</span>
                  <button onClick={() => onDel(ex.id)} style={{ background:"#FF006E22", border:"1px solid #FF006E44", color:"#FF006E", borderRadius:8, padding:"4px 10px", cursor:"pointer", fontSize:13, fontFamily:"'Fredoka',sans-serif" }}>✕</button>
                </div>
              </Card>
            );
          })}
        </>
      )}

      <div style={{ display:"flex", gap:10, marginTop:18 }}>
        <button onClick={() => setView("osym")} style={{ flex:1, background:"linear-gradient(135deg,#1a1428,#221a3a)", border:"2px solid #3a2a5e", borderRadius:14, padding:"14px 10px", color:"#a855f7", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"'Fredoka',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <span style={{ fontSize:26 }}>📋</span>ÖSYM Takvimi
        </button>
        <button onClick={() => setView("manual")} style={{ flex:1, background:"linear-gradient(135deg,#1a1a14,#2a2a18)", border:"2px dashed #FFBE0B55", borderRadius:14, padding:"14px 10px", color:"#FFBE0B", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"'Fredoka',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <span style={{ fontSize:26 }}>✏️</span>Manuel Ekle
        </button>
      </div>
    </div>
  );
}

// ── Goals ────────────────────────────────────────────────────
function GoalsTab({ goals, onAdd, onToggle, onDel }) {
  const d = today();
  const [inp, setInp] = useState("");
  const list = goals[d] || [];
  const done = list.filter(g => g.done).length;
  const pct  = list.length ? Math.round(done / list.length * 100) : 0;
  const add  = () => { if (!inp.trim()) return; onAdd(d, inp.trim()); setInp(""); };

  return (
    <div className="fadeup">
      <div style={S.pageTitle}>Günlük Hedefler 🎯</div>
      <div style={{ fontSize:14, color:"#666", marginBottom:18 }}>Bugün ne yapacaksın?</div>

      {list.length > 0 && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontSize:14, fontWeight:600 }}>İlerleme</span>
            <span style={{ fontSize:16, fontWeight:700, color:pct===100?"#06D6A0":pct>=50?"#FFBE0B":"#888" }}>{done}/{list.length} — %{pct}</span>
          </div>
          <div style={{ background:"#252540", borderRadius:999, height:8, overflow:"hidden" }}>
            <div style={{ background:"linear-gradient(90deg,#06D6A0,#3A86FF)", height:"100%", width:`${pct}%`, borderRadius:999, transition:"width 0.4s" }} />
          </div>
          {pct === 100 && <div style={{ textAlign:"center", color:"#06D6A0", fontWeight:600, fontSize:15, marginTop:10 }}>🎉 Hepsini bitirdin.</div>}
        </Card>
      )}

      {list.map(g => (
        <div key={g.id} style={{ background:"#1a1a2e", border:`1px solid ${g.done?"#06D6A033":"#252540"}`, borderRadius:14, padding:"13px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => onToggle(d, g.id)} style={{ width:26, height:26, borderRadius:"50%", border:`2px solid ${g.done?"#06D6A0":"#444"}`, background:g.done?"#06D6A0":"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
            {g.done && <span style={{ color:"#000", fontSize:13, fontWeight:700 }}>✓</span>}
          </button>
          <span style={{ flex:1, fontSize:15, textDecoration:g.done?"line-through":"none", color:g.done?"#555":"#fff" }}>{g.text}</span>
          <button onClick={() => onDel(d, g.id)} style={{ background:"none", border:"none", color:"#333", cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
        </div>
      ))}

      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Yeni hedef ekle..."
          style={{ flex:1, background:"#1a1a2e", border:"1px solid #252540", borderRadius:12, padding:"13px 16px", color:"#fff", fontSize:15, fontFamily:"'Fredoka',sans-serif" }} />
        <button onClick={add} style={{ background:"linear-gradient(135deg,#06D6A0,#059669)", border:"none", borderRadius:12, padding:"13px 18px", color:"#fff", fontSize:22, cursor:"pointer", fontWeight:700 }}>+</button>
      </div>

      {list.length === 0 && (
        <div style={{ textAlign:"center", color:"#444", marginTop:40, lineHeight:2.2, fontSize:15 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🎯</div>
          Henüz hedef yok.<br />
          <span style={{ color:"#333", fontSize:13 }}>Küçük bir şey bile yaz.</span>
        </div>
      )}
    </div>
  );
}

// ── Anxiety ──────────────────────────────────────────────────
function AnxietyTab({ log, onRate }) {
  const d = today();
  const [val, setVal] = useState(log[d] || null);
  const pick = v => { setVal(v); onRate(d, v); };

  const days = [];
  for (let i = 34; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    days.push(dt.toISOString().split("T")[0]);
  }

  const label = v => !v?"—":v<=3?"😊 sakin & odaklı":v<=6?"😐 orta seviye":v<=8?"😰 yoğun":"🆘 çok yüksek";

  return (
    <div className="fadeup">
      <div style={S.pageTitle}>Kaygı Takibi 😰</div>
      <div style={{ fontSize:14, color:"#666", marginBottom:18 }}>Duygusal örüntülerini keşfet</div>

      <Card style={{ marginBottom:20 }}>
        <div style={{ fontSize:15, fontWeight:600, marginBottom:14 }}>bugün nasıl hissediyorsun?</div>
        <div style={{ display:"flex", gap:4, justifyContent:"space-between", marginBottom:14 }}>
          {[1,2,3,4,5,6,7,8,9,10].map(v => (
            <button key={v} onClick={() => pick(v)} style={{
              flex:1, aspectRatio:"1", borderRadius:9, minWidth:0,
              background: val===v ? anxColor(v) : "#252540",
              border: `2px solid ${val===v ? anxSolid(v) : "#252540"}`,
              color:"#fff", fontSize:14, fontWeight:700,
              cursor:"pointer", fontFamily:"'Fredoka',sans-serif",
              transform: val===v ? "scale(1.18)" : "scale(1)",
              transition:"all 0.15s",
              boxShadow: val===v ? `0 4px 14px ${anxColor(v)}` : "none",
            }}>{v}</button>
          ))}
        </div>
        {val
          ? <div style={{ textAlign:"center", fontSize:16, fontWeight:600, color:anxSolid(val), padding:10, background:`${anxColor(val)}33`, borderRadius:12 }}>{label(val)}</div>
          : <div style={{ textAlign:"center", fontSize:13, color:"#555" }}>1 = tamamen sakin &nbsp;|&nbsp; 10 = çok yüksek kaygı</div>
        }
      </Card>

      <div style={{ display:"flex", gap:16, marginBottom:14, fontSize:12 }}>
        {[["#06D6A0","1–3 Sakin"],["#FFB703","4–6 Orta"],["#FF006E","7–10 Yüksek"]].map(([c,l]) => (
          <div key={l} style={{ display:"flex", alignItems:"center", gap:5, color:"#888" }}>
            <div style={{ width:11, height:11, borderRadius:3, background:c }} />{l}
          </div>
        ))}
      </div>

      <div style={S.label}>son 35 gün</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5, marginTop:10 }}>
        {days.map(ds => (
          <div key={ds} style={{ aspectRatio:"1", borderRadius:7, background:anxColor(log[ds]||null), border:ds===d?"2px solid #ffffff55":"1px solid #1a1a3e", position:"relative" }}>
            {ds === d && <div style={{ position:"absolute", bottom:1, right:1, width:5, height:5, background:"#FFBE0B", borderRadius:"50%" }} />}
          </div>
        ))}
      </div>
      <div style={{ textAlign:"center", marginTop:10, fontSize:11, color:"#444" }}>her kare 1 gün · ton sürton 🎨</div>
    </div>
  );
}

// ── Report ───────────────────────────────────────────────────
function ReportTab({ studied, streak, anxiety, goals, onReset, onEnableReminder }) {
  const now  = new Date();
  const week = Array.from({length:7}, (_, i) => { const d = new Date(now); d.setDate(now.getDate()-6+i); return d.toISOString().split("T")[0]; });

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
      <div style={S.pageTitle}>Haftalık Rapor 📊</div>
      <div style={{ fontSize:14, color:"#666", marginBottom:18 }}>son 7 günün özeti</div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
        <Stat emoji="📚" label="Çalışılan Gün" value={`${studiedW}/7`}   color="#06D6A0" />
        <Stat emoji="🔥" label="Seri"           value={`${streak} gün`}  color="#FF8C00" />
        <Stat emoji="😰" label="Ort. Kaygı"     value={avgAnx?`${avgAnx}/10`:"—"} color={avgAnx?anxSolid(parseFloat(avgAnx)):"#555"} />
        <Stat emoji="🎯" label="Bugün Hedef"    value={donePct!=null?`%${donePct}`:"—"} color="#8338EC" />
      </div>

      <Card style={{ marginBottom:14 }}>
        <div style={{ fontWeight:700, marginBottom:14, color:"#bbb" }}>bu hafta çalışma</div>
        <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:60 }}>
          {week.map(d => {
            const s=studied.includes(d), isT=d===today();
            return (
              <div key={d} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ width:"100%", background:s?"linear-gradient(180deg,#06D6A0,#04a07a)":"#252540", borderRadius:5, height:s?48:8, transition:"height 0.3s", border:isT?"2px solid #FFBE0B":"none" }} />
                <div style={{ fontSize:10, color:isT?"#FFBE0B":"#555", fontWeight:isT?700:400 }}>{new Date(d).toLocaleDateString("tr-TR",{weekday:"narrow"})}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card style={{ marginBottom:14 }}>
        <div style={{ fontWeight:700, marginBottom:14, color:"#bbb" }}>bu hafta kaygı</div>
        <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:60 }}>
          {week.map(d => {
            const v = anxiety[d];
            return (
              <div key={d} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ width:"100%", background:v?anxColor(v):"#252540", borderRadius:5, height:v?v*5.5:8, transition:"height 0.3s" }} />
                <div style={{ fontSize:10, color:"#555" }}>{new Date(d).toLocaleDateString("tr-TR",{weekday:"narrow"})}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ padding:"20px 22px", background:"#0d0d1f", border:"1px solid #1e1e35", borderRadius:20, borderLeft:"3px solid #8338EC" }}>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:8, color:"#e0e0ff" }}>{msg}</div>
        <div style={{ fontSize:14, color:"#666", lineHeight:1.65 }}>{detail}</div>
      </div>

      <div style={{ marginTop:36, display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
        <button onClick={onEnableReminder} style={{ background:"transparent", border:"1px solid #2a2540", color:"#888", padding:"10px 18px", borderRadius:10, fontSize:13, cursor:"pointer", fontFamily:"'Fredoka',sans-serif" }}>🔔 Günlük hatırlatmayı aç</button>
        <button onClick={onReset} style={{ background:"transparent", border:"1px solid #3a1a2a", color:"#8a3a4a", padding:"10px 18px", borderRadius:10, fontSize:12, cursor:"pointer", fontFamily:"'Fredoka',sans-serif", letterSpacing:0.5 }}>Tüm verileri sıfırla</button>
      </div>
    </div>
  );
}

// ── Shared UI ────────────────────────────────────────────────
function Card({ children, style }) {
  return <div style={{ background:"#1a1a2e", border:"1px solid #252540", borderRadius:18, padding:18, ...style }}>{children}</div>;
}
function Stat({ emoji, label, value, color }) {
  return (
    <div style={{ background:"#1a1a2e", borderRadius:16, padding:"16px 14px", textAlign:"center" }}>
      <div style={{ fontSize:26 }}>{emoji}</div>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color, marginTop:4 }}>{value}</div>
      <div style={{ fontSize:12, color:"#666", marginTop:3 }}>{label}</div>
    </div>
  );
}
function BackBtn({ onClick, title }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
      <button onClick={onClick} style={{ background:"#1a1a2e", border:"1px solid #252540", color:"#aaa", padding:"6px 14px", borderRadius:10, cursor:"pointer", fontSize:14, fontFamily:"'Fredoka',sans-serif" }}>← Geri</button>
      <div style={{ fontSize:19, fontWeight:700 }}>{title}</div>
    </div>
  );
}

// ── Styles & CSS ─────────────────────────────────────────────
const S = {
  root:       { background:"#080810", minHeight:"100vh", fontFamily:"'Fredoka',sans-serif", color:"#fff", paddingBottom:"calc(84px + env(safe-area-inset-bottom))", maxWidth:480, margin:"0 auto", position:"relative" },
  header:     { padding:"18px 20px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:"#080810", zIndex:10, borderBottom:"1px solid #12121e" },
  logo:       { fontSize:26, fontWeight:700, background:"linear-gradient(90deg,#8338EC,#FF006E,#FFBE0B)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:-0.5 },
  headerSub:  { fontSize:12, color:"#666", marginTop:-2 },
  streakBadge:{ background:"linear-gradient(135deg,#7a2d00,#b34500)", borderRadius:20, padding:"4px 12px", fontSize:14, fontWeight:700, border:"1px solid #FF8C00" },
  outBtn:     { background:"#1a1a2e", border:"1px solid #252540", color:"#888", padding:"6px 10px", borderRadius:10, cursor:"pointer", fontSize:15, fontFamily:"'Fredoka',sans-serif" },
  scroll:     { padding:"14px 16px 0" },
  nav:        { position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:"rgba(10,10,20,0.96)", borderTop:"1px solid #1a1a2e", display:"flex", zIndex:100, paddingBottom:"env(safe-area-inset-bottom)", backdropFilter:"blur(12px)" },
  navBtn:     { flex:1, background:"none", border:"none", padding:"10px 4px 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, position:"relative" },
  navLine:    { position:"absolute", top:0, left:"20%", right:"20%", height:2, background:"linear-gradient(90deg,#8338EC,#FF006E)", borderRadius:999 },
  boom:       { position:"fixed", inset:0, zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.78)", pointerEvents:"none", animation:"boomFade 2.6s forwards" },
  label:      { fontSize:10, color:"#8338EC", fontWeight:700, textTransform:"uppercase", letterSpacing:2, marginBottom:10 },
  pageTitle:  { fontSize:22, fontWeight:700, marginBottom:4 },
  inp:        { width:"100%", background:"#0d0d1a", border:"1px solid #252540", borderRadius:10, padding:"12px 14px", color:"#fff", fontSize:15, fontFamily:"'Fredoka',sans-serif", marginBottom:10, display:"block" },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&family=Space+Mono:wght@700&display=swap');
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 0; }
  input { outline: none; }
  @keyframes boomFade { 0%{opacity:1;transform:scale(1)} 60%{opacity:1;transform:scale(1.06)} 100%{opacity:0;transform:scale(0.85)} }
  @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
  @keyframes fadeup { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  .fadeup { animation: fadeup 0.3s ease; }
  button { font-family: 'Fredoka', sans-serif; }
`;
