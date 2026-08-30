# Changelog

Generated from conventional commits by `.github/scripts/changelog.py`. Run `pnpm changelog` to refresh it.

## v1.6.2 (2026-08-30)

### Fixes

- **mobile:** mark photo grid clamp as worklet ([#174](https://github.com/GSTJ/pegada/pull/174)) ([`b89c975`](https://github.com/GSTJ/pegada/commit/b89c9750401af71ce7d96ec2155b68f19b54cb8f))
- **mobile:** drive photo action rotation from state change ([#173](https://github.com/GSTJ/pegada/pull/173)) ([`cf8c7d9`](https://github.com/GSTJ/pegada/commit/cf8c7d975ca15ea0b13f5af42f5121eba42ea04f))
- **mobile:** restore gestures after every photo drag ([#172](https://github.com/GSTJ/pegada/pull/172)) ([`9bf8679`](https://github.com/GSTJ/pegada/commit/9bf8679d5552818efd5c106f020f9faad4922ca0))
- **mobile:** drive slider press spring from gesture ([#171](https://github.com/GSTJ/pegada/pull/171)) ([`f64051f`](https://github.com/GSTJ/pegada/commit/f64051f9daf29b5aab8a69e1fda65a0b1c18cea5))
- **mobile:** keep slider labels inside screen edges ([#170](https://github.com/GSTJ/pegada/pull/170)) ([`f42c48e`](https://github.com/GSTJ/pegada/commit/f42c48e8d87920485c4b98689e528ef22254db60))
- **mobile:** clear unlimited preference limits ([#169](https://github.com/GSTJ/pegada/pull/169)) ([`190c264`](https://github.com/GSTJ/pegada/commit/190c264cf61645fd98d7a2f5fb4160d30d75cc1d))
- **mobile:** Android splash follows in-app theme on boot ([#163](https://github.com/GSTJ/pegada/pull/163)) ([`3e3a6cd`](https://github.com/GSTJ/pegada/commit/3e3a6cd33c12ad773e89ed025f6a0f7fdbabf7bd))
- **mobile:** drop Siri shortcuts and Control Center ([#164](https://github.com/GSTJ/pegada/pull/164)) ([`5a07447`](https://github.com/GSTJ/pegada/commit/5a074476608c58d5fde456e3a4b9f9e4ae2eda45))
- **mobile:** stop DraggableGrid crash and stale reorders in photo grid ([#168](https://github.com/GSTJ/pegada/pull/168)) ([`58e396b`](https://github.com/GSTJ/pegada/commit/58e396bc77448aef3fafd0ae8f1a64ddcd67192c))
- **mobile:** Automatic follows system dark on iOS ([#166](https://github.com/GSTJ/pegada/pull/166)) ([`247cfa1`](https://github.com/GSTJ/pegada/commit/247cfa1cd8874797b93b4dab5cb54c451fa6212f))
- **mobile:** slider value bubbles below the track, thumbs reach the ends ([#167](https://github.com/GSTJ/pegada/pull/167)) ([`85f77ae`](https://github.com/GSTJ/pegada/commit/85f77ae76d3e45643e1db99fc4b47a76bbfedc03))
- **mobile:** snap swipe cards back faster when the drag is short ([#165](https://github.com/GSTJ/pegada/pull/165)) ([`cd979fc`](https://github.com/GSTJ/pegada/commit/cd979fc5cd6e86b2e769caa05bb2224c92d756d2))

### Tests

- **mobile:** the grand journey, two accounts to a live match, recorded and DB-proven on both platforms ([#154](https://github.com/GSTJ/pegada/pull/154)) ([`12b5ff1`](https://github.com/GSTJ/pegada/commit/12b5ff180f468bc5394c25992408d79b76e646bb))

[Full diff](https://github.com/GSTJ/pegada/compare/v1.6.1...v1.6.2)

## v1.6.1 (2026-08-29)

### Features

- **mobile:** add bidirectional dog profile hero transition ([#158](https://github.com/GSTJ/pegada/pull/158)) ([`eed957d`](https://github.com/GSTJ/pegada/commit/eed957d3dc264b4dc8f1eaaed75e82b1634b4e63))
- **mobile:** like-limit Live Activity, Siri shortcuts and a Control Center button ([#157](https://github.com/GSTJ/pegada/pull/157)) ([`d3fbd25`](https://github.com/GSTJ/pegada/commit/d3fbd256ee754ea82ee6f96702bad965e2857cd4))

### Fixes

- survive the cold-start login path and keep production warm ([#151](https://github.com/GSTJ/pegada/pull/151)) ([`d416c15`](https://github.com/GSTJ/pegada/commit/d416c1515e55ec7ac6f139fc6b9d520bf8c1f065))
- **mobile:** magic-modal bottom sheets, stop drag gestures popping the screen ([#156](https://github.com/GSTJ/pegada/pull/156)) ([`d23f938`](https://github.com/GSTJ/pegada/commit/d23f93851aae8075e86324b3d1337234a7191ccc))
- **mobile:** apply Automatic theme live, no restart needed ([#159](https://github.com/GSTJ/pegada/pull/159)) ([`09ae20a`](https://github.com/GSTJ/pegada/commit/09ae20ad8c0528cfe426762cbabeecb1d91bf5be))
- **mobile:** stop unistyles committing shadow updates for freed nodes ([#155](https://github.com/GSTJ/pegada/pull/155)) ([`5633e71`](https://github.com/GSTJ/pegada/commit/5633e7195053e8796b1f618828d16b5e2bd06d94))
- **mobile:** chat opens at the latest message, keyboard keeps your place, carousel edge bounce stops going black ([#152](https://github.com/GSTJ/pegada/pull/152)) ([`b20e902`](https://github.com/GSTJ/pegada/commit/b20e9026f44ab89b184cf2fca10c02a68af13f4b))

### Performance

- **mobile,web,db:** measured size, startup and polish pass ([#153](https://github.com/GSTJ/pegada/pull/153)) ([`70f8a3a`](https://github.com/GSTJ/pegada/commit/70f8a3a26fcaa5255d530c587d2941f20e2a4187))

### Other

- **mobile:** Slider and photo reorder on gesture-handler, kill swipe-back races ([#160](https://github.com/GSTJ/pegada/pull/160)) ([`fb27b15`](https://github.com/GSTJ/pegada/commit/fb27b15a63363639044789373bacdceb0391a1c3))

[Full diff](https://github.com/GSTJ/pegada/compare/v1.6.0...v1.6.1)

## v1.6.0 (2026-08-27)

### Fixes

- **mobile:** keyboard handling and every bug the migration QA found ([#149](https://github.com/GSTJ/pegada/pull/149)) ([`1c5d682`](https://github.com/GSTJ/pegada/commit/1c5d682f10bb10b2a46d4eb358642fa68611b770))

### Refactors

- **mobile:** drop styled-components now that unistyles owns styling ([#148](https://github.com/GSTJ/pegada/pull/148)) ([`7cbf73e`](https://github.com/GSTJ/pegada/commit/7cbf73e6c421a3ee2083a5df21116edc85737d04))
- **mobile:** migrate styling from styled-components to unistyles ([#145](https://github.com/GSTJ/pegada/pull/145)) ([`3cce8b3`](https://github.com/GSTJ/pegada/commit/3cce8b30d6a14759fe78c3cca61b9bc2609b2b64))

[Full diff](https://github.com/GSTJ/pegada/compare/v1.5.1...v1.6.0)

## v1.5.1 (2026-08-26)

### Fixes

- **mobile:** support Google Play Billing Library 8 ([#146](https://github.com/GSTJ/pegada/pull/146)) ([`4441cc4`](https://github.com/GSTJ/pegada/commit/4441cc458587984fa11ea89ac916dc82885ec5e6))

[Full diff](https://github.com/GSTJ/pegada/compare/v1.5.0...v1.5.1)

## v1.5.0 (2026-08-10)

### Breaking changes

- **security:** harden sessions, images and dependencies ([#143](https://github.com/GSTJ/pegada/pull/143)) ([`4198189`](https://github.com/GSTJ/pegada/commit/41981894398313f4231828586de1ea25d6aa1dbc))
  Access tokens older than 30 days are rejected. Existing users with older sessions will need to sign in again.

### Fixes

- **mobile:** publish changed runtime inputs ([#141](https://github.com/GSTJ/pegada/pull/141)) ([`33fa8a5`](https://github.com/GSTJ/pegada/commit/33fa8a5eccf89a262a51c98dc41651d1da86c572))
- **release:** keep changelog inside release tags ([#139](https://github.com/GSTJ/pegada/pull/139)) ([`ebb33d3`](https://github.com/GSTJ/pegada/commit/ebb33d3717d8326b6a2fb69620de41041e20a5af))

### Dependencies

- bump brace-expansion to 5.0.9 ([#140](https://github.com/GSTJ/pegada/pull/140)) ([`cfb9c07`](https://github.com/GSTJ/pegada/commit/cfb9c0753d66c6a9b5357f4ed9d0731382df624f))

### Chores

- **deps:** enforce a 14-day package age ([#142](https://github.com/GSTJ/pegada/pull/142)) ([`344ac00`](https://github.com/GSTJ/pegada/commit/344ac002a1435dc5ee8ae475ba4182edb18c1893))

[Full diff](https://github.com/GSTJ/pegada/compare/v1.5.0-rc5...v1.5.0)

## v1.5.0-rc5 (2026-08-03)

### Fixes

- **release:** preserve the full annotated tag message ([#137](https://github.com/GSTJ/pegada/pull/137)) ([`643f807`](https://github.com/GSTJ/pegada/commit/643f80761ce7edd1a7657ba22bac68d73276448c))

[Full diff](https://github.com/GSTJ/pegada/compare/v1.5.0-rc4...v1.5.0-rc5)

## v1.5.0-rc4 (2026-08-03)

### Fixes

- **release:** preserve changelog headings in tag notes ([#136](https://github.com/GSTJ/pegada/pull/136)) ([`a869028`](https://github.com/GSTJ/pegada/commit/a869028b38a69e5fb8ecbf6a21c68d347548c0e1))

[Full diff](https://github.com/GSTJ/pegada/compare/v1.5.0-rc3...v1.5.0-rc4)

## v1.5.0-rc3 (2026-08-03)

### Fixes

- **mobile:** harden PostHog release uploads ([#135](https://github.com/GSTJ/pegada/pull/135)) ([`a201ab5`](https://github.com/GSTJ/pegada/commit/a201ab59ba31bf7d792dc564c3ed918a1807833b))
- **release:** keep tag and release compare links aligned ([#134](https://github.com/GSTJ/pegada/pull/134)) ([`d6ca029`](https://github.com/GSTJ/pegada/commit/d6ca0298acb4083d4726cf3c462441605a6aa513))

[Full diff](https://github.com/GSTJ/pegada/compare/v1.5.0-rc2...v1.5.0-rc3)

## v1.5.0-rc2 (2026-08-03)

### Features

- **mobile:** restore themed app icons ([#128](https://github.com/GSTJ/pegada/pull/128)) ([`b40436b`](https://github.com/GSTJ/pegada/commit/b40436b3b092e904b82d3612c6be054b04c78e8e))
- **mobile:** restore home-screen quick actions ([#127](https://github.com/GSTJ/pegada/pull/127)) ([`34cd604`](https://github.com/GSTJ/pegada/commit/34cd604e53b8a42e85789794cf7baf5f0f0c980d))
- **web:** show the app below the landing walkthrough ([#123](https://github.com/GSTJ/pegada/pull/123)) ([`494ade2`](https://github.com/GSTJ/pegada/commit/494ade270440f227d43baa8c2a5206b64cce75bd))
- **web:** explain the product below the landing hero ([#122](https://github.com/GSTJ/pegada/pull/122)) ([`5f97950`](https://github.com/GSTJ/pegada/commit/5f97950e127fc1298e80b09148813d501b5315a4))
- **web:** align the landing copy with the brand banner ([#121](https://github.com/GSTJ/pegada/pull/121)) ([`011b22d`](https://github.com/GSTJ/pegada/commit/011b22d49691659f32a4a73d24859e506e8197bf))
- **web:** show four real app screens below how-it-works ([#117](https://github.com/GSTJ/pegada/pull/117)) ([`2247681`](https://github.com/GSTJ/pegada/commit/22476817a61380c7ea3bf39ab619c2e91ed1aa8a))
- **web:** add features and how-it-works sections below the fold ([#116](https://github.com/GSTJ/pegada/pull/116)) ([`715c93d`](https://github.com/GSTJ/pegada/commit/715c93d32d328b08df9c9659c5b0b1e32d3e774c))
- **web:** align the landing copy with the brand banner ([#115](https://github.com/GSTJ/pegada/pull/115)) ([`740bc49`](https://github.com/GSTJ/pegada/commit/740bc49cc006c80355d85fd1558c989dec80efaf))
- **web:** canonical, hreflang and a real social card for the site ([#113](https://github.com/GSTJ/pegada/pull/113)) ([`8e71a7a`](https://github.com/GSTJ/pegada/commit/8e71a7a729c73c886259e0353d3a08273bd524a4))
- **observability:** route PostHog through magic-observability and unblock OTA sourcemaps ([#111](https://github.com/GSTJ/pegada/pull/111)) ([`19b8d55`](https://github.com/GSTJ/pegada/commit/19b8d551e9306b2afaa6faef074c6163606688d6))

### Fixes

- **api:** harden image ownership and request boundaries ([#133](https://github.com/GSTJ/pegada/pull/133)) ([`c8d75ba`](https://github.com/GSTJ/pegada/commit/c8d75bab90a0e3833675e0bfab8e469084d34732))
- **ci:** limit workflow token permissions ([#132](https://github.com/GSTJ/pegada/pull/132)) ([`af4a6af`](https://github.com/GSTJ/pegada/commit/af4a6afbcb5552efab591714874b2bef47669c1b))
- **auth:** consume one-time codes after login ([#118](https://github.com/GSTJ/pegada/pull/118)) ([`38eb8d8`](https://github.com/GSTJ/pegada/commit/38eb8d83ad8b4020497e2c9f8fa635374444d4db))
- **nextjs:** serve real robots.txt and sitemap.xml ([#112](https://github.com/GSTJ/pegada/pull/112)) ([`fb936e6`](https://github.com/GSTJ/pegada/commit/fb936e68c8adec84bf265e3f3842756861201838))
- **mobile:** give the widget and notification-service targets a team id ([#109](https://github.com/GSTJ/pegada/pull/109)) ([`2777a62`](https://github.com/GSTJ/pegada/commit/2777a62f9d92e05d1c25322d4b85041212587067))

### Performance

- **web:** serve the hero through next/image and right-size the icons ([#120](https://github.com/GSTJ/pegada/pull/120)) ([`793c277`](https://github.com/GSTJ/pegada/commit/793c277e942befcb03f800d45f15445c12a93967))
- **web:** serve the hero through next/image and right-size the icons ([#114](https://github.com/GSTJ/pegada/pull/114)) ([`1c12f1a`](https://github.com/GSTJ/pegada/commit/1c12f1a16eaeef8b6a9e1ce872afc9f38b13e8d6))

### Reverts

- **mobile:** back out the native feature drop for a visual review ([#124](https://github.com/GSTJ/pegada/pull/124)) ([`3f0d6ae`](https://github.com/GSTJ/pegada/commit/3f0d6ae82820aaa6a0e5da670e47c7ec0edd8e9d))
- **web:** back out the landing changes merged without review ([#119](https://github.com/GSTJ/pegada/pull/119)) ([`12cd457`](https://github.com/GSTJ/pegada/commit/12cd45723c2b6c15b99fd51395c2655d7f4904cc))

### Build and CI

- **e2e:** give the iOS build room to finish a cold build ([#106](https://github.com/GSTJ/pegada/pull/106)) ([`b251dfa`](https://github.com/GSTJ/pegada/commit/b251dfaa3c30d410eec16b5c69f229c6dc9b9296))
- adopt the magic oxlint/oxfmt/tsconfig stack ([#105](https://github.com/GSTJ/pegada/pull/105)) ([`1960e32`](https://github.com/GSTJ/pegada/commit/1960e3282fe7ed0d6bcf10bc3322b0f7c5c1e6c6))
- stop the release job pushing the changelog to main ([#103](https://github.com/GSTJ/pegada/pull/103)) ([`cec0cd2`](https://github.com/GSTJ/pegada/commit/cec0cd229b987027a0008c11e113c0185f3ff196))

### Chores

- **tooling:** track magic by tag and ban hand-built className ([#110](https://github.com/GSTJ/pegada/pull/110)) ([`84225fa`](https://github.com/GSTJ/pegada/commit/84225fa089627337fcfe65d46de8d888bffaac61))
- **deps:** let renovate own the github-actions bumps ([#108](https://github.com/GSTJ/pegada/pull/108)) ([`4ef266b`](https://github.com/GSTJ/pegada/commit/4ef266bf66bb7d019a654c4f2e4afaf096b21b3d))

[Full diff](https://github.com/GSTJ/pegada/compare/v1.5.0-rc1...v1.5.0-rc2)

## v1.5.0-rc1 (2026-07-26)

### Features

- reply to chat messages straight from the notification ([#75](https://github.com/GSTJ/pegada/pull/75)) ([`69d0d85`](https://github.com/GSTJ/pegada/commit/69d0d858a837feaee4b46e2ccc2de2cf071112ba))
- **mobile:** home-screen quick actions ([#76](https://github.com/GSTJ/pegada/pull/76)) ([`64210c9`](https://github.com/GSTJ/pegada/commit/64210c9452cdd146b171c459d1b74d841c83d66d))
- **mobile:** dark iOS icon variant and Android themed icon ([#77](https://github.com/GSTJ/pegada/pull/77)) ([`7721cb0`](https://github.com/GSTJ/pegada/commit/7721cb0f0af6426bcd7419c7743e69a7a342e736))
- home-screen widgets with matches waiting for a reply (WidgetKit + Glance) ([#83](https://github.com/GSTJ/pegada/pull/83)) ([`b375c66`](https://github.com/GSTJ/pegada/commit/b375c66d65443bc7f8c6b2bf8a66e4e93b9578ec))
- **mobile:** add Liquid Glass to translucent overlays ([#78](https://github.com/GSTJ/pegada/pull/78)) ([`49fbcb3`](https://github.com/GSTJ/pegada/commit/49fbcb3778d0d545de60f944c6d868db83c46722))
- **mobile:** haptic feedback across swipe, match and purchase flows ([#74](https://github.com/GSTJ/pegada/pull/74)) ([`8b43721`](https://github.com/GSTJ/pegada/commit/8b43721a319c00e4b91b685f37f5759efd3b59d1))
- **legal:** add child-safety (CSAE) clause to Terms of Use ([#73](https://github.com/GSTJ/pegada/pull/73)) ([`56ccd98`](https://github.com/GSTJ/pegada/commit/56ccd98857c6f60542ec46e13a13a2be567db0bb))
- **mobile:** 1.4.0 release, GHA build pipeline, PostHog OTA env ([#63](https://github.com/GSTJ/pegada/pull/63)) ([`06149a2`](https://github.com/GSTJ/pegada/commit/06149a2f1e7c3df106ba3cadeb738eb64b594865))

### Fixes

- **mobile:** forward image props to Expo Image ([#86](https://github.com/GSTJ/pegada/pull/86)) ([`1a7ec86`](https://github.com/GSTJ/pegada/commit/1a7ec869f4d990adb1908c4bf16705dd51936e52))
- **mobile:** sort a copy of the matches cache, triage lint warnings ([#98](https://github.com/GSTJ/pegada/pull/98)) ([`bcd5b44`](https://github.com/GSTJ/pegada/commit/bcd5b44918f37a1a786be0802522e324e790b717))
- **database:** add the missing Image status and blurhash migration ([#97](https://github.com/GSTJ/pegada/pull/97)) ([`779ce65`](https://github.com/GSTJ/pegada/commit/779ce65a0d4f25f5498693c0bf016953d87430ac))
- **api:** scope the image move to the temporary upload folder ([#96](https://github.com/GSTJ/pegada/pull/96)) ([`652d6d2`](https://github.com/GSTJ/pegada/commit/652d6d29dd1f2365fe264e7fb3e648add89f160d))
- **api:** validate image URLs against the configured storage origins ([#94](https://github.com/GSTJ/pegada/pull/94)) ([`d3fc3cb`](https://github.com/GSTJ/pegada/commit/d3fc3cb48e3ae5709ce47b2337001e55398f008f))
- **api:** pass message delete ids in the right order ([#93](https://github.com/GSTJ/pegada/pull/93)) ([`b0f996e`](https://github.com/GSTJ/pegada/commit/b0f996e06d14d40ffac269bc83c9fb9c95e76bd6))
- **mobile:** dark mode error screen readability and splash flash ([#85](https://github.com/GSTJ/pegada/pull/85)) ([`cb9ced5`](https://github.com/GSTJ/pegada/commit/cb9ced5daa0bc8801492fc7895e939bd72f60dfc))
- **mobile:** key rich-text translation components ([#87](https://github.com/GSTJ/pegada/pull/87)) ([`e8e41a1`](https://github.com/GSTJ/pegada/commit/e8e41a1728b6c2f58f117f63638c38cf352f6cde))
- **mobile:** size language/theme picker sheets to their content ([#72](https://github.com/GSTJ/pegada/pull/72)) ([`5070de7`](https://github.com/GSTJ/pegada/commit/5070de7cb02cc62c1681d7641873e6a63f86ea69))
- **mobile:** stop the age-range slider triggering back navigation on iOS ([#71](https://github.com/GSTJ/pegada/pull/71)) ([`155a068`](https://github.com/GSTJ/pegada/commit/155a068335a90268ae1d3f9eefc2a9ee018fb64d))
- **mobile:** guard Appearance.setColorScheme against null theme ([#70](https://github.com/GSTJ/pegada/pull/70)) ([`ff0e512`](https://github.com/GSTJ/pegada/commit/ff0e51269d871b8fc4ea5350ba9dc859668c194b))
- **mobile:** stop the first request dying on the apex→www redirect ([#68](https://github.com/GSTJ/pegada/pull/68)) ([`170acff`](https://github.com/GSTJ/pegada/commit/170acffb96d465f6254595451207d29686e720c6))

### Performance

- **ci:** drop redundant Maestro driver warm-up from iOS PR gate ([#69](https://github.com/GSTJ/pegada/pull/69)) ([`144d50a`](https://github.com/GSTJ/pegada/commit/144d50a0a8fbf23bfbafd83adab10560f296516b))

### Dependencies

- force uuid 11 and fast-xml-parser 5, clearing both open advisories ([#100](https://github.com/GSTJ/pegada/pull/100)) ([`aa816ff`](https://github.com/GSTJ/pegada/commit/aa816ff1397695b2d651182482bf2b9d10ebfc64))
- force brace-expansion 5.0.8, patch minimatch to match ([#92](https://github.com/GSTJ/pegada/pull/92)) ([`8a54df5`](https://github.com/GSTJ/pegada/commit/8a54df5635a3f9c89f950761013c7d0f1e0b0da5))
- patch the Next.js and postcss advisories ([#91](https://github.com/GSTJ/pegada/pull/91)) ([`8fe8a6f`](https://github.com/GSTJ/pegada/commit/8fe8a6ffb5b66a0989af3d37c4aacc29501ab47b))
- clear the open Dependabot alerts ([#89](https://github.com/GSTJ/pegada/pull/89)) ([`cde392f`](https://github.com/GSTJ/pegada/commit/cde392f032a687bb2b2ba572f28e38ba9f898813))
- bump actions/setup-node from 6 to 7 ([#88](https://github.com/GSTJ/pegada/pull/88)) ([`1bde167`](https://github.com/GSTJ/pegada/commit/1bde1679e1fb2ea827c000a1f53a07daee024bad))
- bump actions/download-artifact from 7 to 8 ([#66](https://github.com/GSTJ/pegada/pull/66)) ([`1d62f67`](https://github.com/GSTJ/pegada/commit/1d62f6770cd4394eba8b09bcbc8597b1c56da666))
- bump actions/cache from 5 to 6 ([#67](https://github.com/GSTJ/pegada/pull/67)) ([`75b6952`](https://github.com/GSTJ/pegada/commit/75b69527bf10df620cd98fe8adc68d12905cd93a))

### Tests

- **api:** run the api suite on a single worker ([#95](https://github.com/GSTJ/pegada/pull/95)) ([`674279c`](https://github.com/GSTJ/pegada/commit/674279ce209e5cad62dfd5a5aaec07eb53068b2b))

### Build and CI

- generate the changelog, tag and GitHub release from conventional commits ([#102](https://github.com/GSTJ/pegada/pull/102)) ([`bc1f957`](https://github.com/GSTJ/pegada/commit/bc1f957963fb76e72c837754c310c9c6d5dcd4f1))
- run the test suite on branch pushes ([#99](https://github.com/GSTJ/pegada/pull/99)) ([`b843736`](https://github.com/GSTJ/pegada/commit/b84373634c6a236760e3dec7dbb476643f1b8960))
- **mobile:** fix release submit jobs, install deps, pin iOS ascAppId ([#65](https://github.com/GSTJ/pegada/pull/65)) ([`2bebb4b`](https://github.com/GSTJ/pegada/commit/2bebb4b1590523993b9f5e53ba5ac3cfb394d4b5))

### Chores

- license under AGPL-3.0 with a 7(b) attribution requirement ([#101](https://github.com/GSTJ/pegada/pull/101)) ([`4fcb212`](https://github.com/GSTJ/pegada/commit/4fcb21213c0b9fa147db6d394b9fda0b1a23fa4d))
- **mobile:** upload source maps to PostHog on release and OTA builds ([#84](https://github.com/GSTJ/pegada/pull/84)) ([`d93ae51`](https://github.com/GSTJ/pegada/commit/d93ae51e257a79968cb27b67ff5fd54ecb0a371b))

[Full diff](https://github.com/GSTJ/pegada/compare/v1.4.0-rc7...v1.5.0-rc1)

## v1.4.0-rc7 (2026-07-06)

### Build and CI

- **mobile:** fix Gradle daemon Metaspace OOM + Android lint ExtraTranslation ([`adb2c5a`](https://github.com/GSTJ/pegada/commit/adb2c5ab68405105e95f7725174dc3d7636f524f))

[Full diff](https://github.com/GSTJ/pegada/compare/v1.4.0-rc6...v1.4.0-rc7)

## v1.4.0-rc6 (2026-07-06)

### Features

- dual-path image uploads, R2 for new clients, S3 legacy for shipped binaries ([#58](https://github.com/GSTJ/pegada/pull/58)) ([`818730c`](https://github.com/GSTJ/pegada/commit/818730c906c698c5ad28a2b163f8719fd8295e65))
- **database:** Neon pooled/direct URL split ([#57](https://github.com/GSTJ/pegada/pull/57)) ([`3aaf1b7`](https://github.com/GSTJ/pegada/commit/3aaf1b7abadda84864cdd419d19edafd8913d6f7))
- vendor consolidation, Cloudflare mail, Vercel Queues, PostHog, Next 15/React 19 ([#56](https://github.com/GSTJ/pegada/pull/56)) ([`5f6012d`](https://github.com/GSTJ/pegada/commit/5f6012d49655f636aa63ccb186b603987141ed0a))
- **mobile:** MAESTRO_E2E placeholder photo affordance for iOS 26 picker (#44) ([#46](https://github.com/GSTJ/pegada/pull/46)) ([`c34548b`](https://github.com/GSTJ/pegada/commit/c34548b69870e207452405ae2ea09dd557997466))

### Fixes

- **vercel:** drop apps/nextjs prefix from function path keys ([#61](https://github.com/GSTJ/pegada/pull/61)) ([`11c4dca`](https://github.com/GSTJ/pegada/commit/11c4dca46c4d3f69699816b7a346f5f7a76f5b39))
- **vercel:** register queue triggers from repo-root vercel.json ([#60](https://github.com/GSTJ/pegada/pull/60)) ([`4806326`](https://github.com/GSTJ/pegada/commit/4806326f74559ef41d457179c2d5dfc2cea76a9c))
- **mobile:** Hermes import.meta transform ([#59](https://github.com/GSTJ/pegada/pull/59)) ([`6057600`](https://github.com/GSTJ/pegada/commit/6057600e83cd2dca147796a705d319bcb89031cf))
- **ci:** make the e2e hard gate real, Release builds + the app/test fixes it flushed out ([#54](https://github.com/GSTJ/pegada/pull/54)) ([`365c8ce`](https://github.com/GSTJ/pegada/commit/365c8ce2f20761d72cad2ab8a22fadc1341446e4))
- **test:** logout flow taps "Logout" (one word) to match i18n string ([#39](https://github.com/GSTJ/pegada/pull/39)) ([`eb19284`](https://github.com/GSTJ/pegada/commit/eb192841eb53ed0b3c1bb88ccfb1e953fea7e6ab))
- **mobile:** ToS/Privacy URLs + StoreKit sim config + upgrade wall close hit area ([#37](https://github.com/GSTJ/pegada/pull/37)) ([`2cba6e5`](https://github.com/GSTJ/pegada/commit/2cba6e5eb90bc702f132424ac58fce5972867ffb))
- **mobile:** photo upload fails on iOS 26 Release build ([#36](https://github.com/GSTJ/pegada/pull/36)) ([`a076df4`](https://github.com/GSTJ/pegada/commit/a076df48f004d44bb816630f2883d1bead86297d))
- **mobile:** swipe stack UX (hit target, back nav, seed coverage) ([#38](https://github.com/GSTJ/pegada/pull/38)) ([`67b9e8b`](https://github.com/GSTJ/pegada/commit/67b9e8beb69a3d521cdf82e010144267376e4d58))
- **test:** Maestro login utility taps keyboard region on iPhone 17 Pro Max iOS 26 (#40) ([#41](https://github.com/GSTJ/pegada/pull/41)) ([`dedd6c4`](https://github.com/GSTJ/pegada/commit/dedd6c4207d2d506ed8708947ca6da188f5bb3cb))
- **test:** Maestro login email tap coord 65% -> 84% ([#28](https://github.com/GSTJ/pegada/pull/28)) ([`d807d1c`](https://github.com/GSTJ/pegada/commit/d807d1c2dfe7b26bfce52721983dacaea4406f43))
- **mobile:** grey gap at bottom of profile scroll (missing tab-bar inset) ([#27](https://github.com/GSTJ/pegada/pull/27)) ([`dfef6c6`](https://github.com/GSTJ/pegada/commit/dfef6c65afb3fe62b40f31447980221d0eeea954))
- **mobile:** surface real error when EditProfile image upload fails ([#26](https://github.com/GSTJ/pegada/pull/26)) ([`f17957f`](https://github.com/GSTJ/pegada/commit/f17957face26d1b353d8f1352376228cfe77728b))
- **mobile:** new chat messages appear at the bottom (FlashList v2 inverted drop) ([#25](https://github.com/GSTJ/pegada/pull/25)) ([`5f436fe`](https://github.com/GSTJ/pegada/commit/5f436fe500a5b10344620495e08a74a0e73af492))
- **mobile:** swipe screen top inset rendered grey instead of white ([#22](https://github.com/GSTJ/pegada/pull/22)) ([`530bbe6`](https://github.com/GSTJ/pegada/commit/530bbe6749507f9822ba0aa6021ad419de95324c))
- **mobile:** make RevenueCat failures non-fatal ([#21](https://github.com/GSTJ/pegada/pull/21)) ([`6d8f2dc`](https://github.com/GSTJ/pegada/commit/6d8f2dc851160edd5bceb1867d0f124c7795d718))
- **mobile:** remove invalid tabBarTestID + soft-fail e2e-mobile CI ([#20](https://github.com/GSTJ/pegada/pull/20)) ([`3c92175`](https://github.com/GSTJ/pegada/commit/3c921752d6db358648a52ef640d2a6ad081a2619))
- **mobile:** patch redux-saga ESM proxy double-unwrap ([#18](https://github.com/GSTJ/pegada/pull/18)) ([`f7b1bf3`](https://github.com/GSTJ/pegada/commit/f7b1bf3b5eccab172a7a9f2bff5fad4bd08327bc))
- **mobile:** bump react-native-purchases for Xcode 26 SubscriptionPeriod ambiguity ([#17](https://github.com/GSTJ/pegada/pull/17)) ([`edc1b73`](https://github.com/GSTJ/pegada/commit/edc1b73a3ef4f62bbb15890fb225d600bed27ec0))
- **mobile:** bump react-native-reanimated to 4.3.1 for worklets 0.8 compat ([#16](https://github.com/GSTJ/pegada/pull/16)) ([`74f51fb`](https://github.com/GSTJ/pegada/commit/74f51fba0368db3e455c3029dbac70badc72af27))

### Performance

- **test:** OTP per-digit wait 25ms (was 150ms) ([#23](https://github.com/GSTJ/pegada/pull/23)) ([`b84630b`](https://github.com/GSTJ/pegada/commit/b84630bac4d65b274bee4834a67293404c2ddc46))

### Dependencies

- bump actions/checkout from 6 to 7 ([#52](https://github.com/GSTJ/pegada/pull/52)) ([`1ff7c6f`](https://github.com/GSTJ/pegada/commit/1ff7c6fd40f7f70c2612889598e0fcba2eb4fb18))
- bump pnpm/action-setup from 4.2.0 to 6.0.9 ([#51](https://github.com/GSTJ/pegada/pull/51)) ([`762e7b5`](https://github.com/GSTJ/pegada/commit/762e7b550d0fdbb631cf4121523cfe3b5911085e))
- bump actions/setup-java from 4 to 5 ([#47](https://github.com/GSTJ/pegada/pull/47)) ([`6e9ad4a`](https://github.com/GSTJ/pegada/commit/6e9ad4a7b262206e638df1972469d5623557e349))
- bump actions/upload-artifact from 4 to 7 ([#48](https://github.com/GSTJ/pegada/pull/48)) ([`d514ce5`](https://github.com/GSTJ/pegada/commit/d514ce5bb0cfcf4ae1cabd19166ba4489cca1e24))
- bump expo/expo-github-action from 8 to 9 ([#50](https://github.com/GSTJ/pegada/pull/50)) ([`1a36baa`](https://github.com/GSTJ/pegada/commit/1a36baaebb71b2f4ab755b66e733883adbe07ae0))
- bump actions/cache from 4 to 5 ([#10](https://github.com/GSTJ/pegada/pull/10)) ([`2685820`](https://github.com/GSTJ/pegada/commit/2685820a120100f412c2f8af8dc926606686acc5))
- bump actions/checkout from 4 to 6 ([#9](https://github.com/GSTJ/pegada/pull/9)) ([`861df6d`](https://github.com/GSTJ/pegada/commit/861df6d27f331d8fbb4577c92daba94a7b5cd9c9))
- bump actions/setup-node from 4 to 6 ([#8](https://github.com/GSTJ/pegada/pull/8)) ([`06bf6d4`](https://github.com/GSTJ/pegada/commit/06bf6d450b3a5ddafc68571695fb4bb84289aae7))
- bump pnpm/action-setup from 4.0.0 to 4.2.0 ([#7](https://github.com/GSTJ/pegada/pull/7)) ([`794e394`](https://github.com/GSTJ/pegada/commit/794e394cc2b6c4c2d58f61263356066802a7c6fb))

### Tests

- **e2e:** rewrite flows 20-27 with real verifications + DB post-checks ([#43](https://github.com/GSTJ/pegada/pull/43)) ([`3f4bc69`](https://github.com/GSTJ/pegada/commit/3f4bc69d7e828d8fb81f16d2b8589ea712a40424))
- **e2e:** upgrade journey with BE-mocked purchase (replaces #16) (#25) ([#35](https://github.com/GSTJ/pegada/pull/35)) ([`158039e`](https://github.com/GSTJ/pegada/commit/158039eb8794d2d85bb046ff23d373364fb0aeeb))
- **e2e:** account-creation user journey flow (#20) ([#34](https://github.com/GSTJ/pegada/pull/34)) ([`4ac6a4e`](https://github.com/GSTJ/pegada/commit/4ac6a4e93b23f73041dc7339f98ced09c8ebd1d1))
- **e2e:** logout + delete-account journeys (#26+#27) ([#33](https://github.com/GSTJ/pegada/pull/33)) ([`a0c51dd`](https://github.com/GSTJ/pegada/commit/a0c51ddaff9d2afea19821455f481067ebfd6f90))
- **e2e:** preferences/location/language/theme journey (replaces #15+#17) (#23) ([#32](https://github.com/GSTJ/pegada/pull/32)) ([`ccc6c05`](https://github.com/GSTJ/pegada/commit/ccc6c05fb92cff57a5d5d1ac939f9fa7a9022069))
- **e2e:** profile + ToS + Privacy + Rate journey (replaces #13+#14) (#24) ([#31](https://github.com/GSTJ/pegada/pull/31)) ([`660521b`](https://github.com/GSTJ/pegada/commit/660521b30b877500e8ea3512cd15ca9c34be8349))
- **e2e:** real new-match modal journey (replaces #18 stub) (#22) ([#30](https://github.com/GSTJ/pegada/pull/30)) ([`1cc6611`](https://github.com/GSTJ/pegada/commit/1cc66113fe8a76147053bae18e13588361b57fcc))
- **e2e:** swipe-stack user journey (like/dislike/profile/report) (#21) ([#29](https://github.com/GSTJ/pegada/pull/29)) ([`66aeb22`](https://github.com/GSTJ/pegada/commit/66aeb22aaffb0fef57617d3171ac64b455eef078))
- **mobile:** tighten Maestro login helpers (real screen-advancing flows) ([#19](https://github.com/GSTJ/pegada/pull/19)) ([`1e110a4`](https://github.com/GSTJ/pegada/commit/1e110a4748ed0aae1866f35779d3af7eaf684fe6))
- **mobile:** add Maestro e2e smoke flows + CI ([#15](https://github.com/GSTJ/pegada/pull/15)) ([`6cbf8a8`](https://github.com/GSTJ/pegada/commit/6cbf8a87d9951da43a44b6a46b9c50b3f9b14976))

### Build and CI

- **mobile:** bump Android build timeout, guarantee Gradle cache save ([`e46b19b`](https://github.com/GSTJ/pegada/commit/e46b19b5481d9786b28ab1fb0b3b5e912cf0a23e))
- **mobile:** decode GoogleService secrets before pnpm install, not after ([`174b4d8`](https://github.com/GSTJ/pegada/commit/174b4d8c718fe0633fc3207ffd735e673bfcfed9))
- **mobile:** fix GoogleService file delivery for eas build --local ([`a16d58d`](https://github.com/GSTJ/pegada/commit/a16d58d52ce299526eb17462611c6bf9ec28dd5f))
- **mobile:** write real GoogleService files before local EAS builds ([`bbb36a8`](https://github.com/GSTJ/pegada/commit/bbb36a80de8703bdfa770c18a5b406de9aedc034))
- **mobile:** add GHA release workflow, EAS local builds + manual submit ([`ec59077`](https://github.com/GSTJ/pegada/commit/ec5907736594407316968fa5a538274ccbd20794))
- e2e fingerprint cache, bundle swap, dead-time cuts, sharded extended suite ([#62](https://github.com/GSTJ/pegada/pull/62)) ([`f85e0c6`](https://github.com/GSTJ/pegada/commit/f85e0c6fdae8ae5d8e45c5546f71d30be22a1272))
- **e2e:** make Maestro CI a real gate (no more continue-on-error) ([#42](https://github.com/GSTJ/pegada/pull/42)) ([`4e25347`](https://github.com/GSTJ/pegada/commit/4e2534784d1158825c3fa62a3a1b65968f54f5b1))

### Chores

- gitignore + deps cleanup (session replay dep, stray app.json) ([#64](https://github.com/GSTJ/pegada/pull/64)) ([`c2a2776`](https://github.com/GSTJ/pegada/commit/c2a2776a537e6f7b4073cec7e96a930c50dfbd1e))
- gitignore local artifacts (env.production, maestro screenshots, claude worktrees) ([#53](https://github.com/GSTJ/pegada/pull/53)) ([`e834c93`](https://github.com/GSTJ/pegada/commit/e834c93b85b14c3ffc0400aa422018f716c52105))
- **test:** auto-seed Maestro test DB state on every flow run ([#24](https://github.com/GSTJ/pegada/pull/24)) ([`c653c2d`](https://github.com/GSTJ/pegada/commit/c653c2dace17f3b707617ebb07aaf16591aa63a2))
- upgrade Expo SDK 51 → 55 ([#14](https://github.com/GSTJ/pegada/pull/14)) ([`109cd6e`](https://github.com/GSTJ/pegada/commit/109cd6ee550baecb1469027ad936f1094c6cfe8c))
- migrate from ESLint+Prettier to oxlint+oxfmt ([#13](https://github.com/GSTJ/pegada/pull/13)) ([`d9c2a74`](https://github.com/GSTJ/pegada/commit/d9c2a743cbd89add20843a435ce317a18a8e9549))
- dependency bumps (2026-05-18, 7-day rule) ([#11](https://github.com/GSTJ/pegada/pull/11)) ([`3943797`](https://github.com/GSTJ/pegada/commit/394379784c16cab6b5fda28ec085466464cc4027))

### Other

- **mobile:** bump version to 1.4.0 ([`08f898c`](https://github.com/GSTJ/pegada/commit/08f898cec3b9cf121a7f81392162d591bcd3a173))
- ✨ Update README.md ([`624372d`](https://github.com/GSTJ/pegada/commit/624372d88b9e0bb852efda278dbd6b5441a7b532))
- ✨ Update README.md ([`3fe92f1`](https://github.com/GSTJ/pegada/commit/3fe92f1bd43a4b134e183b188e3b316e84758266))
- ✨ Add banner to README.md ([`10b045b`](https://github.com/GSTJ/pegada/commit/10b045b6175b95a91639092b4177b665e5e81c70))
- ✨ Add logo asset ([`559f233`](https://github.com/GSTJ/pegada/commit/559f233a31d7f2bb7e13afabec2eb1e89361020e))
- 🚀 Make it Open-Source! ([`e9f2e57`](https://github.com/GSTJ/pegada/commit/e9f2e579cc34ab55ab07cfab3598f38cce935114))

[Full history](https://github.com/GSTJ/pegada/commits/v1.4.0-rc6)
