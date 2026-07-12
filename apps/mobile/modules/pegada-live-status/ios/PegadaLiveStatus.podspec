Pod::Spec.new do |s|
  s.name           = 'PegadaLiveStatus'
  s.version        = '1.0.0'
  s.summary        = 'Live Activity countdown for the daily like limit'
  s.description    = 'Starts/updates/ends the Pegada like-limit Live Activity via ActivityKit'
  s.author         = ''
  s.homepage       = 'https://pegada.app'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
