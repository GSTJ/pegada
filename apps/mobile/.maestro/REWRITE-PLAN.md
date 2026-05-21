# Maestro Flows 20-27 — Rewrite Plan (WIP)

This document tracks the rewrite of the journey flows (20-27) so they:

1. Use real assertions (no more "guard" tests that wave through anything).
2. Use the iOS 26 RN Fabric compatible patterns (point-based taps and
   native UI element assertions only — see "Lessons" below).
3. Have DB post-checks for any state-changing flow.
4. Record screenshots at every transition for visual verification.
5. Run through a wrapper (`scripts/run-flow.sh <N>`) that handles
   seed + maestro test + DB check in one shot.

## Lessons applied (iOS 26 RN Fabric)

- `tapOn: { id: <RN-testID> }` returns "no element found" because the
  XCUITest accessibility tree is empty for RN-rendered components.
  Use `tapOn: { point: "X%, Y%" }` for in-app taps.
- `assertVisible: text:` against RN text fails for the same reason — the
  rendered text is not in the a11y tree. Use screenshots for visual
  proof + DB post-checks for state proof.
- Native iOS UI (UIAlertController, system keyboard accessories, ATT
  prompt, Safari Done button, Photos picker) DOES expose its a11y tree.
  `tapOn: { text: }` works there.
- i18n strings must exact-match `packages/shared/i18n/locales/en/translation.json`.
- Sim keyboard eats the bottom ~29%. Email field is at 50%/53%, Continue
  at 50%/62% on iPhone 17 Pro Max.
- `@gorhom/bottom-sheet` open sheets crash the XCUITest driver — do NOT
  tap inside them. Test sheet-blocked features by seeding state + cold
  relaunch + screenshot verify (see 23b).
- DB post-checks are the gold-standard verifier for state-changing flows.

## Flow status

| # | Flow                          | Status | Post-check                           |
|---|-------------------------------|--------|--------------------------------------|
| 20 | account-creation-journey     | TODO   | User+Dog+Image rows in DB            |
| 21 | swipe-journey                | TODO   | Interest rows of correct types       |
| 22 | new-match-journey            | TODO   | Match + Message rows                 |
| 23 | preferences-journey          | TODO   | dog.preferred* columns               |
| 23b | lang-theme-persistence (NEW) | TODO   | visual + AsyncStorage                |
| 24 | profile-journey              | TODO   | dog.name = timestamped value         |
| 25 | upgrade-journey              | TODO   | Subscription row PREMIUM             |
| 26 | logout-journey               | TODO   | screenshot proof                     |
| 27 | delete-account-journey       | TODO   | User row gone                        |

## Wrapper

`apps/mobile/.maestro/scripts/run-flow.sh <flow-num>`:

1. seed (idempotent)
2. maestro test `<NN>-*.yaml`
3. if `.maestro/checks/<NN>-*.sh` exists → run it
4. exit 0 only if both pass

DB checks use `psql postgresql://tony:hawk@localhost:3356/pegada -c "..."`.
