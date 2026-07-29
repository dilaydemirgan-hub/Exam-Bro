//  WidgetTheme.swift
//  ⚠️ ÜRETİLMİŞTİR — ELLE DÜZENLEMEYİN.
//
//  Kaynak:  src/index.css
//  Üreten:  tools/theme-check/gen-widget-theme.mjs
//
//  Palet değiştiğinde yeniden üretin:
//      node tools/theme-check/gen-widget-theme.mjs
//  Güncel mi diye bakmak için:
//      node tools/theme-check/gen-widget-theme.mjs --check
//
//  Bu dosyayı elle düzenlerseniz bir sonraki üretim değişikliğinizi siler ve
//  widget uygulamanın paletinden sessizce ayrışır.

import SwiftUI

extension Color {
    /// 0xRRGGBB — üretilen paletin tek renk kurucusu.
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red:   Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue:  Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

/// Widget paleti. Renk seçimi App Group'tan okunan `theme` ile yapılır —
/// `@Environment(\.colorScheme)` KULLANILMAZ, kullanıcının uygulama içi
/// seçimi kazanmalı (docs/LIGHT-MODE.md §11).
struct WidgetTheme {
    let bg: Color
    let surface: Color
    let surfaceRaised: Color
    let border: Color
    let borderSoft: Color
    let text1: Color
    let text2: Color
    let text3: Color
    let text4: Color
    let violet: Color
    let green: Color
    let gold: Color
    let track: Color
    let trackLine: Color

    static let dark = WidgetTheme(
        bg: Color(hex: 0x080810),
        surface: Color(hex: 0x14141F),
        surfaceRaised: Color(hex: 0x1A1A2E),
        border: Color(hex: 0x23233A),
        borderSoft: Color(hex: 0x1A1A2C),
        text1: Color(hex: 0xF2F2F8),
        text2: Color(hex: 0xB4B4CC),
        text3: Color(hex: 0x8A8AA6),
        text4: Color(hex: 0x62627E),
        violet: Color(hex: 0x9D5CFF),
        green: Color(hex: 0x10D99E),
        gold: Color(hex: 0xFFBE0B),
        track: Color(hex: 0x22223A),
        trackLine: Color.clear
    )

    static let light = WidgetTheme(
        bg: Color(hex: 0xF2F2F6),
        surface: Color(hex: 0xFFFFFF),
        surfaceRaised: Color(hex: 0xFFFFFF),
        border: Color(hex: 0xD5D5E0),
        borderSoft: Color(hex: 0xE4E4EC),
        text1: Color(hex: 0x17171F),
        text2: Color(hex: 0x3F3F52),
        text3: Color(hex: 0x55556B),
        text4: Color(hex: 0x67677D),
        violet: Color(hex: 0x7C3AED),
        green: Color(hex: 0x0D805B),
        gold: Color(hex: 0x9C5F08),
        track: Color(hex: 0xE2E2EA),
        trackLine: Color(hex: 0x7A7A8E)
    )

    /// Köprüden gelen çözülmüş tema adı — "system" ASLA gelmez, gelirse koyu.
    static func named(_ name: String?) -> WidgetTheme {
        name == "light" ? .light : .dark
    }
}
