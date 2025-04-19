# Pegada

A modern monorepo project with mobile, web, and API capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Technologies](#technologies)
- [Contributing](#contributing)
- [License](#license)

## 🔍 Overview

Pegada is a full-stack application with React Native mobile app, Next.js web frontend, and backend services.

## 🏗️ Project Structure

The project uses a monorepo architecture with pnpm workspaces:

```
pegada/
├── apps/                # Application implementations
│   ├── mobile/          # React Native mobile app
│   ├── nextjs/          # Next.js web application
│   └── queue/           # Queue processing service
├── packages/            # Shared code and modules
│   ├── api/             # API interfaces and logic
│   ├── database/        # Database models and queries
│   └── shared/          # Common utilities and types
└── tools/               # Development and build tools
```

## 🚀 Getting Started

1. **Prerequisites**

   - [Node.js](https://nodejs.org/) (see .nvmrc for version)
   - [pnpm](https://pnpm.io/) v9.6.0+

2. **Clone the repository**

   ```sh
   git clone https://github.com/GSTJ/pegada.git
   cd pegada
   ```

3. **Install dependencies**

   ```sh
   pnpm install
   ```

## 💻 Development

Starting specific applications:

```sh
# Start Next.js web app
pnpm nextjs dev

# Start mobile app
pnpm mobile start

# Start backend queue service
pnpm queue dev

# Start everything at once
pnpm start:everything
```

Other useful commands:

```sh
# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Formatting
pnpm format
```

## 🔧 Technologies

- **Frontend**: React, React Native, Next.js, TypeScript
- **Styling**: Tailwind CSS, styled-components
- **State Management**: React Redux
- **Animation**: React Native Reanimated
- **Infrastructure**: Turbo, pnpm workspaces
- **Testing**: Jest, React Testing Library

## 👥 Contributing

Please read our [Contributing Guide](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md) before submitting a pull request.

## 📄 License

This project is licensed under the [Creative Commons CC0 License](./LICENSE).
