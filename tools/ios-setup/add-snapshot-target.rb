# frozen_string_literal: true
#
# Widget snapshot test target'ını kurar (idempotent).
#   ruby tools/ios-setup/add-snapshot-target.rb
#
# Neden ayrı target: widget extension'ın kendisi test edilemiyor (@main'li bir
# app-extension'a XCTest bağlanmıyor). Onun yerine widget'ın View'larını
# DERLEYEN bir logic-test target'ı kurulup ImageRenderer ile PNG'ye basılıyor.
# ExamBroWidgetBundle.swift BİLEREK dışarıda: @main test target'ında çakışır.

require 'xcodeproj'
require 'fileutils'

ROOT      = File.expand_path('../..', __dir__)
PROJ_PATH = File.join(ROOT, 'ios/App/App.xcodeproj')
NAME      = 'ExamBroWidgetSnapshots'
TEAM      = '8643ZVLPJ5'

project = Xcodeproj::Project.open(PROJ_PATH)
widget_group = project.main_group.groups.find { |g| g.display_name == 'ExamBroWidget' }
abort('HATA: ExamBroWidget grubu yok — önce add-widget-target.rb') unless widget_group

target = project.targets.find { |t| t.name == NAME }
group  = project.main_group.groups.find { |g| g.display_name == NAME } ||
         project.main_group.new_group(NAME, NAME)

if target.nil?
  target = project.new_target(:unit_test_bundle, NAME, :ios, '16.0', group, :swift)
  puts "target oluşturuldu: #{NAME}"
else
  puts "target zaten var: #{NAME}"
end

target.build_configurations.each do |cfg|
  cfg.build_settings.merge!(
    # PRODUCT_NAME şart: boş kalırsa ürün ".xctest" adıyla üretiliyor ve
    # xcodebuild "Multiple commands produce .../.xctest" diye patlıyor.
    'PRODUCT_NAME'               => '$(TARGET_NAME)',
    'PRODUCT_BUNDLE_IDENTIFIER'  => "com.exambroapp.sinav.#{NAME}",
    'IPHONEOS_DEPLOYMENT_TARGET' => '16.0',   # ImageRenderer iOS 16+
    'SWIFT_VERSION'              => '5.0',
    'TARGETED_DEVICE_FAMILY'     => '1',
    'DEVELOPMENT_TEAM'           => TEAM,
    'CODE_SIGN_STYLE'            => 'Automatic',
    'GENERATE_INFOPLIST_FILE'    => 'YES'
  )
  # Host uygulaması YOK (logic test) — daha hızlı ve imzalama gerektirmiyor.
  cfg.build_settings.delete('TEST_HOST')
  cfg.build_settings.delete('BUNDLE_LOADER')
end

# Test dosyası + widget'ın View kaynakları (bundle HARİÇ — @main çakışır).
def add(project, group, name, target)
  ref = group.files.find { |f| f.display_name == name } || group.new_reference(name)
  target.source_build_phase.add_file_reference(ref) unless
    target.source_build_phase.files_references.include?(ref)
end

add(project, group, 'SnapshotTests.swift', target)
%w[WidgetViews.swift ExamCountdown.swift SharedStore.swift
   WidgetTheme.swift WidgetCompat.swift].each do |f|
  ref = widget_group.files.find { |x| x.display_name == f }
  abort("HATA: #{f} referansı yok") unless ref
  target.source_build_phase.add_file_reference(ref) unless
    target.source_build_phase.files_references.include?(ref)
end
puts 'kaynaklar bağlandı (ExamBroWidgetBundle.swift hariç — @main)'

# xcodebuild'in çalıştırabilmesi için PAYLAŞILAN şema.
scheme_dir = File.join(PROJ_PATH, 'xcshareddata', 'xcschemes')
FileUtils.mkdir_p(scheme_dir)
scheme = Xcodeproj::XCScheme.new
scheme.add_test_target(target)
scheme.save_as(PROJ_PATH, NAME, true)
puts "paylaşılan şema: #{NAME}"

project.save
puts "✓ #{PROJ_PATH} kaydedildi"
