// premiumContent.js
// Exam Bro — Premium Psikoloji İçeriği
// Hazırlayan: Psk. Dilay Demirgan
// CBT temelli, sınav kaygısına yönelik, 5-12. sınıf öğrencileri için yazılmıştır.
//
// Yapı:
//   premiumContent = { kategori_id: { title, subtitle, icon, items: [ ... ] } }
//   item türleri:
//     - type: "lesson"    -> okunacak kısa ders (sections dizisi)
//     - type: "exercise"  -> adım adım, süreli nefes/gevşeme egzersizi (steps dizisi, durationSec)
//     - type: "program"   -> birden çok güne yayılan rehberli mini program (days dizisi)

export const premiumContent = {
  // ───────────────────────────────────────────────
  // 1) CBT TEMELLİ KAYGI MODÜLLERİ
  // ───────────────────────────────────────────────
  kaygi: {
    title: "Kaygı Modülleri",
    subtitle: "Sınav kaygısını anlamak ve yönetmek için CBT temelli kısa dersler",
    icon: "🧠",
    items: [
      {
        id: "kaygi-nedir",
        type: "lesson",
        title: "Kaygı nedir, neden işe yarar?",
        readMin: 3,
        sections: [
          {
            heading: "Kaygı bir düşman değil",
            body:
              "Kaygı, beynin seni önemli bir şeye hazırlama biçimidir. Sınav senin için anlamlı olduğu için kaygılanıyorsun — umursamasaydın hiç heyecanlanmazdın. Yani kaygının kendisi sorun değil; sorun, kaygının seni çalışamaz ya da uyuyamaz hale getirecek kadar büyümesi."
          },
          {
            heading: "Bedeninde ne oluyor?",
            body:
              "Kalbin hızlanır, ellerin terler, miden bulanır. Bunlar tehlike anında işine yarayacak 'savaş ya da kaç' tepkileridir. Sınavda kaçacak bir aslan yok ama beynin sınavı bir tehdit gibi okuduğunda aynı düğmeye basar. Bu his geçicidir ve seni gerçekten incitmez."
          },
          {
            heading: "Ters U eğrisi",
            body:
              "Hiç kaygı = umursamazlık, çok az çalışma. Çok fazla kaygı = donup kalma, bildiğini unutma. İkisinin ortasında ideal bir denge var: yeterince uyanık ama kontrolde. Amacımız kaygıyı sıfırlamak değil, bu dengede tutmak."
          }
        ],
        takeaway: "Kaygı sana bir şey söyler ama ne yapacağını söylemez. Onu dinle, kararı yine sen ver."
      },
      {
        id: "dusunce-tuzaklari",
        type: "lesson",
        title: "Düşünce tuzakları",
        readMin: 4,
        sections: [
          {
            heading: "Düşünceler gerçek değildir",
            body:
              "'Bu sınavı kaybedersem hayatım biter' bir düşüncedir — bir gerçek değil. Kaygı yükseldiğinde beyin abartmaya, en kötüyü hayal etmeye eğilimlidir. Bu düşünceleri tanıyabilirsen güçlerini kaybederler."
          },
          {
            heading: "En sık 4 tuzak",
            body:
              "1) Felaketleştirme: 'Bir soruyu yanlış yaparsam mahvolurum.' 2) Ya hep ya hiç: 'Tam yapamadıysam başarısızım.' 3) Zihin okuma: 'Herkes benden daha hazır.' 4) Kehanetçilik: 'Nasılsa kötü geçecek.'"
          },
          {
            heading: "Yakala – sına – değiştir",
            body:
              "Yakala: 'Şu an aklımdan geçen düşünce ne?' Sına: 'Bunun kanıtı ne? Aksinin kanıtı ne? En yakın arkadaşıma bunu söylesem ona ne derdim?' Değiştir: Daha gerçekçi bir cümle kur — 'Mükemmel olmasa da elimden gelenin en iyisini yapabilirim.'"
          }
        ],
        takeaway: "Her düşünceye inanmak zorunda değilsin. Düşünceyi mahkemeye çıkar."
      },
      {
        id: "kaygi-dalgasi",
        type: "lesson",
        title: "Kaygı dalgası ve sörf",
        readMin: 3,
        sections: [
          {
            heading: "Kaygının ömrü kısadır",
            body:
              "Yoğun bir kaygı dalgası genelde birkaç dakikada zirveye çıkar, sonra kendiliğinden iner. Kaçmaya çalıştığında ya da kendinle savaştığında dalga daha da büyür. Onunla savaşmak yerine üstünde 'sörf' yapabilirsin."
          },
          {
            heading: "Sörf adımları",
            body:
              "1) 'Şu an bir kaygı dalgası geliyor' diye adlandır. 2) Nerede hissettiğini fark et (göğüs, mide, eller). 3) Nefesini yavaşlat, dalgayı itme — sadece izle. 4) 'Bu da geçecek' de ve geçmesini bekle. Dalga inerken kendine kanıtlamış olursun: dayanabiliyorsun."
          }
        ],
        takeaway: "Kaygıdan kaçmak onu büyütür. İzlemek onu küçültür."
      },
      {
        id: "sinav-aninda-kilitlenme",
        type: "lesson",
        title: "Sınav anında zihin kilitlenirse",
        readMin: 3,
        sections: [
          {
            heading: "Boşluk anı normaldir",
            body:
              "Bildiğin bir şeyi sınavda bir an unutmak çok yaygındır ve hafızanın silindiği anlamına gelmez — kaygı, bilgiye ulaşmanı geçici olarak zorlaştırır. Panik yaparsan kapı daha da kapanır."
          },
          {
            heading: "3 adımlık kurtarma",
            body:
              "1) Kalemi bırak, 3 yavaş nefes al. 2) O soruyu işaretle, geç, kolay bir soru çöz — beynin 'ben yapabiliyorum' moduna girsin. 3) Birkaç dakika sonra zor soruya dön; çoğu zaman bilgi geri gelmiş olur."
          }
        ],
        takeaway: "Tek bir soru sınavı belirlemez. Kolaydan başla, momentum kazan."
      }
    ]
  },

  // ───────────────────────────────────────────────
  // 2) SINAV GÜNÜ STRATEJİLERİ
  // ───────────────────────────────────────────────
  sinavGunu: {
    title: "Sınav Günü Stratejileri",
    subtitle: "Sınavdan önceki gece, sabahı ve sınav anı için pratik rehber",
    icon: "🎯",
    items: [
      {
        id: "onceki-gece",
        type: "lesson",
        title: "Sınavdan önceki gece",
        readMin: 3,
        sections: [
          {
            heading: "Son gece öğrenme gecesi değildir",
            body:
              "Son gece yeni konu öğrenmeye çalışmak kaygıyı artırır, uykuyu böler ve ertesi günkü performansı düşürür. Bu gece dinlenme ve hafif tekrar gecesidir."
          },
          {
            heading: "Yapılacaklar",
            body:
              "Çantanı, kalemini, belgeni bir akşam önceden hazırla. Yarının yol/saat planını yaz. Telefonu erken bırak, ekran ışığını kıs. Sevdiğin sakin bir şey yap (duş, müzik, yürüyüş). Uykuya odaklan — bir gece az uyumak felaket değil, ama panikleyip hiç uyumamak performansı düşürür."
          }
        ],
        takeaway: "Bu gecenin görevi öğrenmek değil, hazır ve dinlenmiş olmak."
      },
      {
        id: "sinav-sabahi",
        type: "lesson",
        title: "Sınav sabahı rutini",
        readMin: 3,
        sections: [
          {
            heading: "Beden hazır = zihin hazır",
            body:
              "Kahvaltını yap (kan şekeri düşükken odaklanmak zorlaşır). Aşırı kafeinden kaçın — kalbini hızlandırıp kaygıyı tetikleyebilir. Erken çık, acele etme; trafikte kapana kısılmak sınav öncesi kaygıyı zirveye taşır."
          },
          {
            heading: "Kapıda kendine söyle",
            body:
              "'Çalıştım, hazırlandım, elimden gelenin en iyisini yapacağım.' Çevrendekilerle son dakika 'sen şunu çalıştın mı?' yarışına girme — bu konuşmalar kaygını bulaştırır. Kulaklık tak ya da bir kenara çekil."
          }
        ],
        takeaway: "Karşılaştırmayı bırak. Bugün senin sınavın, başkasının değil."
      },
      {
        id: "sinav-aninda-strateji",
        type: "lesson",
        title: "Sınav anında zaman ve sıra",
        readMin: 3,
        sections: [
          {
            heading: "Kolaydan zora",
            body:
              "Önce bildiğin soruları çöz, garanti puanları topla. Takıldığın soruyu işaretle ve geç — bir soruda sıkışıp 10 dakika kaybetmek diğer 5 soruyu çözmene mal olur."
          },
          {
            heading: "Mini molalar",
            body:
              "Kaygı yükselince 20 saniyelik bir 'ara' ver: kalemi bırak, 3 yavaş nefes, omuzları gevşet, devam. Bu kayıp değil, yatırımdır — sonraki soruları daha net görürsün."
          }
        ],
        takeaway: "Garanti puanlar önce. Takılırsan işaretle, geç, dön."
      }
    ]
  },

  // ───────────────────────────────────────────────
  // 3) NEFES & GEVŞEME EGZERSİZLERİ
  // ───────────────────────────────────────────────
  nefes: {
    title: "Nefes & Gevşeme",
    subtitle: "Kaygı yükseldiğinde dakikalar içinde sakinleşmen için süreli egzersizler",
    icon: "🌬️",
    items: [
      {
        id: "kutu-nefesi",
        type: "exercise",
        title: "Kutu Nefesi (4-4-4-4)",
        durationSec: 240,
        intro:
          "Sınavdan hemen önce ya da kaygı dalgası gelirken kullan. Kalbini yavaşlatır, zihni netleştirir.",
        steps: [
          { label: "Burnundan nefes al", sec: 4 },
          { label: "Nefesini tut", sec: 4 },
          { label: "Ağzından yavaşça ver", sec: 4 },
          { label: "Nefessiz bekle", sec: 4 }
        ],
        cycles: 6,
        note: "Bir kutunun dört kenarını çizer gibi düşün. 4 turda fark edilir biçimde sakinleşirsin."
      },
      {
        id: "478-nefesi",
        type: "exercise",
        title: "4-7-8 Uyku Nefesi",
        durationSec: 300,
        intro:
          "Sınav gecesi uykuya dalamadığında ya da zihnin durmuyorken kullan. Parasempatik sinir sistemini devreye sokar.",
        steps: [
          { label: "Burnundan nefes al", sec: 4 },
          { label: "Nefesini tut", sec: 7 },
          { label: "Ağzından uzun uzun ver", sec: 8 }
        ],
        cycles: 4,
        note: "Yatakta sırtüstü uzanarak yap. 4 tur yeterli; abartma, hafif baş dönmesi olursa normal nefese dön."
      },
      {
        id: "kas-gevsetme",
        type: "exercise",
        title: "Aşamalı Kas Gevşetme",
        durationSec: 360,
        intro:
          "Bedendeki gerginlik kaygıyı besler. Kasları önce kasıp sonra bırakarak bedeni baştan aşağı gevşetirsin.",
        steps: [
          { label: "Elleri sıkıca yumruk yap, sonra bırak", sec: 15 },
          { label: "Kolları ger, sonra bırak", sec: 15 },
          { label: "Omuzları kulaklara çek, sonra bırak", sec: 15 },
          { label: "Yüzü buruştur, sonra bırak", sec: 15 },
          { label: "Karnı sık, sonra bırak", sec: 15 },
          { label: "Bacakları ger, sonra bırak", sec: 15 },
          { label: "Tüm bedeni gevşek bırak, fark et", sec: 30 }
        ],
        cycles: 1,
        note: "Kasarken nefes al, bırakırken nefes ver. Gerginlik ile gevşekliğin farkını hissetmek amaç."
      },
      {
        id: "topraklanma-54321",
        type: "exercise",
        title: "5-4-3-2-1 Topraklanma",
        durationSec: 180,
        intro:
          "Zihin geleceğe (sınav sonucuna) kaçtığında seni şu ana geri getirir. Panik anında çok etkilidir.",
        steps: [
          { label: "Gördüğün 5 şeyi say", sec: 30 },
          { label: "Dokunabildiğin 4 şeyi fark et", sec: 30 },
          { label: "Duyduğun 3 sesi dinle", sec: 30 },
          { label: "Koklayabildiğin 2 şeyi bul", sec: 30 },
          { label: "Tadabildiğin 1 şeye odaklan", sec: 30 }
        ],
        cycles: 1,
        selfPaced: true,
        note: "Duyularını tek tek dolaşmak beyni 'şimdi'ye sabitler. Sınav sırasında sessizce de yapabilirsin."
      }
    ]
  },

  // ───────────────────────────────────────────────
  // 4) MÜKEMMELİYETÇİLİK MİNİ PROGRAMI
  // ───────────────────────────────────────────────
  mukemmeliyetcilik: {
    title: "Mükemmeliyetçilik Programı",
    subtitle: "5 günde 'her şey kusursuz olmalı' baskısını gevşetmek için rehberli program",
    icon: "🎚️",
    items: [
      {
        id: "mukemmeliyetcilik-program",
        type: "program",
        title: "Yeterince İyi Olmak — 5 Gün",
        intro:
          "Mükemmeliyetçilik seni daha çok çalıştırmaz; seni dondurur, erteletir ve tükettir. Bu 5 günde 'kusursuz' yerine 'yeterince iyi'yi hedeflemeyi öğreneceğiz. Her gün bir okuma + bir küçük görev.",
        days: [
          {
            day: 1,
            title: "Mükemmeliyetçilik vs. yüksek standart",
            body:
              "Yüksek standart: 'İyi yapmak istiyorum, hata yaparsam öğrenirim.' Mükemmeliyetçilik: 'Hata yaparsam değersizim.' İlki seni ileri taşır, ikincisi felç eder. Bugün ikisini ayırmaya başlıyoruz.",
            task: "Bugün ertelediğin bir işi düşün. 'Bunu mükemmel yapamazsam ne olur?' sorusuna dürüstçe yaz. Çoğu zaman cevap sandığından küçüktür."
          },
          {
            day: 2,
            title: "Hata = öğrenme verisi",
            body:
              "Yanlış yaptığın her soru aslında bir hediyedir: tam olarak nerede çalışman gerektiğini gösterir. Hatasız çalışan biri ya çok kolay sorular çözüyordur ya da öğrenmiyordur. Hata, ilerlemenin kanıtıdır.",
            task: "Son denemende yanlış yaptığın 3 soruyu seç. Her biri için 'bu bana ne öğretti?' diye tek cümle yaz. Hatayı veriye çevir."
          },
          {
            day: 3,
            title: "%80 kuralı",
            body:
              "Bir işin son %20'sini kusursuzlaştırmak, ilk %80'ini bitirmek kadar zaman alır. Çoğu zaman %80, fazlasıyla yeterlidir. Mükemmeliyetçi beyin bu %20'de saatlerce takılır ve asıl işi yapamaz.",
            task: "Bugün bir konuyu çalışırken kendine 'bu %80 oldu mu?' diye sor. Olduysa bir sonrakine geç. Bitirmenin tadını çıkar."
          },
          {
            day: 4,
            title: "Kendine arkadaşın gibi konuş",
            body:
              "Bir hata yaptığında kendine söylediklerini en yakın arkadaşına söyler miydin? Muhtemelen hayır. İç sesin acımasızsa, performansın düşer. Şefkatli iç ses daha çok çalıştırır, çünkü hata yapmak korkutucu olmaktan çıkar.",
            task: "Bugün kendini eleştirdiğin bir anı fark et. O cümleyi, sevdiğin birine söyleyeceğin şekilde yeniden yaz."
          },
          {
            day: 5,
            title: "Bilerek 'yeterince iyi' yap",
            body:
              "İyileşmenin yolu pratikten geçer. Bugün bir işi bilerek mükemmelden biraz aşağıda bırakacaksın — ve dünyanın yıkılmadığını göreceksin. Bu, beynine 'kusur güvenli' mesajını verir.",
            task: "Küçük bir işi (bir özet, bir alıştırma) bilerek 'yeterince iyi' seviyede bitir, üstüne dönme. Sonra nasıl hissettiğini bir cümleyle not et."
          }
        ],
        closing:
          "Mükemmeliyetçilik bir gecede gitmez ama her 'yeterince iyi' pratiğiyle gevşer. Hedef kusursuzluk değil, sürdürülebilir ilerleme."
      }
    ]
  },

  // ───────────────────────────────────────────────
  // 5) ERTELEME MİNİ PROGRAMI
  // ───────────────────────────────────────────────
  erteleme: {
    title: "Erteleme Programı",
    subtitle: "5 günde 'sonra çalışırım' döngüsünü kırmak için rehberli program",
    icon: "⏱️",
    items: [
      {
        id: "erteleme-program",
        type: "program",
        title: "Başlamak En Zor Kısım — 5 Gün",
        intro:
          "Erteleme tembellik değildir; çoğu zaman kaygının ya da işin gözünde büyümesinin bir sonucudur. Bu 5 günde başlamayı kolaylaştıran somut teknikler öğreneceğiz.",
        days: [
          {
            day: 1,
            title: "Neden erteliyorsun?",
            body:
              "Erteleme genelde şu üçünden gelir: iş çok büyük göründüğü için, kötü yaparım korkusu için, ya da sıkıcı olduğu için. Sebebi bilmek çözümü değiştirir. Büyükse böl, korkuysa şefkat, sıkıysa ödül.",
            task: "Bugün ertelediğin işi yaz ve yanına sebebini işaretle: çok büyük / korkuyorum / sıkıcı. Düşmanı tanı."
          },
          {
            day: 2,
            title: "2 dakika kuralı",
            body:
              "Beyin başlamaktan korkar, devam etmekten değil. Bir işe sadece 2 dakika başlamaya söz ver. Çoğu zaman 2 dakika sonra zaten devam edersin — çünkü en zor kısım olan 'başlama' bitmiştir.",
            task: "Ertelediğin işe sadece 2 dakika başla. Sürene bak, 2 dakika dolunca durmakta özgürsün. Çoğu zaman durmazsın."
          },
          {
            day: 3,
            title: "İşi parçala",
            body:
              "'Matematik çalış' beyni ürkütür çünkü belirsiz ve dev. 'Türev konusundan 5 soru çöz' yapılabilir görünür. Belirsiz ve büyük işler ertelenir; küçük ve net işler yapılır.",
            task: "Bugünkü en büyük görevini al ve 3 küçük, net adıma böl. Sadece ilk adımı yap."
          },
          {
            day: 4,
            title: "Pomodoro: 25 + 5",
            body:
              "25 dakika tek bir işe odaklan, sonra 5 dakika mola. Saatlerce çalışmak yerine kısa, yoğun bloklar beyni yormadan ilerletir. Mola, çalışmanın parçasıdır — suçluluk duymadan dinlen.",
            task: "Bugün bir 25+5 turu yap: telefon başka odada, tek bir konu, 25 dakika. Mola hak edilmiştir."
          },
          {
            day: 5,
            title: "En zoru sabaha sakla, değil — sabah ilk yap",
            body:
              "Günün en zor ya da en sevmediğin işini sabah ilk iş yap. Bütün gün üstünde asılı kalan bir görev, sen ona dokunmasan bile saatlerce enerjini emer. Erken bitir, günün geri kalanı hafifler.",
            task: "Yarın için bugünden en çok ertelediğin işi seç. Yarın güne onunla başla, gerisi kolaylaşacak."
          }
        ],
        closing:
          "Erteleme alışkanlıktır, karakter değil. Başlamayı kolaylaştırdıkça döngü kırılır. Mükemmel an gelmez; başlamak için iyi an, şimdidir."
      }
    ]
  }
};

export const premiumCategoryOrder = [
  "kaygi",
  "sinavGunu",
  "nefes",
  "mukemmeliyetcilik",
  "erteleme"
];
