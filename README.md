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

#### ORM
We utilize `Sequelize` for object-relational mapping. For the `migration/seeder/model`, we are using the `sequelize-cli` for these:
```
Sequelize CLI [Node: 10.21.0, CLI: 6.0.0, ORM: 6.1.0]

sequelize <command>

Commands:
  sequelize db:migrate                        Run pending migrations
  sequelize db:migrate:schema:timestamps:add  Update migration table to have timestamps
  sequelize db:migrate:status                 List the status of all migrations
  sequelize db:migrate:undo                   Reverts a migration
  sequelize db:migrate:undo:all               Revert all migrations ran
  sequelize db:seed                           Run specified seeder
  sequelize db:seed:undo                      Deletes data from the database
  sequelize db:seed:all                       Run every seeder
  sequelize db:seed:undo:all                  Deletes data from the database
  sequelize db:create                         Create database specified by configuration
  sequelize db:drop                           Drop database specified by configuration
  sequelize init                              Initializes project
  sequelize init:config                       Initializes configuration
  sequelize init:migrations                   Initializes migrations
  sequelize init:models                       Initializes models
  sequelize init:seeders                      Initializes seeders
  sequelize migration:generate                Generates a new migration file      [aliases: migration:create]
  sequelize model:generate                    Generates a model and its migration [aliases: model:create]
  sequelize seed:generate                     Generates a new seed file           [aliases: seed:create]

Options:
  --version  Show version number                                                  [boolean]
  --help     Show help                                                            [boolean]

Please specify a command
```

## Contributing
Pull requests welcome if you're in the mood too! Fork away 🎊.

## 📚 Documentation — Read These First

Before touching any code, **read the docs in this order**. Each doc builds on the previous one, so skipping ahead will leave you guessing.

| # | Doc | Why read it first |
|---|-----|-------------------|
| 1 | [docs/configuration.md](docs/configuration.md) | Master reference for the layered TOML config system (`base.toml` → `<env>.toml` → `<env>.local.toml`). Covers the full schema: `env`, `datasource`, `redis`, `logging`. **Read this first** — every other doc assumes you understand the layered override order. |
| 2 | [docs/environment-configuration.md](docs/environment-configuration.md) | Explains how `NODE_ENV` and `.env` files are loaded via `dotenv`. Tells you which env vars exist and how to set them locally. |
| 3 | [docs/database-config-loader.md](docs/database-config-loader.md) | Deep-dive on `src/config/database.mts` — the file Sequelize CLI loads through `.sequelizerc`. Explains how the layered TOML config gets merged into a Sequelize-CLI-shaped object, validation, and failure modes. |
| 4 | [docs/sequelize-and-sequelize-cli-relationship.md](docs/sequelize-and-sequelize-cli-relationship.md) | The big-picture diagram showing how `sequelize-cli` (dev-time) and the `sequelize` library (run-time) share the same `config/`, `models/`, and `migrations/` folders. Read this to understand *where* a change belongs. |

### Quick mental model

```
┌─────────────────────────────────────────────────────────┐
│  docs/configuration.md                                  │
│  → the layered TOML config system (base/env/local)      │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│  docs/environment-configuration.md                      │
│  → how NODE_ENV + .env are loaded                       │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│  docs/database-config-loader.md                         │
│  → how src/config/database.mts turns TOML into         │
│    a Sequelize CLI config object                        │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│  docs/sequelize-and-sequelize-cli-relationship.md       │
│  → how CLI (dev) and sequelize lib (runtime) share      │
│    config/, models/, migrations/, seeders/              │
└─────────────────────────────────────────────────────────┘
```

> 💡 **TL;DR** — config docs explain *what* the system does; the relationship diagram explains *why* everything lives where it does. Read in order, then dig into code.

## License
MIT License—use freely, just don't blame me if it's half-baked [web:2].