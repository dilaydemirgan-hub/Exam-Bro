//  WidgetBridge.swift
//  ANA UYGULAMA target'ına ait yerel Capacitor plugin'i (widget target'ına EKLEMEYİN).
//
//  NEDEN AYRI BİR KÖPRÜ GEREKTİ — @capacitor/preferences yetmiyor:
//  Kurulu sürümün (8.0.1) kaynağına bakıldı. Preferences.swift içinde
//      private var defaults: UserDefaults { return UserDefaults.standard }
//  yani depo HER ZAMAN UserDefaults.standard. Plugin'in `group` seçeneği bir
//  App Group DEĞİL, yalnızca anahtar ÖNEKİ ("CapacitorStorage." gibi;
//  applyPrefix(to:)). UserDefaults(suiteName:) hiçbir yerde kullanılmıyor.
//  Sonuç: Preferences ile yazılan veri paylaşılan konteynere GİRMEZ, widget
//  extension'ı okuyamaz. Bu yüzden yazma da yeniden yükleme de burada.
//
//  JS tarafı: src/widget.js → registerPlugin("WidgetBridge")

import Foundation
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumePendingURL", returnType: CAPPluginReturnPromise)
    ]

    /// Widget deep link'i. AppDelegate yazar, JS bir kez okuyup tüketir.
    /// @capacitor/app eklememek için mevcut köprü kullanılıyor.
    public static var pendingURL: String?

    /// Widget extension'ı da AYNI sabiti kullanır (ExamBroWidget/SharedStore.swift).
    static let appGroup = "group.com.exambroapp.sinav"
    static let payloadKey = "widgetPayload"

    @objc func sync(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("WidgetBridge.sync: 'json' parametresi gerekli")
            return
        }

        // App Group'a gerçekten erişebiliyor muyuz? UserDefaults(suiteName:)
        // entitlement eksikken de nil DÖNMEYEBİLİR (yazar ama paylaşılmaz),
        // bu yüzden konteyner URL'siyle kontrol ediyoruz — o, hak yoksa nil döner.
        guard FileManager.default
                .containerURL(forSecurityApplicationGroupIdentifier: Self.appGroup) != nil else {
            call.reject("""
                App Group '\(Self.appGroup)' erişilemiyor. Olası sebepler:
                (1) App.entitlements dosyası yok ya da target'a bağlı değil,
                (2) Signing & Capabilities'te App Groups eklenmemiş,
                (3) provisioning profile App Group eklendikten sonra yenilenmemiş.
                """)
            return
        }

        guard let shared = UserDefaults(suiteName: Self.appGroup) else {
            call.reject("UserDefaults(suiteName: '\(Self.appGroup)') açılamadı")
            return
        }

        shared.set(json, forKey: Self.payloadKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    /// Bekleyen widget deep link'ini döndürür ve TÜKETİR (bir kez okunur).
    @objc func consumePendingURL(_ call: CAPPluginCall) {
        let url = Self.pendingURL
        Self.pendingURL = nil
        call.resolve(["url": url as Any])
    }
}
