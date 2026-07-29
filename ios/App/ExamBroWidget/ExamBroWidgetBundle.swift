//  ExamBroWidgetBundle.swift
//  Widget giriş noktası: timeline sağlayıcı + boyut seçimi.

import WidgetKit
import SwiftUI

struct ExamBroEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload
}

struct ExamBroProvider: TimelineProvider {
    /// Galeride ve yüklenirken BOŞ görünmesin diye dolu örnek.
    /// Gerçek veri yokken de widget'ın ne işe yaradığı anlaşılmalı.
    private var sample: WidgetPayload {
        let cal = ExamCountdown.calendar
        let d1 = cal.date(byAdding: .day, value: 42, to: Date()) ?? Date()
        let d2 = cal.date(byAdding: .day, value: 96, to: Date()) ?? Date()
        return WidgetPayload(theme: "dark", exams: [
            WidgetExam(id: "TYT", name: "TYT", date: d1, color: "#9d5cff"),
            WidgetExam(id: "AYT", name: "AYT/YDT", date: d2, color: "#ff4d94"),
        ], updatedAt: Date())
    }

    func placeholder(in context: Context) -> ExamBroEntry {
        ExamBroEntry(date: Date(), payload: sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (ExamBroEntry) -> Void) {
        // Galeri önizlemesi (isPreview) her zaman dolu; gerçek snapshot App Group'tan.
        let payload = context.isPreview ? sample : SharedStore.load()
        completion(ExamBroEntry(date: Date(), payload: payload))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ExamBroEntry>) -> Void) {
        let now = Date()
        let cal = ExamCountdown.calendar
        let payload = SharedStore.load()

        // Saatlik giriş (Large'daki saat için) + GECE YARISI kesin bir giriş:
        // gün sayısı tam orada değişiyor, saat başlarına bırakılırsa
        // "kalan gün" bir sonraki saate kadar bayat kalırdı.
        var dates: Set<Date> = [now]
        if let firstHour = cal.nextDate(after: now,
                                        matching: DateComponents(minute: 0, second: 0),
                                        matchingPolicy: .nextTime) {
            for i in 0..<24 {
                dates.insert(firstHour.addingTimeInterval(Double(i) * 3600))
            }
        }
        if let midnight = cal.nextDate(after: now,
                                       matching: DateComponents(hour: 0, minute: 0, second: 0),
                                       matchingPolicy: .nextTime) {
            dates.insert(midnight)
        }

        let entries = dates.sorted().map { ExamBroEntry(date: $0, payload: payload) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct ExamBroWidgetView: View {
    let entry: ExamBroEntry
    @Environment(\.widgetFamily) private var family

    // ⚠️ Tema App Group'tan gelen çözülmüş değerden. @Environment(\.colorScheme)
    // BİLEREK kullanılmıyor — uygulama içi seçim cihaz görünümünü yenmeli.
    private var theme: WidgetTheme { WidgetTheme.named(entry.payload.theme) }
    private var exams: [WidgetExam] { entry.payload.exams }

    var body: some View {
        content
            .widgetContainerBackground(theme.bg)
            // Dokununca ilgili sınav ekranı açılsın; sınav yoksa uygulama açılsın.
            .widgetURL(exams.first.flatMap { ExamCountdown.deepLink(examID: $0.id) }
                       ?? URL(string: "exambro://exams"))
    }

    @ViewBuilder
    private var content: some View {
        switch family {
        case .systemSmall:
            SmallView(exam: exams.first, theme: theme, now: entry.date)
        case .systemLarge:
            LargeView(exams: exams, theme: theme, now: entry.date)
        default:
            MediumView(exams: exams, theme: theme, now: entry.date)
        }
    }
}

struct ExamBroWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ExamBroWidget", provider: ExamBroProvider()) { entry in
            ExamBroWidgetView(entry: entry)
        }
        .configurationDisplayName("Sınav Geri Sayımı")
        .description("Seçtiğin sınavlara kalan günü ana ekranında gör.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

@main
struct ExamBroWidgetBundle: WidgetBundle {
    var body: some Widget { ExamBroWidget() }
}
