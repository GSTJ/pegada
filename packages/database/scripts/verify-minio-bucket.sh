#!/usr/bin/env bash
# Clean-slate proof that `docker compose up` leaves a usable object store
# behind, not just a running one.
#
# The bug this guards: `minio server` creates no buckets, and nothing in the
# repo created the one the API is configured for. A fresh clone therefore got
# a MinIO that answered every request except the one that mattered —
# `image.signedUpload` minted a presigned PUT and returned 200, the device's
# PUT came back 404 NoSuchBucket, and neither side logged anything. The photo
# never attached, so submitting a new profile did nothing at all.
#
# So a green "the container is up" is exactly the false positive to avoid.
# This script drives the real upload path instead: presign, PUT, public GET.
#
# It runs against a THROWAWAY compose project built from the same file the
# dev environment uses, on its own ports and its own volumes. That is not
# fussiness — the dev project's postgres holds seeded state (frozen chat
# timestamps the pixel harness compares against), and `down -v` on the shared
# project would take it with the bucket.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$HERE/../docker-compose.yml}"
PROJECT="${PROJECT:-pegada-minio-verify}"
HOST_PORT="${HOST_PORT:-9102}"
BUCKET="${AWS_S3_BUCKET_NAME:-pegada-dev}"

OVERRIDE="$(mktemp -t pegada-minio-verify-XXXXXX.yml)"
cat >"$OVERRIDE" <<YAML
services:
  minio:
    container_name: ${PROJECT}-minio
    # !override, not a plain list: compose MERGES port mappings across files,
    # so without it this project also tries to bind the dev environment's 9002
    # and dies on "port is already allocated".
    ports: !override
      - "${HOST_PORT}:9000"
YAML

compose() {
  docker compose -f "$COMPOSE_FILE" -f "$OVERRIDE" -p "$PROJECT" "$@"
}

cleanup() {
  compose down -v --remove-orphans >/dev/null 2>&1 || true
  rm -f "$OVERRIDE"
}
trap cleanup EXIT

echo "==> clean slate: tearing down any previous $PROJECT"
compose down -v --remove-orphans >/dev/null 2>&1 || true

echo "==> docker compose up (minio + its init)"
if ! compose up -d --wait minio; then
  echo "FAIL - minio never became healthy" >&2
  compose logs --no-color minio >&2 || true
  exit 1
fi

# `--wait` is for long-running services: it reports a one-shot that has already
# exited 0 as a failure. Start the init container and wait on it directly so its
# exit code is the thing being judged.
if ! compose up -d minio-init >/dev/null 2>&1; then
  echo "FAIL - no minio-init service, so nothing provisions the bucket" >&2
  echo "       'minio server' creates none of its own, and the API assumes one" >&2
  exit 1
fi
INIT_CONTAINER="$(compose ps -aq minio-init)"
INIT_CODE="$(docker wait "$INIT_CONTAINER")"
if [[ "$INIT_CODE" != "0" ]]; then
  echo "FAIL - minio-init exited $INIT_CODE" >&2
  compose logs --no-color minio-init >&2 || true
  exit 1
fi
compose logs --no-color --tail 4 minio-init | sed 's/^/    /'

ENDPOINT="http://host.docker.internal:${HOST_PORT}"
mc() {
  docker run --rm --add-host host.docker.internal:host-gateway \
    --entrypoint /bin/sh minio/mc:latest -c \
    "mc alias set probe $ENDPOINT pegada-dev pegada-dev-secret >/dev/null && $*"
}

echo "==> the bucket exists"
if ! mc "mc ls probe/$BUCKET" >/dev/null 2>&1; then
  echo "FAIL - bucket '$BUCKET' is missing after a clean up" >&2
  echo "       (this is the original defect: the API presigns into a bucket" >&2
  echo "        that was never created, and the device's PUT 404s)" >&2
  exit 1
fi

echo "==> the app's upload path: signed PUT -> public GET"
# The key the API actually writes first: image.signedUpload presigns into
# dogs-temporary/, and dog.create copies the object out of it afterwards.
KEY="dogs-temporary/verify-$$"

# A signed PUT into the bucket. This is the request that used to come back
# 404 NoSuchBucket, and the reason the whole failure was invisible: the
# presign that precedes it talks only to the API and answers 200 regardless.
#
# Signed here by mc rather than by curl against a presigned URL, because
# SigV4 covers the Host header: mc runs in a container and would have to sign
# for host.docker.internal, while curl on the host reaches the same MinIO as
# localhost. Rewriting the host invalidates the signature (403). Same PUT,
# same authorization, same bucket.
if ! mc "echo pegada-minio-verify | mc pipe probe/$BUCKET/$KEY" >/dev/null 2>&1; then
  echo "FAIL - signed PUT into '$BUCKET/$KEY' was rejected" >&2
  mc "echo pegada-minio-verify | mc pipe probe/$BUCKET/$KEY" >&2 || true
  exit 1
fi
echo "    PUT  ok"

# The API hands clients a plain bucket URL rather than a presigned GET, so
# anonymous read has to be on or every image renders as a broken box.
STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
  "http://localhost:${HOST_PORT}/${BUCKET}/${KEY}")"
if [[ "$STATUS" != "200" ]]; then
  echo "FAIL - anonymous GET returned $STATUS, expected 200" >&2
  exit 1
fi
echo "    GET  $STATUS"

echo "PASS - '$BUCKET' is provisioned by compose and accepts the app's uploads"
