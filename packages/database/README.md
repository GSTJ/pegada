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

## Integration

This package is designed to be used by:

- The Next.js web application
- The queue service
- The API package
- Other shared packages as needed

## Configuration

Database connection settings are configured through environment variables.
