# frozen_string_literal: true
#
# ExamBroWidget target'ını ve sürüm senkron altyapısını PROGRAMATİK kurar.
#   ruby tools/ios-setup/add-widget-target.rb
#
# NEDEN xcodeproj GEM'İ, ham pbxproj düzenlemesi DEĞİL:
# project.pbxproj, 24 haneli hex UUID'lerle birbirine referans veren bir nesne
# grafiği (OpenStep plist). Tek bir native target eklemek ~12 nesne yaratmayı ve
# hepsini tutarlı bağlamayı gerektiriyor: PBXNativeTarget, XCConfigurationList,
# 2× XCBuildConfiguration, Sources/Frameworks/Resources phase'leri, ürün için
# PBXFileReference, PBXGroup, her dosya için PBXBuildFile, PBXContainerItemProxy
# + PBXTargetDependency, ve PBXCopyFilesBuildPhase. Bunları elle üretmek hem
# UUID çakışması riski taşır hem de diff'i okunamaz yapar. xcodeproj, CocoaPods
# ve fastlane'in kullandığı kütüphane — dosyayı deterministik yazıyor, yani
# diff gözden geçirilebilir kalıyor.
#
# Betik TEKRAR ÇALIŞTIRILABİLİR (idempotent): var olan nesneleri bulup günceller.

require 'xcodeproj'

ROOT       = File.expand_path('../..', __dir__)
PROJ_PATH  = File.join(ROOT, 'ios/App/App.xcodeproj')
WIDGET     = 'ExamBroWidget'
BUNDLE_ID  = 'com.exambroapp.sinav.ExamBroWidget'
DEPLOYMENT = '15.0'
SWIFT_VER  = '5.0'
TEAM       = '8643ZVLPJ5'
GUARD      = %(if [ -f "$SRCROOT/Scripts/check-version-sync.sh" ]; then\n) +
             %(  "$SRCROOT/Scripts/check-version-sync.sh"\n) +
             %(else\n  echo "error: Scripts/check-version-sync.sh bulunamadı"; exit 1\nfi\n)

project = Xcodeproj::Project.open(PROJ_PATH)
app = project.targets.find { |t| t.name == 'App' } or abort('HATA: App target bulunamadı')
log = ->(msg) { puts "  #{msg}" }

# ── 1. Version.xcconfig dosya referansı + PROJE seviyesinde base configuration ──
#
# Neden proje seviyesi: App target'ın Debug slotu Capacitor'ın debug.xcconfig'i
# tarafından DOLU (CAPACITOR_DEBUG). Base configuration slotu hedef+config başına
# TEK. debug.xcconfig'i değiştirmek `npx cap sync` tarafından ezilebilir.
# Xcode'un çözüm sırası: proje xcconfig → proje ayarı → target xcconfig → target ayarı.
# debug.xcconfig sürüm anahtarlarını TANIMLAMADIĞI için, proje seviyesine konan
# Version.xcconfig App target'a da sızar. (Bu varsayım betikten sonra
# `xcodebuild -showBuildSettings` ile GERÇEKTEN doğrulanıyor.)
puts '1) Version.xcconfig → proje base configuration'
# ⚠️ YOL: main group `ios/App`'e çözülüyor (debug.xcconfig referansı
# `../debug.xcconfig` olduğu için). Dosya ios/App/Version.xcconfig'te, yani
# referans "Version.xcconfig" olmalı — "App/Version.xcconfig" DEĞİL.
# Yanlış yol verildiğinde xcodebuild HATA VERMEZ, xcconfig'i sessizce yok sayar
# (yaşandı: XB_VERSION_SOURCE boş geldi, sürümler kayboldu).
xcconfig_ref = project.main_group.files.find { |f| f.display_name == 'Version.xcconfig' } ||
               project.main_group.new_reference('Version.xcconfig')
xcconfig_ref.path = 'Version.xcconfig'
xcconfig_ref.source_tree = '<group>'
xcconfig_ref.name = nil
project.build_configurations.each do |cfg|
  cfg.base_configuration_reference = xcconfig_ref
  log.call("proje/#{cfg.name} ← Version.xcconfig")
end

# ── 2. App target'taki LİTERAL sürümleri sil (xcconfig'i ezerlerdi) ──
puts '2) App target: literal sürüm ayarlarını sil'
app.build_configurations.each do |cfg|
  %w[MARKETING_VERSION CURRENT_PROJECT_VERSION].each do |key|
    next unless cfg.build_settings.key?(key)
    log.call("App/#{cfg.name}: #{key} = #{cfg.build_settings[key]} → silindi")
    cfg.build_settings.delete(key)
  end
end

# ── 3. Widget grubu + target ──
puts "3) #{WIDGET} target"
widget = project.targets.find { |t| t.name == WIDGET }
group  = project.main_group.groups.find { |g| g.display_name == WIDGET } ||
         project.main_group.new_group(WIDGET, WIDGET)
if widget.nil?
  widget = project.new_target(:app_extension, WIDGET, :ios, DEPLOYMENT, group, :swift)
  log.call('target oluşturuldu (com.apple.product-type.app-extension)')
else
  log.call('target zaten var — ayarları güncelleniyor')
end

# ── 4. Widget build ayarları ──
puts '4) widget build ayarları'
widget.build_configurations.each do |cfg|
  cfg.base_configuration_reference = xcconfig_ref
  cfg.build_settings.merge!(
    'PRODUCT_BUNDLE_IDENTIFIER'      => BUNDLE_ID,
    'PRODUCT_NAME'                   => '$(TARGET_NAME)',
    'INFOPLIST_FILE'                 => "#{WIDGET}/Info.plist",
    'GENERATE_INFOPLIST_FILE'        => 'NO',
    'CODE_SIGN_ENTITLEMENTS'         => "#{WIDGET}/#{WIDGET}.entitlements",
    'CODE_SIGN_STYLE'                => 'Automatic',
    'DEVELOPMENT_TEAM'               => TEAM,
    'IPHONEOS_DEPLOYMENT_TARGET'     => DEPLOYMENT,
    'SWIFT_VERSION'                  => SWIFT_VER,
    'TARGETED_DEVICE_FAMILY'         => '1',
    'APPLICATION_EXTENSION_API_ONLY' => 'YES',
    'SKIP_INSTALL'                   => 'YES',
    'LD_RUNPATH_SEARCH_PATHS'        => '$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks'
  )
  # Sürüm ASLA target'ta literal olmamalı — kaynağı Version.xcconfig.
  cfg.build_settings.delete('MARKETING_VERSION')
  cfg.build_settings.delete('CURRENT_PROJECT_VERSION')
end
log.call("bundle id #{BUNDLE_ID}, deployment #{DEPLOYMENT}, ext-API-only")

# ── 5. Kaynak dosyaları doğru target'a bağla ──
puts '5) dosya → target bağlantıları'
def ensure_file(project, group, rel_name, target)
  ref = group.files.find { |f| f.display_name == rel_name } || group.new_reference(rel_name)
  unless target.source_build_phase.files_references.include?(ref)
    target.source_build_phase.add_file_reference(ref)
  end
  ref
end

%w[ExamBroWidgetBundle.swift WidgetViews.swift ExamCountdown.swift
   SharedStore.swift WidgetTheme.swift WidgetCompat.swift].each do |f|
  ensure_file(project, group, f, widget)
  log.call("#{WIDGET} ← #{f}")
end
# Info.plist / entitlements SADECE referans — build phase'e girmemeli.
%w[Info.plist ExamBroWidget.entitlements].each do |f|
  group.files.find { |x| x.display_name == f } || group.new_reference(f)
end

# WidgetBridge.swift ANA UYGULAMAYA (widget'a değil).
app_group_node = project.main_group.groups.find { |g| g.display_name == 'App' }
%w[WidgetBridge.swift MainViewController.swift].each do |f|
  ensure_file(project, app_group_node, f, app)
  log.call("App ← #{f}")
end
app_group_node.files.find { |f| f.display_name == 'App.entitlements' } ||
  app_group_node.new_reference('App.entitlements')

# ── 6. App target entitlements ──
puts '6) App target entitlements'
app.build_configurations.each do |cfg|
  cfg.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements'
end
log.call('CODE_SIGN_ENTITLEMENTS = App/App.entitlements')

# ── 7. Extension'ı uygulamaya göm + bağımlılık ──
puts '7) extension gömme + target bağımlılığı'
unless app.dependencies.any? { |d| d.target == widget }
  app.add_dependency(widget)
  log.call('App → ExamBroWidget bağımlılığı')
end
embed = app.copy_files_build_phases.find { |ph| ph.symbol_dst_subfolder_spec == :plug_ins } ||
        app.new_copy_files_build_phase('Embed Foundation Extensions')
embed.symbol_dst_subfolder_spec = :plug_ins
embed.dst_path = ''
unless embed.files_references.include?(widget.product_reference)
  bf = embed.add_file_reference(widget.product_reference)
  bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  log.call('Embed Foundation Extensions ← ExamBroWidget.appex')
end

# ── 8. Sürüm guard'ı — HER İKİ target'ta ──
puts '8) sürüm senkron guard Run Script phase'
[app, widget].each do |t|
  name = 'Sürüm senkronu (check-version-sync.sh)'
  ph = t.shell_script_build_phases.find { |p| p.name == name } ||
       t.new_shell_script_build_phase(name)
  ph.shell_path = '/bin/sh'
  ph.shell_script = GUARD
  # "Based on dependency analysis" KAPALI → her build'de koşsun.
  ph.always_out_of_date = '1'
  # En başa al: sürüm bozuksa uzun derlemeyi beklemeden dursun.
  t.build_phases.delete(ph)
  t.build_phases.unshift(ph)
  log.call("#{t.name} ← guard (ilk phase)")
end

project.save
puts "\n✓ #{PROJ_PATH} kaydedildi"
