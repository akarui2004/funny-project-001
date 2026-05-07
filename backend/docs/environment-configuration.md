# Environment Configuration Guide

## Overview

This project uses `dotenv` to load environment variables from `.env` files. All environment variables are automatically available via `process.env`, including `NODE_ENV` and any custom variables defined in the `.env` file.

## How It Works

### Loading Mechanism

The project uses `dotenv` via the `-r dotenv/config` flag in both the script and nodemonConfig:

```json
{
  "script": "ts-node -r dotenv/config -r tsconfig-paths/register",
  "nodemonConfig": {
    "exec": "ts-node -r dotenv/config -r tsconfig-paths/register src/server.ts"
  }
}
```

When `ts-node` runs with `-r dotenv/config`, it:
1. Loads `.env` file from the project root
2. Sets all variables as `process.env` properties
3. Makes all variables available immediately

### Accessing Environment Variables

```typescript
// Access any environment variable
const nodeEnv = process.env.NODE_ENV;
const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env.API_KEY;
```

## Environment Files

| File | Purpose |
|------|---------|
| `.env` | Local development (not committed to git) |
| `.env.example` | Template with required variables |

See `.env.example` for the list of required environment variables.

## Usage

```bash
# Development (default)
yarn script

# With custom environment
NODE_ENV=production DATABASE_URL=postgres://localhost:5432/mydb yarn script
```

## NODE_ENV (Common Example)

`NODE_ENV` is a common convention for specifying the runtime environment:

| Value | Purpose |
|-------|---------|
| `development` | Local development (default) |
| `production` | Production server |
| `test` | Test runs |

```typescript
// Example usage
if (process.env.NODE_ENV === 'production') {
  // Production-specific logic
}
```

## Integration Notes

- `dotenv` loads variables at runtime before any application code runs
- The `-r` flag ensures this happens before your code, so all `process.env` variables are available immediately
- No manual `require('dotenv').config()` call needed
- Add new environment variables to both `.env` (local) and `.env.example` (committed template)