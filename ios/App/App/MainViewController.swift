//  MainViewController.swift
//
//  ⚠️ NEDEN VAR: Capacitor 8, UYGULAMA TARGET'INDA tanımlı yerel plugin'leri
//  OTOMATİK KEŞFETMİYOR. `@objc` + `CAPBridgedPlugin` uygunluğu yetmedi —
//  WidgetBridge.swift derlenip binary'ye girdiği hâlde köprü çağrısı
//  `"WidgetBridge" plugin is not implemented on ios` diye reddedildi
//  (simülatör konsolundan doğrulandı).
//
//  Capacitor'ın header'ında bunun için açık bir API var:
//      - (void)registerPluginType:(SWIFT_METATYPE(CAPPlugin))pluginType;
//  yani yerel plugin'ler ELLE kaydedilmeli. `capacitorDidLoad()` bunun için
//  ayrılmış hook.
//
//  Main.storyboard'daki view controller'ın sınıfı CAPBridgeViewController'dan
//  bu sınıfa çevrildi; aksi hâlde hook hiç çalışmaz.

import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        // `registerPluginType(_:)` YETMEDİ: çağrı native'e ulaşıyor ama köprü
        // "Error loading plugin WidgetBridge for call" diyor — tip kaydından
        // örnek üretme adımı yerel plugin için çalışmıyor. `registerPluginInstance`
        // örneği doğrudan veriyor ve bu yol çalışıyor (simülatörde doğrulandı).
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}
