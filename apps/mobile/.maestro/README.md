# Maestro E2E Smoke Tests

## Prerequisites

1. Install Maestro:

   ```sh
   curl -fsSL "https://get.maestro.mobile.dev" | bash
   ```

2. Export the magic credentials (see repo secrets or ask a team member):

   ```sh
   export APPLE_MAGIC_EMAIL=test@pegada.app
   export APPLE_MAGIC_CODE=424242
   # Optional — enables the fresh-user journey flow (20-account-creation-journey).
   # When set on the API side, any email matching the regex bypasses OTP AND is
   # hard-purged on every successful login so each Maestro run starts clean.
   # Only honored when NODE_ENV !== 'production'.
   export APPLE_MAGIC_EMAIL_REGEX='^maestro-fresh.*@pegada\.app$'
   ```

   These map to `APPLE_MAGIC_EMAIL` / `APPLE_MAGIC_CODE` / `APPLE_MAGIC_EMAIL_REGEX`
   in the API's `AuthenticationService`. When the submitted email matches the
   magic value (or regex), no real email is sent and the magic code bypasses
   OTP verification — perfect for CI and local testing.

3. Make sure `EXPO_PUBLIC_API_URL` points to a running API instance (local or staging).

## Running locally

Boot an iOS simulator and install the debug build, then:

```sh
# Run all flows
maestro test apps/mobile/.maestro/

# Run a single flow
maestro test apps/mobile/.maestro/launch.yaml
```

## Flows

| File                               | What it does                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `01-launch.yaml`                   | Cold-launches the app, asserts the sign-in screen is visible.                                                                   |
| `02-sign-in.yaml`                  | Enters magic email + 6-digit code, asserts OTP screen exits.                                                                    |
| `03-create-profile.yaml`           | Runs sign-in, fills dog name, asserts location screen appears.                                                                  |
| `…`                                | (see flow files for the rest)                                                                                                   |
| `20-account-creation-journey.yaml` | Full end-to-end user journey: sign-in → photo upload → name → birthdate → location → swipe. Requires `APPLE_MAGIC_EMAIL_REGEX`. |

## Required GitHub Secrets

| Secret                    | Description                                                                                                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APPLE_MAGIC_EMAIL`       | Email used by the API bypass (defaults to `test@pegada.app`)                                                                                                                                                                     |
| `APPLE_MAGIC_CODE`        | 6-digit OTP used by the API bypass (defaults to `424242`)                                                                                                                                                                        |
| `APPLE_MAGIC_EMAIL_REGEX` | Optional. Regex matched against the submitted email — every match is treated as a disposable Maestro user, hard-purged on each login. Honored only when `NODE_ENV !== 'production'`. Required for `20-account-creation-journey`. |

Set these in **Settings → Secrets and variables → Actions** in the repository.
