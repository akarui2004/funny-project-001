# Backend - Funny Project 001

A Node.js/Express backend application with TypeScript, Sequelize ORM, and PostgreSQL.

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript 5.9
- **Framework**: Express 5
- **ORM**: Sequelize 6
- **Database**: PostgreSQL
- **Cache**: Redis
- **Logging**: Pino
- **Config**: TOML files with Zod validation

## Project Structure

```
backend/
├── config/                 # Configuration files
│   ├── base.toml          # Base configuration (defaults)
│   ├── development.toml  # Development overrides
│   └── datasource/        # Datasource-specific configs
├── src/
│   ├── setup.ts         # App initialization
│   ├── server.ts        # Entry point
│   └── app/
│       ├── config/     # Configuration loader
│       ├── db/          # Database migrations & seeders
│       ├── helpers/     # Helper utilities
│       ├── loaders/     # Data loaders (datasource, etc.)
│       ├── models/      # Database models
│       ├── schemas/     # Zod schemas for validation
│       └── utils/       # Utilities (logger, etc.)
├── scripts/
│   └── db/
│       ├── createMigration.ts   # Migration generator script
│       └── genConfig.ts        # Config generator script
├── logs/                  # Application logs
└── docs/                  # Documentation
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 6+

### Installation

```bash
npm install
# or
yarn install
```

### Configuration

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Edit `config/development.toml` with your database credentials:

```toml
[datasources.default]
username = "your_username"
password = "your_password"
```

### Running

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

The server runs on port 3000 by default.

## Configuration System

The app loads config from TOML files in this order:

1. `config/base.toml` - Base defaults
2. `config/{NODE_ENV}.toml` - Environment-specific (e.g., development.toml)
3. `config/local.toml` - Local overrides (gitignored)

### Database Migrations

```bash
# Generate a new migration
npm run migration:create -- --name users_table
```

This creates a migration file in `src/app/db/migrations/`.

## Scripts

- `npm run script` - Run TypeScript scripts directly
- `npm run migration:create` - Generate new migration files

## API Documentation

Refer to `docs/` directory for detailed documentation:
- [Configuration Guide](docs/configuration.md)
- [Environment Setup](docs/environment-configuration.md)