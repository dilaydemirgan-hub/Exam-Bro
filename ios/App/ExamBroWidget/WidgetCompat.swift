//  WidgetCompat.swift
//  iOS 15/16 ↔ iOS 17+ farklarını TEK yerde toplar.
//
//  Deployment target 15.0 ama iOS 17 widget'ları `containerBackground` ister:
//  iOS 17'de sistem widget'ın zeminini kendisi çizer ve `.background(...)`
//  ARTIK YOK SAYILIR. Bu API çağrılmazsa widget iOS 17+'da varsayılan (yanlış)
//  zeminle çıkar; StandBy ve kilit ekranı gibi bağlamlarda da bozuk görünür.
//  Tersine `containerBackground` iOS 15/16'da hiç yok, koşulsuz çağrılamaz.
//
//  Bu yüzden ikisi de destekleniyor — tek sürümde çalışan kod yazılmadı.

import SwiftUI
import WidgetKit

extension View {
    /// Widget kökünün zeminini iki dünyada da doğru verir.
    /// iOS 17+: `containerBackground(_:for: .widget)` · iOS 15/16: `background(_:)`
    @ViewBuilder
    func widgetContainerBackground(_ color: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(color, for: .widget)
        } else {
            self.background(color)
        }
    }
}

//  ⚠️ `contentMarginsDisabled()` için BİLEREK sarmalayıcı YAZILMADI.
//  `WidgetConfiguration` uzantısında `some WidgetConfiguration` döndüren bir
//  yardımcı DERLENMEZ: `#available` dallarının biri `contentMarginsDisabled()`
//  tipini, diğeri `Self`'i döndürür — opaque dönüş tipi TEK somut tip ister ve
//  `@ViewBuilder`ın View'lar için yaptığı tip silme burada yok (public bir
//  `AnyWidgetConfiguration` da yok).
//
//  Karar: iOS 17'nin varsayılan kenar boşlukları KABUL EDİLDİ, tasarım onlara
//  göre yapıldı. Bunun bedeli iOS 15/16'da birkaç puan daha dar bir içerik
//  alanı — bozulma değil. İleride gerçekten gerekirse çözüm, widget'ın
//  `body`'sini iki ayrı somut tip döndüren AYRI `@available` fonksiyonlara
//  bölmektir, bu uzantıyı "düzeltmek" değil.
