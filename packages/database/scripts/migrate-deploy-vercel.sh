#!/usr/bin/env bash
# Applies pending migrations as part of a Vercel production build.
#
# The gap this closes: Vercel builds and promotes every push to `main`, and the
# build only ran `prisma generate`. Nothing ever ran `prisma migrate deploy`
# against the production database, so the generated client and the live schema
# drifted apart on their own. Prisma selects every scalar column of a model
# unless a query names a `select`, so the first deploy carrying a new column is
# also the deploy where `prisma.user.findUnique({ where: { id } })` starts
# asking for a column that was never created and the request 500s. Nothing in
# the build is red when that happens: the deploy is green and the API is down.
#
# So the migration has to run in the same build that ships the client that
# expects it, before `next build`, and it has to be able to fail the build.
#
# Scope, in order of the checks below:
#
# `VERCEL_ENV` is set by Vercel and by nothing else, so an unset value is a
# local build or a CI job and this is a no-op there. Preview deploys are
# excluded too: they point at whatever database the preview environment
# configures, and a preview of an unmerged branch must not be what applies a
# migration to it.
#
# `DIRECT_URL` is the datasource's `directUrl` (see schema.prisma). Migrations
# are DDL and advisory locks, which a connection pooler in transaction mode
# cannot carry, so `DATABASE_URL` is the wrong URL for this even when it works.
# Prisma picks `directUrl` up on its own for migrate commands; the check here
# is so a missing value stops the deploy with a sentence that says what to set,
# instead of a Prisma error about an environment variable.
#
# Missing `DIRECT_URL` is a hard failure rather than a fallback to the pooled
# URL on purpose. A production deploy that cannot apply its migrations is the
# exact situation this script exists to prevent, and quietly continuing would
# reintroduce it.
set -euo pipefail

if [ "${VERCEL_ENV:-}" != "production" ]; then
  echo "migrate deploy: skipped, VERCEL_ENV is '${VERCEL_ENV:-unset}' and not 'production'."
  exit 0
fi

if [ -z "${DIRECT_URL:-}" ]; then
  echo "migrate deploy: DIRECT_URL is not set." >&2
  echo "Production deploys apply migrations over a direct (non-pooled) connection." >&2
  echo "Add DIRECT_URL to the Vercel production environment and redeploy." >&2
  exit 1
fi

echo "migrate deploy: applying pending migrations to the production database."

# No `|| true` and no retry. `set -e` carries the exit code out to the build,
# which is the point: a failed migration must stop the deploy before
# `next build` produces an artifact that expects the schema it did not get.
npx prisma migrate deploy

echo "migrate deploy: migrations applied."
