# Project Structure

## Directory Layout

```text
.
├── config/            # TOML runtime config (base -> <env> -> <env>.local)
├── docs/              # Evergreen docs (setup/, database/, architecture/)
├── logs/              # Winston output (git-ignored, .gitkeep only)
├── scripts/           # Dev CLI tools (not shipped in dist)
│   ├── base-cli.ts
│   ├── console.ts
│   └── db/            # migrate-cli (up/down/status), migration-cli (empty file)
├── src/
│   ├── server.ts      # Entry point
│   ├── app/           # Runtime wiring: config + connections
│   ├── constants/     # Static values (defaults, environments, logging)
│   ├── db/            # migrations, blueprint helpers, Kysely migration runner
│   └── utils/         # Logger, project-root resolver
└── tests/             # Empty, no test runner configured yet
```

## Module Dependencies

```mermaid
flowchart TD
    server["src/server.ts"] --> app["src/app"]
    app --> config["app/config-loader<br/>(Zod schemas + TOML loader)"]
    app --> conn["app/connections<br/>(database.ts, redis.ts)"]

    config --> constants["src/constants<br/>(defaults, environments, logging)"]
    conn --> config
    conn --> utils["src/utils<br/>(logger)"]
    server --> utils
    server --> constants
    config --> utils

    constants --> root["utils/resolve-project-root<br/>(.app_root marker)"]
    utils --> constants

    subgraph db["src/db"]
        runner["migration-runner.ts"]
        blueprint["migration-blueprint.ts"]
        migrations["migrations/"]
    end

    runner -. requires .-> migrations
    migrations --> blueprint

    subgraph scripts["scripts/ (dev only)"]
        base["base-cli.ts"]
        mig["db/migration-cli.ts"]
        migrate["db/migrate-cli.ts"]
    end

    mig --> base
    mig -. writes .-> migrations
    migrate --> base
    migrate --> conn
    migrate --> runner
```

Note: `constants/defaults.ts` imports `src/utils/resolve-project-root` directly, not the
`src/utils` barrel, because the barrel re-exports the logger, which imports `src/constants`.
