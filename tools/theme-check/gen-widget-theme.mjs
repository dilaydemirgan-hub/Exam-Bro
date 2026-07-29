// index.css → ios/App/ExamBroWidget/WidgetTheme.swift üreteci.
//
//   node gen-widget-theme.mjs           # üret / güncelle
//   node gen-widget-theme.mjs --check   # üretilmiş dosya güncel mi (çıkış 1 = bayat)
//
// NEDEN: palet değerlerini Swift'e ELLE yazmak, index.css değişince widget'ın
// sessizce ayrışması demek. Bu betik tek kaynağı (index.css) Swift'e çeviriyor;
// --check modu da commit'lenmiş dosyanın bayatlamadığını doğruluyor
// (src/ink.test.mjs'in ink sabitleri için yaptığının aynısı).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS_PATH   = resolve(HERE, "../../src/index.css");
const SWIFT_PATH = resolve(HERE, "../../ios/App/ExamBroWidget/WidgetTheme.swift");

// Widget'ın gerçekten kullandığı token'lar. Listeyi DAR tutun: burada olan her
// token widget ile uygulama arasında sözleşme demek.
// [css token, swift adı]
const TOKENS = [
  ["--bg",          "bg"],
  ["--surface-2",   "surface"],
  ["--surface-3",   "surfaceRaised"],
  ["--border",      "border"],
  ["--border-soft", "borderSoft"],
  ["--text-1",      "text1"],
  ["--text-2",      "text2"],
  ["--text-3",      "text3"],
  ["--text-4",      "text4"],
  ["--violet",      "violet"],
  ["--green",       "green"],
  ["--gold",        "gold"],
  ["--track",       "track"],
  ["--track-line",  "trackLine"],
];

const css = readFileSync(CSS_PATH, "utf8");

/** `:root[data-theme="light"] { … }` gövdesini döndürür (dengeli süslü parantez). */
function block(startPattern) {
  const i = css.search(startPattern);
  if (i < 0) throw new Error(`index.css'te blok bulunamadı: ${startPattern}`);
  const open = css.indexOf("{", i);
  let depth = 0;
  for (let j = open; j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}" && --depth === 0) return css.slice(open + 1, j);
  }
  throw new Error(`kapanmayan blok: ${startPattern}`);
}

const darkBody  = block(/:root,\s*\n?\s*:root\[data-theme="dark"\]/);
const lightBody = block(/:root\[data-theme="light"\]/);

/** Bloktan token değerini çeker; yorumları atlar. */
function tokenOf(body, name) {
  const m = body.match(new RegExp(`(^|[;{\\n])\\s*${name}\\s*:\\s*([^;]+);`));
  return m ? m[2].replace(/\/\*[\s\S]*?\*\//g, "").trim() : null;
}

/** "#080810" → 0x080810 · "transparent" → null (Color.clear) */
function toSwiftColor(raw, token, theme) {
  if (raw === "transparent") return "Color.clear";
  let h = raw.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(h)) h = "#" + [...h.slice(1)].map(c => c + c).join("");
  if (!/^#[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(
      `${theme} modunda ${token} düz hex değil: "${raw}". ` +
      `Widget paletine yalnızca düz hex token'lar girebilir — ` +
      `TOKENS listesinden çıkarın ya da index.css'te hex'e çevirin.`);
  }
  return `Color(hex: 0x${h.slice(1).toUpperCase()})`;
}

function palette(body, theme) {
  return TOKENS.map(([token, swift]) => {
    const raw = tokenOf(body, token);
    if (raw === null) throw new Error(`${theme} bloğunda ${token} yok (index.css)`);
    return `        ${swift}: ${toSwiftColor(raw, token, theme)}`;
  }).join(",\n");
}

const props = TOKENS.map(([, s]) => `    let ${s}: Color`).join("\n");

const out = `//  WidgetTheme.swift
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

/// Widget paleti. Renk seçimi App Group'tan okunan \`theme\` ile yapılır —
/// \`@Environment(\\.colorScheme)\` KULLANILMAZ, kullanıcının uygulama içi
/// seçimi kazanmalı (docs/LIGHT-MODE.md §11).
struct WidgetTheme {
${props}

    static let dark = WidgetTheme(
${palette(darkBody, "dark")}
    )

    static let light = WidgetTheme(
${palette(lightBody, "light")}
    )

    /// Köprüden gelen çözülmüş tema adı — "system" ASLA gelmez, gelirse koyu.
    static func named(_ name: String?) -> WidgetTheme {
        name == "light" ? .light : .dark
    }
}
`;

if (process.argv.includes("--check")) {
  if (!existsSync(SWIFT_PATH)) {
    console.error("✗ WidgetTheme.swift yok — `node gen-widget-theme.mjs` çalıştırın.");
    process.exit(1);
  }
  if (readFileSync(SWIFT_PATH, "utf8") !== out) {
    console.error("✗ WidgetTheme.swift BAYAT — index.css değişmiş.");
    console.error("  Düzeltme: node tools/theme-check/gen-widget-theme.mjs");
    process.exit(1);
  }
  console.log("✓ WidgetTheme.swift güncel (index.css ile eşleşiyor)");
} else {
  mkdirSync(dirname(SWIFT_PATH), { recursive: true });
  writeFileSync(SWIFT_PATH, out);
  console.log(`✓ ${SWIFT_PATH}`);
  console.log(`  ${TOKENS.length} token × 2 tema, kaynak src/index.css`);
}
