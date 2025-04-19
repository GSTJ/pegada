# Pegada API Package

Shared API client and endpoints for the Pegada project.

## Overview

This package provides a consistent way to interact with APIs across different applications in the monorepo. It includes:

- API client configuration
- Endpoint definitions
- Request and response types
- Error handling

## Usage

Import and use in other packages or applications:

```typescript
import { api, endpoints } from "@pegada/api";

// Example API call
const data = await api.get(endpoints.users.getProfile);
```

## Project Structure

```
src/
├── client/             # API client configuration
├── endpoints/          # API endpoint definitions
├── types/              # Request and response type definitions
└── utils/              # Utility functions for API calls
```

## Development

```bash
# From the monorepo root
pnpm api build

# Run tests
pnpm api test
```

## Integration

This package is designed to be used by:

- The Next.js web application
- The React Native mobile app
- The queue service
- Other shared packages as needed
