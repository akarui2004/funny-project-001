# Installation

Backend for Funny Project 001: Node.js + Express 5 + TypeScript, PostgreSQL via Sequelize, Redis via ioredis.

## Prerequisites

- Node.js `22.22.0` (see `.node-version`)
- Yarn 1.x (the repo uses `yarn.lock`)
- PostgreSQL
- Redis. The app connects to two logical DBs (`master` on db 0, `queue` on db 1); both default to `localhost:6379`

## Setup

```bash
yarn install
cp .env.example .env
```

`.env` holds `NODE_ENV` and the `LOG_*` logger settings (see `.env.example`).

Put local database credentials in an ignored override file, not in committed TOML:

```toml
# config/development.local.toml
[datasource.master]
  username = "postgres"
  password = "postgres"
  database = "fund_project_dev"
```

Startup fails fast if `username` or `password` is empty. Config merge order and the full schema are in
[configuration.md](configuration.md).

## Database

```bash
yarn db:migrate          # apply migrations (src/db/migrations)
yarn db:migrate:undo     # revert the last migration
```

`yarn db:migrate` does not load `.env`. For a non-development environment, set `NODE_ENV` in the shell:
`NODE_ENV=staging yarn db:migrate`. See [database-config-loader.md](../database/database-config-loader.md).

## Running

```bash
yarn dev      # nodemon + ts-node, reloads on src/**/*.ts and *.toml changes
yarn start    # clean, build, then run the compiled server.js
```

The server listens on `env.port` (default `3000`). Logs go to the console and to `logs/<prefix>-<date>.log`.

## Project Structure

```
config/                  TOML config: base -> <env> -> <env>.local (ignored)
src/
├── server.ts            bootstrap() / shutdown()
├── app/
│   ├── config/          TOML loader + Zod schemas
│   └── connections/     appDb (Sequelize), appRedis (ioredis)
├── db/
│   ├── migrations/
│   ├── migration-blueprint.ts   column helpers for migrations
│   └── sequelize-cli-config.cjs Sequelize CLI config (via .sequelizerc)
├── constants/
└── utils/logger.ts      winston logger, createModuleLogger()
scripts/                 console (REPL) and DB script stubs
docs/                    project docs, start with the reading order in README.md
```

## Other Scripts

- `yarn build`: compile TypeScript
- `yarn console`: Node REPL with `.env` loaded
- `yarn db:migration:create`: available via `scripts/db/migration-cli.ts`; seeder creation is not implemented yet
