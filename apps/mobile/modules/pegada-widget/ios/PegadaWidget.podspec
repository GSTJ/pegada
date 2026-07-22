Pod::Spec.new do |s|
  s.name           = 'PegadaWidget'
  s.version        = '1.0.0'
  s.summary        = 'Bridges the matches snapshot from JS to the Pegada home-screen widget.'
  s.description    = 'Writes a JSON snapshot into the shared App Group UserDefaults and reloads the WidgetKit timelines.'
  s.author         = 'Pegada'
  s.homepage       = 'https://pegada.app'
  s.license        = 'MIT'
  s.platforms      = {
    :ios => '15.1'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
