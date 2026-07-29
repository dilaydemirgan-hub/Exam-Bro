//  WidgetViews.swift
//  Üç boyutun tasarımı.
//
//  ⚠️ Renkler App Group'tan gelen `theme` ile seçilir. `@Environment(\.colorScheme)`
//  KULLANILMAZ — kullanıcının uygulama içi seçimi cihaz görünümünü yenmeli
//  (docs/LIGHT-MODE.md §11). Bu yüzden her View `WidgetTheme`'i parametre alır.

import SwiftUI
import WidgetKit

// ── Ortak parçalar ───────────────────────────────────────────

/// İlerleme çubuğu. Uygulamadaki ProgressBar'ın dilini izler: iz + dolgu,
/// ize ince bir kenarlık (açık modda iz kartın üstünde kayboluyordu, §4).
struct WidgetProgressBar: View {
    let value: Double
    let tint: Color
    let theme: WidgetTheme

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(theme.track)
                    .overlay(Capsule().strokeBorder(theme.trackLine, lineWidth: 1))
                Capsule().fill(tint)
                    .frame(width: max(0, min(1, value)) * geo.size.width)
            }
        }
        .frame(height: 6)
    }
}

/// Hiç sınav seçilmemişken. Galeride de boş görünmesin diye her boyutta aynı.
struct EmptyStateView: View {
    let theme: WidgetTheme
    var body: some View {
        VStack(spacing: 6) {
            Text("Sınav seçilmedi")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(theme.text2)
            Text("Uygulamadan sınav seç")
                .font(.system(size: 12))
                .foregroundStyle(theme.text4)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(12)
    }
}

/// Geri sayım rakamı/etiketi. "Bugün!" ve "Geçti" rakam DEĞİL, o yüzden
/// punto düşürülüp "gün" etiketi gizleniyor — negatif gün asla yazılmıyor.
struct CountdownBlock: View {
    let status: ExamStatus
    let size: CGFloat
    let tint: Color
    let theme: WidgetTheme
    var showsUnit = true

    private var isNumeric: Bool { if case .upcoming = status { return true }; return false }

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 4) {
            Text(ExamCountdown.headline(for: status))
                .font(.system(size: isNumeric ? size : size * 0.52,
                              weight: .bold, design: .rounded))
                .foregroundStyle(isNumeric ? theme.text1 : tint)
                .minimumScaleFactor(0.5)
                .lineLimit(1)
            if isNumeric && showsUnit {
                Text("gün")
                    .font(.system(size: max(10, size * 0.30), weight: .medium))
                    .foregroundStyle(theme.text4)
            }
        }
    }
}

// ── SMALL — seçilenlerin İLKİ ────────────────────────────────
struct SmallView: View {
    let exam: WidgetExam?
    let theme: WidgetTheme
    let now: Date

    var body: some View {
        if let exam {
            let tint = ExamCountdown.color(exam.color, fallback: theme.violet)
            VStack(alignment: .leading, spacing: 0) {
                Text(exam.name)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(tint)
                    .lineLimit(1)
                Spacer(minLength: 4)
                CountdownBlock(status: ExamCountdown.status(for: exam.date, now: now),
                               size: 46, tint: tint, theme: theme, showsUnit: false)
                if case .upcoming = ExamCountdown.status(for: exam.date, now: now) {
                    Text("gün")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(theme.text4)
                }
                Spacer(minLength: 4)
                Text(ExamCountdown.shortDate(exam.date))
                    .font(.system(size: 12))
                    .foregroundStyle(theme.text3)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .padding(14)
        } else {
            EmptyStateView(theme: theme)
        }
    }
}

// ── MEDIUM — iki sınav yan yana, tek sınavsa büyük tek blok ──
struct MediumView: View {
    let exams: [WidgetExam]
    let theme: WidgetTheme
    let now: Date

    var body: some View {
        if exams.isEmpty {
            EmptyStateView(theme: theme)
        } else if exams.count == 1, let exam = exams.first {
            // Tek sınav: ortada büyük blok + ilerleme çubuğu.
            let tint = ExamCountdown.color(exam.color, fallback: theme.violet)
            VStack(spacing: 8) {
                Text(exam.name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(tint)
                    .lineLimit(1)
                CountdownBlock(status: ExamCountdown.status(for: exam.date, now: now),
                               size: 52, tint: tint, theme: theme)
                Text(ExamCountdown.fullDate(exam.date))
                    .font(.system(size: 12))
                    .foregroundStyle(theme.text3)
                WidgetProgressBar(value: ExamCountdown.progress(to: exam.date, now: now),
                                  tint: tint, theme: theme)
                    .padding(.horizontal, 28)
                    .padding(.top, 2)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(14)
        } else {
            HStack(spacing: 0) {
                ForEach(Array(exams.prefix(2).enumerated()), id: \.element.id) { idx, exam in
                    if idx > 0 {
                        // İnce dikey ayırıcı
                        Rectangle().fill(theme.border).frame(width: 1)
                            .padding(.vertical, 14)
                    }
                    let tint = ExamCountdown.color(exam.color, fallback: theme.violet)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(exam.name)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(tint)
                            .lineLimit(1)
                        Spacer(minLength: 2)
                        CountdownBlock(status: ExamCountdown.status(for: exam.date, now: now),
                                       size: 34, tint: tint, theme: theme)
                        Text(ExamCountdown.shortDate(exam.date))
                            .font(.system(size: 11.5))
                            .foregroundStyle(theme.text3)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                    .padding(14)
                }
            }
        }
    }
}

// ── LARGE — iki sınav alt alta kart ──────────────────────────
struct LargeView: View {
    let exams: [WidgetExam]
    let theme: WidgetTheme
    let now: Date

    var body: some View {
        if exams.isEmpty {
            EmptyStateView(theme: theme)
        } else {
            VStack(spacing: 10) {
                ForEach(exams.prefix(2)) { exam in
                    card(exam)
                }
                if exams.count == 1 { Spacer(minLength: 0) }
                Spacer(minLength: 0)
                // En altta ince satır
                Text("Exam Bro · güncellendi \(ExamCountdown.time(now))")
                    .font(.system(size: 10))
                    .foregroundStyle(theme.text4)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .padding(14)
        }
    }

    @ViewBuilder
    private func card(_ exam: WidgetExam) -> some View {
        let tint = ExamCountdown.color(exam.color, fallback: theme.violet)
        let status = ExamCountdown.status(for: exam.date, now: now)
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(exam.name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(tint)
                    .lineLimit(1)
                Spacer(minLength: 8)
                CountdownBlock(status: status, size: 28, tint: tint, theme: theme)
            }
            HStack(spacing: 6) {
                Text(ExamCountdown.fullDate(exam.date))
                Text("·")
                Text(ExamCountdown.time(exam.date))
            }
            .font(.system(size: 11.5))
            .foregroundStyle(theme.text3)

            WidgetProgressBar(value: ExamCountdown.progress(to: exam.date, now: now),
                              tint: tint, theme: theme)
                .padding(.top, 2)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(theme.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(theme.borderSoft, lineWidth: 1)
                )
        )
    }
}
