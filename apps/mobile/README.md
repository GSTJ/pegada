# Pegada Mobile App

The React Native mobile application for the Pegada project.

## Features

- Built with React Native and Expo
- TypeScript for type safety
- Styled components for styling
- Redux for state management
- React Navigation for navigation
- Reanimated for smooth animations

## Development

Start the development server:

```bash
# From the monorepo root
pnpm mobile start

# Or from this directory
pnpm start
```

## Project Structure

```
src/
├── assets/             # Images, fonts, and other static assets
├── components/         # UI components
├── navigation/         # Navigation setup and screens
├── screens/            # Screen components
├── services/           # External services and API clients
├── store/              # Redux store setup and slices
├── translations/       # i18n translations
└── utils/              # Utility functions and helpers
```

## Available Scripts

- `pnpm start` - Start the Expo development server
- `pnpm android` - Start for Android
- `pnpm ios` - Start for iOS
- `pnpm web` - Start for web
- `pnpm lint` - Run ESLint
- `pnpm test` - Run tests

## Integration with Monorepo

This app can use shared packages from the monorepo:

- `@pegada/api` - API client and endpoints
- `@pegada/database` - Database models and queries
- `@pegada/shared` - Shared utilities and types

## Building and Publishing

The app uses Expo's EAS Build for building native binaries. Configuration is in the `eas.json` file.
