# Maestro E2E Smoke Tests

## Prerequisites

1. Install Maestro:

   ```sh
   curl -fsSL "https://get.maestro.mobile.dev" | bash
   ```

2. Export the magic credentials (see repo secrets or ask a team member):

   ```sh
   # Comma-separated list: the primary review user + the disposable
   # delete-me account used by 27-delete-account-journey.yaml.
   export APPLE_MAGIC_EMAIL="test@pegada.app,delete-me@pegada.app"
   export APPLE_MAGIC_CODE=424242
   ```

   These map to `APPLE_MAGIC_EMAIL` / `APPLE_MAGIC_CODE` in the API's `AuthenticationService`.
   `APPLE_MAGIC_EMAIL` accepts a single email or a comma-separated list. For any listed
   email, no real verification email is sent and the magic code bypasses OTP verification —
   perfect for CI and local testing. The destructive `27-delete-account-journey` flow uses
   `delete-me@pegada.app` so it can hard-delete its own user without nuking the primary
   review account.

   Before running the delete-account flow, re-seed the disposable user:

   ```sh
   pnpm -F @pegada/database maestro:seed
   ```

   After the flow finishes, verify the row was actually wiped:

   ```sh
   pnpm -F @pegada/database maestro:check-deleted   # exits 1 if the row remains
   ```

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

| File                  | What it does                                                             |
| --------------------- | ------------------------------------------------------------------------ |
| `launch.yaml`         | Cold-launches the app, asserts the sign-in screen is visible.            |
| `sign-in.yaml`        | Enters magic email + 6-digit code, asserts OTP screen exits.             |
| `create-profile.yaml` | Runs sign-in, fills dog name, asserts location screen appears.           |
| `swipe.yaml`          | Runs sign-in (assumes full profile), taps like button, asserts no crash. |
| `26-logout-journey.yaml` | Login → Profile → Logout → confirm → assert sign-in screen + cold relaunch stays logged out (Keychain wiped). |
| `27-delete-account-journey.yaml` | Login as disposable `delete-me@pegada.app` → Profile → Delete Account → confirm → assert sign-in. Wrap with `maestro:seed` (before) and `maestro:check-deleted` (after) to seed the user and verify DB deletion. |

## Required GitHub Secrets

| Secret              | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `APPLE_MAGIC_EMAIL` | Email used by the API bypass (defaults to `test@pegada.app`) |
| `APPLE_MAGIC_CODE`  | 6-digit OTP used by the API bypass (defaults to `424242`)    |

Set these in **Settings → Secrets and variables → Actions** in the repository.
