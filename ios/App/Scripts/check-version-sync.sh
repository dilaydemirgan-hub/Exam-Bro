#!/bin/sh
# ══════════════════════════════════════════════════════════════
#  Sürüm senkron guard'ı — HEM App HEM ExamBroWidget target'ında çalışır.
#
#  App Store, extension'ın CFBundleShortVersionString ve CFBundleVersion
#  değerleri ana uygulamayla birebir aynı değilse yüklemeyi REDDEDER.
#  Tuzak şu: Xcode'un General sekmesinden sürümü değiştirmek target
#  build setting'i yazar ve .xcconfig'i sessizce ezer — iki target ayrışır
#  ve hata ancak App Store Connect yüklemesinde görülür.
#
#  Bu betik üç şeyi doğrular:
#    1. Version.xcconfig gerçekten base configuration olarak bağlı mı
#    2. MARKETING_VERSION target'ta ezilmiş mi
#    3. CURRENT_PROJECT_VERSION target'ta ezilmiş mi
#
#  Her iki target da aynı dosyaya eşit olduğu için birbirlerine de eşit olur.
#
#  Kurulum: target → Build Phases → + → New Run Script Phase.
#  "Based on dependency analysis" işaretini KALDIRIN (her build'de koşsun).
# ══════════════════════════════════════════════════════════════
set -eu

XCCONFIG="${SRCROOT}/Version.xcconfig"

if [ ! -f "$XCCONFIG" ]; then
  echo "error: Version.xcconfig bulunamadı: $XCCONFIG"
  echo "error: Beklenen konum ios/App/Version.xcconfig — dosya taşındıysa bu betiği de güncelleyin."
  exit 1
fi

# `ANAHTAR = değer` satırını oku (yorum ve boşluklara dayanıklı).
read_key() {
  sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*\([^/]*\).*/\1/p" "$XCCONFIG" \
    | head -n1 | sed 's/[[:space:]]*$//'
}

want_source=$(read_key XB_VERSION_SOURCE)
want_mv=$(read_key MARKETING_VERSION)
want_cv=$(read_key CURRENT_PROJECT_VERSION)

fail=0

# 1 — xcconfig hiç bağlanmamış mı?
if [ "${XB_VERSION_SOURCE:-}" != "$want_source" ]; then
  echo "error: [$TARGET_NAME] Version.xcconfig bu target'a BAĞLI DEĞİL."
  echo "error:   Beklenen XB_VERSION_SOURCE='$want_source', gelen='${XB_VERSION_SOURCE:-<boş>}'"
  echo "error:   Düzeltme: PROJECT (App) → Info → Configurations → Debug ve Release altında"
  echo "error:   '$TARGET_NAME' satırını 'Version' olarak ayarlayın."
  fail=1
fi

# 2 — MARKETING_VERSION target'ta ezilmiş mi?
if [ "${MARKETING_VERSION:-}" != "$want_mv" ]; then
  echo "error: [$TARGET_NAME] MARKETING_VERSION ayrışmış."
  echo "error:   Version.xcconfig: '$want_mv'   bu target: '${MARKETING_VERSION:-<boş>}'"
  echo "error:   Sebep neredeyse her zaman: Xcode General sekmesinden 'Version' yazılmış"
  echo "error:   ve target build setting'i .xcconfig'i eziyor."
  echo "error:   Düzeltme: target → Build Settings → 'Marketing Version' ara → satırı seçip"
  echo "error:   Delete'e basın (literal'i sil), sonra sürümü Version.xcconfig'ten değiştirin."
  fail=1
fi

# 3 — CURRENT_PROJECT_VERSION target'ta ezilmiş mi?
if [ "${CURRENT_PROJECT_VERSION:-}" != "$want_cv" ]; then
  echo "error: [$TARGET_NAME] CURRENT_PROJECT_VERSION ayrışmış."
  echo "error:   Version.xcconfig: '$want_cv'   bu target: '${CURRENT_PROJECT_VERSION:-<boş>}'"
  echo "error:   Düzeltme: target → Build Settings → 'Current Project Version' ara → literal'i silin."
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo "error: Sürüm senkronu bozuk — App Store yüklemesi bu hâliyle REDDEDİLİR."
  exit 1
fi

echo "note: [$TARGET_NAME] sürüm senkronu tamam — $want_mv ($want_cv)"
