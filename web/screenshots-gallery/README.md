# web/screenshots-gallery

Evidence for `web/screenshots-gallery` (Pegada web, Wave 2, PR 7): a gallery of
four real app screens, added after how-it-works on `/[locale]`.

Web captures come from `next dev` on `localhost:3020`, Chromium via Playwright,
`prefers-reduced-motion: reduce`. Desktop is 1440x900 at DPR 2, mobile is
390x844 at DPR 3. The Next dev badge is hidden with a style tag; nothing else
about the page is altered.

## Files

- `gallery-desktop-en.png`, `gallery-desktop-pt-BR.png` — the section at 1440
  wide, four-up with the stagger on.
- `gallery-mobile-en.png`, `gallery-mobile-pt-BR.png` — the same section at 390
  wide, where it becomes a snap-scrolling row. The second phone deliberately
  peeks past the right edge so the row reads as scrollable.
- `hero-diff-{desktop,mobile}-{en,pt-BR}.png` — the hero viewport before
  (`web/content-sections`, 67fde76) and after (63164b4), per locale, labelled
  `diff: none`.

## Where the screens came from

Not renders, not edited. The app was run on a booted iPhone 17 Pro Max
simulator (iOS 26.5) against the repo's own local stack — `pegada-postgres`
seeded by `pnpm -F @pegada/database maestro:seed`, plus redis and minio from
`packages/database/docker-compose.yml`, with the API on `localhost:3010`.

Sign-in used the repo's existing magic-auth path (`.maestro/utils/login-
returning.yaml`, `test@pegada.app` / `424242`). Navigation to each screen was
driven by Maestro; the captures themselves are `xcrun simctl io booted
screenshot`, so every file is a native 1320x2868 device screenshot rather than
a Maestro-scaled one.

The app's language was forced to pt-BR by patching `language` in the
AsyncStorage manifest, exactly the way
`.maestro/scripts/pre/23b-seed-asyncstorage.sh` already does it for flow 23b.

Seed rows carry names like `SwipeDog3` and bios like "seeded to keep Rex's
swipe stack populated", which cannot appear on a landing page, so the local
`Dog` and `Message` rows were given plausible pt-BR content before capture.
That edit is local to the dev database and is not in the diff.

| screen | source | dog |
| --- | --- | --- |
| swipe | `public/app-screenshot-pt-br.png`, already in the repo and unreferenced | Lua |
| dog profile | captured this session | Nina |
| match | captured this session | Nina + Bella |
| chat | captured this session | Bella |

The swipe screen is the pre-existing asset rather than a fresh capture on the
same simulator, for two reasons: it is the only one of the four showing a real
user's dog and a visible distance badge, which is what its caption claims; and
Nina already appears on two of the other three phones, so re-shooting the deck
would have put the same dog on three of four.

The cost is a visible one: that capture is from an older device with no dynamic
island and a clock reading 14:55 against 19:32-19:35 on the other three. Left
as-is, noted as a follow-up.

## Asset weight

Sources added to the repo, all `cwebp -q 75 -m 6` at 720px wide — the same
settings `scripts/convert-png-images-to-webp.sh` applies to the mobile assets.
q75 and q85 are indistinguishable once the image is painted at 228-284 CSS px;
q85 would have cost another 72,710 B for nothing.

| file | bytes | KiB |
| --- | --- | --- |
| `public/screens/swipe.webp` | 53,266 | 52.0 |
| `public/screens/profile.webp` | 50,844 | 49.7 |
| `public/screens/match.webp` | 36,724 | 35.9 |
| `public/screens/chat.webp` | 16,946 | 16.5 |
| **total added to repo** | **157,780** | **154.1** |

What a visitor actually downloads is less, because next/image re-encodes per
request and Chromium negotiates AVIF. Measured off the Playwright response log,
one cold load per row, all four images `loading="lazy"`:

| viewport | DPR | CSS width | `w=` requested | actual served | delivered bytes | KiB |
| --- | --- | --- | --- | --- | --- | --- |
| desktop 1440x900 | 2 | 284 | 640 | 640x1390 | 118,492 | 115.7 |
| mobile 390x844 | 3 | 228 | 828 | 720x1564 | 149,756 | 146.2 |

Mobile asks for 828 and gets 720, because the source caps there. That is the
intended ceiling: 720 is 2x the widest a phone is ever painted on this page.

### Against PR #114's budget

PR #114 (`web/hero-delivery`, wave 1 PR 3) is still open, so on this branch's
base the hero is still `phone-mockup.png` at 4,924,610 B, eager, through a raw
`<img>`. Against that page this gallery is +2.4% desktop / +3.0% mobile.

That framing flatters it and is worth stating the other way round. Once #114
lands, its measured page total is 123,714 B at desktop DPR 2. This section adds
118,492 B on top, which roughly doubles the page. The defence is not that the
bytes are small — it is that all of them are lazy and below the fold, so LCP,
the metric #114 moved from 2,719 ms to 2,107 ms, is untouched: nothing in this
section is fetched until the visitor scrolls past how-it-works.

## The hero claim

`before` was captured by stashing the branch's changes against the same running
dev server, so the two shots differ only by the diff under test. Compared with
`cmp`, the files are byte-for-byte identical — not merely zero differing pixels:

```
hero desktop en      identical (byte-for-byte)
hero desktop pt-BR   identical (byte-for-byte)
hero mobile  en      identical (byte-for-byte)
hero mobile  pt-BR   identical (byte-for-byte)
```

Expected: `<Screens />` is appended as a sibling after `<HowItWorks />`, and the
hero's wrapper is `min-h-screen`, so nothing on the first screen moves.
`git diff` against `hero-image.tsx`, `cta.tsx`, `restricter.tsx`, `logo.tsx`,
`phone-mockup.png` and `hand-holding-phone.webp` is empty.

## Gates

Run against the committed tree.

| gate | command | result |
| --- | --- | --- |
| oxlint | `./node_modules/.bin/oxlint --report-unused-disable-directives` | exit 0, silent |
| oxlint seed check | same, with a stray `tabIndex` added to the `<h2>` | exit 1, 1 error — the clean pass is real |
| oxfmt | `./node_modules/.bin/oxfmt --check .` | exit 0, 472 files |
| typecheck | `tsc --noEmit --emitDeclarationOnly false` | exit 0 |
| next build | `pnpm nextjs build` | fails, pre-existing |

`next build` fails on both this branch and its base 67fde76 with the identical
error — `<Html> should not be imported outside of pages/_document`, thrown while
prerendering `/404` and `/500`. It is not from this diff. The app router pages
compile clean ("Compiled with warnings in 5.2s") and both locales render and
were screenshotted from a live server.
