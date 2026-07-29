//  ExamBroWidgetBundle.swift
//
//  ⚠️ AŞAMA 1 İSKELETİ — Aşama 2'de üç boyutun gerçek tasarımıyla değiştirilecek.
//  Şu anki hâli KASITLI olarak minimum: target'ın gerçekten derlendiğini,
//  App Group'tan okuduğunu ve temayı köprüden aldığını doğrulamak için var.
//  Bir app extension'ın @main giriş noktası olmadan link edilemez, o yüzden
//  target oluşturulurken bu dosya da gerekliydi.

import WidgetKit
import SwiftUI

struct ExamBroEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload
}

struct ExamBroProvider: TimelineProvider {
    // Galeride/yüklenirken boş görünmesin diye dolu örnek.
    private var sample: WidgetPayload {
        WidgetPayload(
            theme: "dark",
            exams: [WidgetExam(id: "TYT", name: "TYT",
                               date: Calendar.current.date(byAdding: .day, value: 42, to: Date()) ?? Date(),
                               color: "#9d5cff")],
            updatedAt: Date())
    }

    func placeholder(in context: Context) -> ExamBroEntry {
        ExamBroEntry(date: Date(), payload: sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (ExamBroEntry) -> Void) {
        let payload = context.isPreview ? sample : SharedStore.load()
        completion(ExamBroEntry(date: Date(), payload: payload))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ExamBroEntry>) -> Void) {
        // Aşama 2: gece yarısı yeniden hesaplama + Large'daki saat için saatlik refresh.
        let entry = ExamBroEntry(date: Date(), payload: SharedStore.load())
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct ExamBroWidgetView: View {
    let entry: ExamBroEntry
    // Tema App Group'tan; @Environment(\.colorScheme) BİLEREK kullanılmıyor —
    // kullanıcının uygulama içi seçimi kazanmalı (docs/LIGHT-MODE.md §11).
    private var theme: WidgetTheme { WidgetTheme.named(entry.payload.theme) }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let exam = entry.payload.exams.first {
                Text(exam.name)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(theme.text3)
                Text("\(max(0, Calendar.current.dateComponents([.day], from: Date(), to: exam.date).day ?? 0))")
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.text1)
                Text("gün")
                    .font(.system(size: 12))
                    .foregroundStyle(theme.text4)
            } else {
                Text("Uygulamadan sınav seç")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(theme.text3)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(14)
        .widgetContainerBackground(theme.bg)
    }
}

struct ExamBroWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ExamBroWidget", provider: ExamBroProvider()) { entry in
            ExamBroWidgetView(entry: entry)
        }
        .configurationDisplayName("Exam Bro")
        .description("Sınav geri sayımı")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

@main
struct ExamBroWidgetBundle: WidgetBundle {
    var body: some Widget { ExamBroWidget() }
}
