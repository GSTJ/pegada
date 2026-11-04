# Pegada Database Package

Shared database models, migrations, and queries for the Pegada project.

## Overview

This package provides a unified database layer for use across the monorepo. It includes:

- Database schema definitions
- Migrations
- Model definitions
- Query utilities
- Type definitions

## Usage

Import and use in other packages or applications:

```typescript
import { db, models } from "@pegada/database";

// Example query
const user = await models.users.findById(userId);
```

## Project Structure

```
src/
├── models/             # Database models
├── migrations/         # Database migration scripts
├── schema/             # Schema definitions
├── types/              # Type definitions for database entities
└── utils/              # Database utility functions
```

## Development

```bash
# From the monorepo root
pnpm database build

# Run migrations
pnpm database migrate

# Run tests
pnpm database test
```

## Local object storage

MinIO community distribution is source-only, and both Docker Hub images are
unavailable. Both compose files build the server and client from pinned upstream
commits in `docker/minio/Dockerfile`, using pinned multi-platform base images.
The first start needs network access to Docker Hub, the Go module proxy and
Alpine package repositories, plus time to compile Go dependencies. Later starts
reuse Docker's build cache. No host Go installation is required.

The verifier checks bucket initialization, authenticated upload and anonymous
read, and removes only its throwaway compose project on exit. These source
builds are for local development and tests; upstream community maintenance has
ended. See the [upstream distribution notes](https://github.com/minio/minio#source-only-distribution).

`docker-compose.yml` runs MinIO as an S3 stand-in on `localhost:9002`, and a
one-shot `minio-init` container creates the bucket the API is configured for
(`AWS_S3_BUCKET_NAME`, default `pegada-dev`) and opens it for anonymous reads.

The init container exists because `minio server` creates no buckets, and the
missing-bucket failure is silent from end to end: `image.signedUpload` answers
200 with a presigned PUT, the client's PUT comes back 404 `NoSuchBucket`, and
nothing logs it. The symptom is a photo that never attaches and a Create
Profile button that does nothing.

To prove a clean checkout works, on a throwaway compose project so the shared
dev Postgres is never touched:

```bash
pnpm database minio:verify
```

It tears its project down with `-v`, brings MinIO back up, and drives the real
upload path — signed PUT into `dogs-temporary/`, then an anonymous GET, which
must return 200.

`docker-compose.test.yml` carries the same pair on `localhost:9004`, so the
test environment is not the one place the upload path has nothing to talk to.
`pnpm database minio:verify:test` is the same proof against that file.

## Integration

This package is designed to be used by:

- The Next.js web application
- The queue service
- The API package
- Other shared packages as needed

## Configuration

Database connection settings are configured through environment variables.
