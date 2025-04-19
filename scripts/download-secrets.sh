#!/usr/bin/env bash
set -euxo pipefail

./scripts/setup-awscli.sh

aws s3 cp s3://pegava/secrets/google-services.json apps/mobile/google-services.json
aws s3 cp s3://pegava/secrets/GoogleService-Info.plist apps/mobile/GoogleService-Info.plist
aws s3 cp s3://pegava/secrets/.env.dev .env.dev