//  SnapshotTests.swift
//  Widget tasarımlarını GERÇEK widget ölçülerinde PNG'ye render eder.
//
//  NEDEN BÖYLE: simülatörün ana ekranına widget EKLEMEK script'lenemiyor —
//  `simctl`de böyle bir komut yok, tek yol elle sürükle-bırak. Bu test, widget'ın
//  gövdesini oluşturan AYNI View'ları aynı ölçülerde render ediyor. Yakalamadığı
//  tek şey sistemin çizdiği dış kabuk (köşe yarıçapı, iOS 17 containerBackground
//  davranışı) — tasarımın kendisi birebir bu.
//
//  Çalıştırma: tools/ios-setup/snapshot-widgets.sh

import XCTest
import SwiftUI

/// `@MainActor`: `ImageRenderer` main-actor izole; init'i, `scale`'i ve
/// `uiImage`'i nonisolated bağlamdan kullanmak derleme hatası veriyor.
@MainActor
final class SnapshotTests: XCTestCase {

    /// iPhone (390pt genişlik sınıfı) için standart widget ölçüleri.
    private let sizes: [String: CGSize] = [
        "small":  CGSize(width: 158, height: 158),
        "medium": CGSize(width: 338, height: 158),
        "large":  CGSize(width: 338, height: 354),
    ]

    /// Sabit "şimdi" → çıktı deterministik (gün sayıları her koşuda aynı).
    private let now: Date = {
        var c = DateComponents()
        c.year = 2026; c.month = 7; c.day = 29; c.hour = 9; c.minute = 0
        return ExamCountdown.calendar.date(from: c) ?? Date()
    }()

    private func exam(_ id: String, _ name: String, plusDays: Int, _ color: String) -> WidgetExam {
        let d = ExamCountdown.calendar.date(byAdding: .day, value: plusDays, to: now) ?? now
        return WidgetExam(id: id, name: name, date: d, color: color)
    }

    private var outDir: URL {
        let path = ProcessInfo.processInfo.environment["SNAPSHOT_DIR"]
            ?? NSTemporaryDirectory().appending("widget-shots")
        let url = URL(fileURLWithPath: path)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    @available(iOS 16.0, *)
    private func snap<V: View>(_ view: V, _ name: String, _ size: CGSize) {
        let renderer = ImageRenderer(content:
            view.frame(width: size.width, height: size.height)
        )
        renderer.scale = 2
        guard let image = renderer.uiImage, let data = image.pngData() else {
            return XCTFail("render edilemedi: \(name)")
        }
        let url = outDir.appendingPathComponent("\(name).png")
        do { try data.write(to: url) } catch { XCTFail("yazılamadı \(name): \(error)") }
        print("SNAPSHOT \(url.path)")
    }

    func testAllSizesBothThemes() throws {
        guard #available(iOS 16.0, *) else {
            throw XCTSkip("ImageRenderer iOS 16+ gerektiriyor")
        }

        // Köprü GÖRÜNTÜLENECEK rengi gönderiyor: açık modda uygulamanın ink()'i
        // AA'yı geçen tona indiriyor, koyu modda ham veri rengi aynen kalıyor
        // (docs/LIGHT-MODE.md §6 hesaplanmış değerler tablosu). Snapshot'lar
        // gerçeği yansıtsın diye burada da aynı çiftler kullanılıyor.
        let ink: [String: (dark: String, light: String)] = [
            "violet": ("#9d5cff", "#7848c4"),
            "pink":   ("#ff4d94", "#ae386b"),
            "green":  ("#10d99e", "#10775e"),
            "blue":   ("#5c9bff", "#3f66a9"),
        ]
        let themes: [(String, WidgetTheme)] = [("dark", .dark), ("light", .light)]

        for (tName, theme) in themes {
            let c = { (k: String) -> String in
                tName == "light" ? ink[k]!.light : ink[k]!.dark
            }
            let two = [exam("TYT", "TYT", plusDays: 326, c("violet")),
                       exam("AYT", "AYT/YDT", plusDays: 327, c("pink"))]
            let one = [two[0]]
            let today = [exam("LGS", "LGS", plusDays: 0, c("green"))]
            let passed = [exam("DGS", "DGS", plusDays: -3, c("blue"))]

            // ── 3 boyut × 2 tema, 2 sınav senaryosu ──
            snap(SmallView(exam: two.first, theme: theme, now: now)
                    .background(theme.bg), "small-\(tName)-2exam", sizes["small"]!)
            snap(MediumView(exams: two, theme: theme, now: now)
                    .background(theme.bg), "medium-\(tName)-2exam", sizes["medium"]!)
            snap(LargeView(exams: two, theme: theme, now: now)
                    .background(theme.bg), "large-\(tName)-2exam", sizes["large"]!)

            // ── 1 sınav (Medium'da tek büyük blok + ilerleme çubuğu) ──
            snap(SmallView(exam: one.first, theme: theme, now: now)
                    .background(theme.bg), "small-\(tName)-1exam", sizes["small"]!)
            snap(MediumView(exams: one, theme: theme, now: now)
                    .background(theme.bg), "medium-\(tName)-1exam", sizes["medium"]!)
            snap(LargeView(exams: one, theme: theme, now: now)
                    .background(theme.bg), "large-\(tName)-1exam", sizes["large"]!)

            // ── 0 sınav (boş durum) ──
            snap(SmallView(exam: nil, theme: theme, now: now)
                    .background(theme.bg), "small-\(tName)-0exam", sizes["small"]!)
            snap(MediumView(exams: [], theme: theme, now: now)
                    .background(theme.bg), "medium-\(tName)-0exam", sizes["medium"]!)
            snap(LargeView(exams: [], theme: theme, now: now)
                    .background(theme.bg), "large-\(tName)-0exam", sizes["large"]!)

            // ── "Bugün!" ve "Geçti" — negatif gün gösterilmemeli ──
            snap(SmallView(exam: today.first, theme: theme, now: now)
                    .background(theme.bg), "small-\(tName)-today", sizes["small"]!)
            snap(LargeView(exams: today + passed, theme: theme, now: now)
                    .background(theme.bg), "large-\(tName)-today-passed", sizes["large"]!)
        }
    }

    /// Durum mantığı: negatif gün ASLA sızmamalı.
    func testStatusNeverNegative() {
        let cal = ExamCountdown.calendar
        for delta in -10...10 {
            let d = cal.date(byAdding: .day, value: delta, to: now)!
            let s = ExamCountdown.status(for: d, now: now)
            let text = ExamCountdown.headline(for: s)
            XCTAssertFalse(text.contains("-"), "negatif gün sızdı: delta=\(delta) → \(text)")
            switch delta {
            case let d where d > 0: XCTAssertEqual(s, .upcoming(days: delta))
            case 0:                 XCTAssertEqual(s, .today)
            default:                XCTAssertEqual(s, .passed)
            }
        }
    }

    /// Köprüden gelen tema "system" olsa bile koyuya düşmeli (asla çökmemeli).
    func testThemeResolution() {
        XCTAssertEqual(WidgetTheme.named("light").bg, WidgetTheme.light.bg)
        XCTAssertEqual(WidgetTheme.named("dark").bg, WidgetTheme.dark.bg)
        XCTAssertEqual(WidgetTheme.named("system").bg, WidgetTheme.dark.bg)
        XCTAssertEqual(WidgetTheme.named(nil).bg, WidgetTheme.dark.bg)
    }
}
