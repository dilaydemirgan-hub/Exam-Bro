//  SharedStore.swift
//  App Group'tan köprü payload'ını okur. Yazan taraf:
//  ios/App/App/WidgetBridge.swift (ana uygulama) — sözleşme docs/LIGHT-MODE.md §11.

import Foundation

struct WidgetExam: Decodable, Identifiable {
    let id: String
    let name: String
    let date: Date
    /// "#RRGGBB" — **görüntülenecek** renk. Ham veri rengi DEĞİL: uygulama
    /// açık modda `ink()`'ten geçirip gönderiyor (ham `#10d99e` açık zeminde
    /// 1.7:1, okunmuyor). Koyu modda ink() rengi aynen döndürdüğü için değer
    /// veri rengiyle aynı olur. Tema değişince köprü yeniden yazıyor.
    let color: String?
}

struct WidgetPayload: Decodable {
    /// ÇÖZÜLMÜŞ tema: "dark" | "light". Köprü "system" göndermez.
    let theme: String?
    let exams: [WidgetExam]
    let updatedAt: Date?

    static let empty = WidgetPayload(theme: "dark", exams: [], updatedAt: nil)
}

enum SharedStore {
    /// Her iki entitlements dosyasıyla ve WidgetBridge.appGroup ile aynı olmalı.
    static let appGroup = "group.com.exambroapp.sinav"
    static let payloadKey = "widgetPayload"

    /// JS `toISOString()` KESİRLİ SANİYE üretiyor ("…T09:00:00.000Z").
    /// `.iso8601` stratejisi kesirli saniyeyi parse ETMEZ; iki formatter de denenir.
    private static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let plain: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    private static var decoder: JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { dec in
            let s = try dec.singleValueContainer().decode(String.self)
            if let date = withFraction.date(from: s) ?? plain.date(from: s) { return date }
            throw DecodingError.dataCorrupted(.init(
                codingPath: dec.codingPath,
                debugDescription: "ISO8601 tarih çözümlenemedi: \(s)"))
        }
        return d
    }

    /// Payload yoksa/bozuksa BOŞ döner — widget asla çökmemeli, boş durum gösterir.
    static func load() -> WidgetPayload {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let json = defaults.string(forKey: payloadKey),
              let data = json.data(using: .utf8),
              let payload = try? decoder.decode(WidgetPayload.self, from: data)
        else { return .empty }
        return payload
    }
}
