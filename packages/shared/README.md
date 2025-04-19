# Pegada Shared Package

Common utilities, types, and constants for the Pegada project.

## Overview

This package provides shared code that can be used across all applications and packages in the monorepo. It includes:

- Common types
- Utility functions
- Constants
- Helpers for various tasks

## Usage

Import and use in other packages or applications:

```typescript
import type { User } from "@pegada/shared/types";
import { formatDate, validateEmail } from "@pegada/shared/utils";
```

## Project Structure

```
src/
├── constants/          # Shared constants
├── types/              # Common type definitions
├── utils/              # Utility functions
│   ├── date/           # Date formatting and manipulation
│   ├── validation/     # Validation helpers
│   └── ...             # Other utility categories
└── hooks/              # React hooks (if applicable)
```

## Development

```bash
# From the monorepo root
pnpm shared build

# Run tests
pnpm shared test
```

## Best Practices

- Keep this package lightweight and focused on truly shared functionality
- Avoid dependencies that are specific to one platform
- Write platform-agnostic code when possible
- Include comprehensive tests for all utilities
- Document functions and types thoroughly
