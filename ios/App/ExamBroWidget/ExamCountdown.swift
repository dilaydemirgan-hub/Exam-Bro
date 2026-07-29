//  ExamCountdown.swift
//  Geri sayım mantığı ve Türkçe biçimlendirme — TEK yer.
//  Tarihler cihazın SAAT DİLİMİNDE, etiketler Locale(tr_TR) ile.

import Foundation
import SwiftUI

enum ExamStatus: Equatable {
    case upcoming(days: Int)   // days >= 1
    case today
    case passed
}

enum ExamCountdown {
    static let locale = Locale(identifier: "tr_TR")

    /// Cihazın saat dilimi + Türkçe takvim. Gün farkı GÜN BAŞLANGIÇLARINDAN
    /// hesaplanır: 23:59'da "yarın" olan sınav 00:01'de "bugün" olmalı.
    static var calendar: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.locale = locale
        c.timeZone = .current
        return c
    }

    static func status(for date: Date, now: Date = Date()) -> ExamStatus {
        let cal = calendar
        let days = cal.dateComponents([.day],
                                      from: cal.startOfDay(for: now),
                                      to: cal.startOfDay(for: date)).day ?? 0
        if days > 0 { return .upcoming(days: days) }
        // Sınav günü, saati geçmiş olsa bile gün boyunca "Bugün!" kalır.
        return days == 0 ? .today : .passed
    }

    /// ASLA negatif gün göstermez — çağıranlar bu üç durumu ayrı ele alır.
    static func headline(for status: ExamStatus) -> String {
        switch status {
        case .upcoming(let d): return "\(d)"
        case .today:           return "Bugün!"
        case .passed:          return "Geçti"
        }
    }

    private static func fmt(_ pattern: String) -> DateFormatter {
        let f = DateFormatter()
        f.locale = locale
        f.timeZone = .current
        f.setLocalizedDateFormatFromTemplate(pattern)
        return f
    }

    /// "19 Haz"
    static func shortDate(_ d: Date) -> String { fmt("dMMM").string(from: d) }
    /// "19 Haziran 2027"
    static func fullDate(_ d: Date) -> String { fmt("dMMMMyyyy").string(from: d) }
    /// "09:30"
    static func time(_ d: Date) -> String {
        let f = DateFormatter()
        f.locale = locale
        f.timeZone = .current
        f.dateFormat = "HH:mm"
        return f.string(from: d)
    }

    /// İlerleme çubuğunun paydası. Payload'da başlangıç tarihi YOK (§11
    /// sözleşmesi id/name/date/color), o yüzden sabit bir ufuk tanımlanıyor:
    /// "sınavdan bir yıl önce" → 0, sınav günü → 1. Bir yıldan uzaksa çubuk boş.
    static let horizonDays: Double = 365

    static func progress(to date: Date, now: Date = Date()) -> Double {
        let remaining = date.timeIntervalSince(now) / 86_400
        if remaining <= 0 { return 1 }
        return min(1, max(0, 1 - remaining / horizonDays))
    }

    /// Sınav rengi VERİdir ("#RRGGBB"); yoksa temanın vurgusuna düşer.
    static func color(_ hex: String?, fallback: Color) -> Color {
        guard var s = hex, s.hasPrefix("#") else { return fallback }
        s.removeFirst()
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return fallback }
        return Color(hex: v)
    }

    /// Widget'a dokununca uygulamada ilgili sınav ekranı açılsın.
    /// Şema Info.plist'te CFBundleURLTypes ile kayıtlı.
    static func deepLink(examID: String) -> URL? {
        let safe = examID.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? examID
        return URL(string: "exambro://exam/\(safe)")
    }
}
