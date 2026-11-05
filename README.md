# My Fun Side Project 😂🎉

> **This is just a fun side project 😂🎉, so it might get finished—or not—depending on my mood 😎🫤💤.**

## Overview
A casual hobby repo built purely for entertainment. No deadlines, no pressure—just vibes and code when the inspiration hits.

## Features
- Whatever whims strike (TBD 😏)
- Emoji-powered motivation 💥

## Getting Started
1. Clone the repo: `git clone https://github.com/akarui2004/funny-project-001.git`
2. `cd funny-project-001`
3. Run it... eventually? `npm start` or equivalent (if added)

## Tech Stack

### Programing
```
  Node.js 🤪
```

### Database
```
Data Layer Mood Swings:
├── PostgreSQL 🧠 (when I pretend to be serious)
└── Redis ⚡ (for that sweet sweet caching dopamine)
```

#### Database access
We use [Kysely](https://kysely.dev) (typed SQL query builder over `pg`) and its `Migrator`:
```
yarn db:migrate                          Apply all pending migrations
yarn db:migrate:undo [--source <name>]   Undo the last migration of one source (default: platform)
yarn db:migrate:status                   List executed / pending migrations
yarn db:migration:create <table> -c ...  Scaffold a create-table migration
```
See [docs/database/kysely-and-migrations.md](docs/database/kysely-and-migrations.md).

## Contributing
Pull requests welcome if you're in the mood too! Fork away 🎊.

## 📚 Documentation — Read These First

Before touching any code, **read the docs in this order**. Each doc builds on the previous one, so skipping ahead will leave you guessing.

| # | Doc | Why read it first |
|---|-----|-------------------|
| 1 | [docs/setup/configuration.md](docs/setup/configuration.md) | Master reference for the layered TOML config system (`base.toml` → `<env>.toml` → `<env>.local.toml`). Covers the full schema: `env`, `datasource`, `redis`. **Read this first** — every other doc assumes you understand the layered override order. |
| 2 | [docs/setup/environment-configuration.md](docs/setup/environment-configuration.md) | Explains how `NODE_ENV` and `.env` files are loaded via `dotenv`. Tells you which env vars exist and how to set them locally. |
| 3 | [docs/database/kysely-and-migrations.md](docs/database/kysely-and-migrations.md) | How `appDb` builds a Kysely + `pg` pool from the TOML datasource, how the migration CLI reuses it, migration sources, file format, blueprint helpers, and troubleshooting. |

### Quick mental model

```
┌─────────────────────────────────────────────────────────┐
│  docs/setup/configuration.md                                  │
│  → the layered TOML config system (base/env/local)      │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│  docs/setup/environment-configuration.md                      │
│  → how NODE_ENV + .env are loaded                       │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│  docs/database/kysely-and-migrations.md                 │
│  → how appDb (runtime) and the migrate CLI share one    │
│    Kysely connection, migrations, blueprint helpers     │
└─────────────────────────────────────────────────────────┘
```

> 💡 **TL;DR** — config docs explain *what* the system does; the database doc explains how data access and migrations fit on top. Read in order, then dig into code.

## License
MIT License—use freely, just don't blame me if it's half-baked [web:2].