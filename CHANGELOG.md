# Changelog

Generated from conventional commits by `.github/scripts/changelog.py`. Run `pnpm changelog` to refresh it.

## v1.4.0-rc7 (2026-07-06)

### Build and CI

- **mobile:** fix Gradle daemon Metaspace OOM + Android lint ExtraTranslation ([`adb2c5a`](https://github.com/GSTJ/pegada/commit/adb2c5ab68405105e95f7725174dc3d7636f524f))

[Full diff](https://github.com/GSTJ/pegada/compare/v1.4.0-rc6...v1.4.0-rc7)

## v1.4.0-rc6 (2026-07-06)

### Features

- dual-path image uploads — R2 for new clients, S3 legacy for shipped binaries ([#58](https://github.com/GSTJ/pegada/pull/58)) ([`818730c`](https://github.com/GSTJ/pegada/commit/818730c906c698c5ad28a2b163f8719fd8295e65))
- **database:** Neon pooled/direct URL split ([#57](https://github.com/GSTJ/pegada/pull/57)) ([`3aaf1b7`](https://github.com/GSTJ/pegada/commit/3aaf1b7abadda84864cdd419d19edafd8913d6f7))
- vendor consolidation — Cloudflare mail, Vercel Queues, PostHog, Next 15/React 19 ([#56](https://github.com/GSTJ/pegada/pull/56)) ([`5f6012d`](https://github.com/GSTJ/pegada/commit/5f6012d49655f636aa63ccb186b603987141ed0a))
- **mobile:** MAESTRO_E2E placeholder photo affordance for iOS 26 picker (#44) ([#46](https://github.com/GSTJ/pegada/pull/46)) ([`c34548b`](https://github.com/GSTJ/pegada/commit/c34548b69870e207452405ae2ea09dd557997466))

### Fixes

- **vercel:** drop apps/nextjs prefix from function path keys ([#61](https://github.com/GSTJ/pegada/pull/61)) ([`11c4dca`](https://github.com/GSTJ/pegada/commit/11c4dca46c4d3f69699816b7a346f5f7a76f5b39))
- **vercel:** register queue triggers from repo-root vercel.json ([#60](https://github.com/GSTJ/pegada/pull/60)) ([`4806326`](https://github.com/GSTJ/pegada/commit/4806326f74559ef41d457179c2d5dfc2cea76a9c))
- **mobile:** Hermes import.meta transform ([#59](https://github.com/GSTJ/pegada/pull/59)) ([`6057600`](https://github.com/GSTJ/pegada/commit/6057600e83cd2dca147796a705d319bcb89031cf))
- **ci:** make the e2e hard gate real — Release builds + the app/test fixes it flushed out ([#54](https://github.com/GSTJ/pegada/pull/54)) ([`365c8ce`](https://github.com/GSTJ/pegada/commit/365c8ce2f20761d72cad2ab8a22fadc1341446e4))
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
