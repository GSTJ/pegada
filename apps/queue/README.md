# Pegada Queue Service

Background job processing service for the Pegada project.

## Features

- Asynchronous job processing
- TypeScript for type safety
- Integration with the project's database layer
- Scalable job scheduling and execution

## Development

Start the development server:

```bash
# From the monorepo root
pnpm queue dev

# Or from this directory
pnpm dev
```

## Project Structure

```
src/
├── jobs/               # Job definitions and handlers
├── queue/              # Queue configuration and setup
├── services/           # External service integrations
└── utils/              # Utility functions and helpers
```

## Available Scripts

- `pnpm dev` - Start the queue service in development mode
- `pnpm start` - Start the queue service in production mode
- `pnpm lint` - Run ESLint
- `pnpm test` - Run tests
- `pnpm typecheck` - Run TypeScript type checking

## Integration with Monorepo

This service integrates with other monorepo packages:

- `@pegada/api` - API client and endpoints
- `@pegada/database` - Database models and queries
- `@pegada/shared` - Shared utilities and types

## Configuration

Environment variables can be configured through the monorepo's environment files.
