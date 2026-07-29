// Standart ekran listesi — TEK YER. Hem shoot-all.mjs (piksel farkı) hem
// contrast-sweep.mjs (metin/zemin süpürmesi) buradan okur; yeni bir ekran
// eklediğinizde ikisi de kendiliğinden kapsar.
//
// "viewport" işaretli ekranlar tam sayfa DEĞİL, yalnızca görünen alan çekilir:
// overlay'ler position:fixed ve tüm viewport'u kaplıyor; fullPage çekimde
// arkalarındaki kaydırılabilir sayfa boyu belirleyici oluyor ve gürültü üretiyor.
export const SCREENS = {
  home:        [],
  exams:       ["tab:Sınavlar"],
  osym:        ["tab:Sınavlar", "btn:ÖSYM Takvimi"],
  manual:      ["tab:Sınavlar", "btn:Manuel Ekle"],
  goals:       ["tab:Hedefler"],
  anx:         ["tab:Kaygı"],
  "anx-low":   ["tab:Kaygı", "radio:1"],
  report:      ["tab:Rapor"],
  hub:         ["btn:Psikoloji"],
  "psych-cat": ["btn:Psikoloji", "btn:Nefes & Gevşeme"],
  breath:      ["btn:Psikoloji", "btn:Nefes & Gevşeme", "btn:Kutu Nefesi"],
  // Grup 7 — overlay'ler
  paywall:     ["btn:Psikoloji", "btn:Nefes & Gevşeme", "btn:4-7-8 Uyku Nefesi", "viewport"],
  confirm:     ["tab:Rapor", "btn:Tüm verileri sıfırla", "viewport"],
  toast:       ["tab:Rapor", "btn:Günlük hatırlatma", "viewport"],
};
