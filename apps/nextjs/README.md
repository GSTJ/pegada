# Pegada Web Frontend

The Next.js web application for the Pegada project.

## Features

- Modern React with Next.js 14+ and App Router
- TypeScript for type safety
- Tailwind CSS for styling
- i18n for internationalization
- Component library integration

## Development

Start the development server:

```bash
# From the monorepo root
pnpm nextjs dev

# Or from this directory
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                # App Router pages and layouts
├── components/         # UI components
│   ├── ui/             # Base UI components
│   └── ...             # Feature-specific components
├── lib/                # Utility functions and helpers
└── styles/             # Global styles
```

## Available Scripts

- `pnpm dev` - Start the development server
- `pnpm build` - Build for production
- `pnpm start` - Start the production server
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking

## Integration with Monorepo

This app can use shared packages from the monorepo:

- `@pegada/api` - API client and endpoints
- `@pegada/database` - Database models and queries
- `@pegada/shared` - Shared utilities and types
