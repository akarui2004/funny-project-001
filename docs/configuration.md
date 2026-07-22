# Configuration

This document describes the configuration options available in `base.toml`.

## Overview

| Section | Description |
|---------|-------------|
| `[env]` | Server environment settings |
| `[datasource]` | Database connection configuration (supports multiple named sources) |
| `[redis]` | Redis connection configuration (supports multiple named instances) |
| `[logging]` | Logging configuration |

---

## [env]

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `port` | number | `3000` | The port number on which the server will listen for incoming requests. |

---

## [datasource]

Supports multiple named datasources. Each datasource has its own subsection (e.g., `[datasource.master]`, `[datasource.replica]`).

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `dialect` | string | — | The type of database being used (e.g., `postgres`). |
| `host` | string | `"localhost"` | The host name or IP address of the database server. |
| `port` | number | `5432` | The port number on which the database server is listening. |
| `schema` | string | `"public"` | The database schema to be used. |
| `username` | string | `""` | The username for authenticating with the database. |
| `password` | string | `""` | The password for authentication with the database. |

### [datasource.\<name\>.pool]

Connection pool settings.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `max` | number | `10` | The maximum number of connections in the connection pool. |
| `min` | number | `0` | The minimum number of connections in the connection pool. |
| `acquireTimeout` | number | `30000` | Max time (ms) to try to get a connection before throwing an error. |
| `idle` | number | `10000` | Max time (ms) that a connection can be idle before being released. |

### [datasource.\<name\>.option]

Additional connection options.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `ssl` | boolean | `false` | Whether to use SSL for the database connection. |
| `connectionTimeout` | number | `60000` | The maximum time (ms) to wait for a connection to be established before timing out. |

---

## [redis]

Supports multiple named Redis instances. Each instance has its own subsection (e.g., `[redis.master]`, `[redis.queue]`).

### [redis.\<name\>]

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `host` | string | `"localhost"` | The host name or IP address of the Redis server. |
| `port` | number | `6379` | The port number on which the Redis server is listening. |
| `keyPrefix` | string | — | The key prefix for all Redis keys (e.g., `"app:"`, `"queue:"`). |
| `db` | number | `0` | The Redis database number. |

### [redis.\<name\>.option]

Connection options for Redis.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `connectionTimeout` | number | `60000` | The maximum time (ms) to wait for a connection to be established. |
| `keepAlive` | number | `30000` | Idle connection timeout (ms). |
| `maxRetriesPerRequest` | number | `5` | Number of retries for a failed command. |

---

## [logging]

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `path` | string | `"logs"` | The directory where log files will be stored. |
| `baseFileName` | string | `"app"` | The base name for log files. |
| `level` | string | `"info"` | The default log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`). |

### [logging.rotatingFile]

Log rotation settings.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `frequency` | string | `"daily"` | How often to rotate log files (`daily`, `hourly`). |
| `size` | string | `"100m"` | Maximum size of a log file before rotation (e.g., `"100m"`, `"1g"`). |

### [logging.rotatingFile.limit]

Limits for log file retention.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `count` | number | `30` | Maximum number of log files to keep. |

---

## Configuration Loading & Override Order

The configuration loader merges files in a strict precedence order. Later layers override earlier ones for any key they define.

### Layer Order (lowest → highest precedence)

```
base.toml
   ↓ overridden by
<environment>.toml          (e.g. development.toml, staging.toml, production.toml)
   ↓ overridden by
<environment>.local.toml     (e.g. development.local.toml, production.local.toml)
```

### Rules

1. **`base.toml`** — defaults shared by every environment. Defines sane defaults + structural schema (pool sizes, log rotation, etc.).
2. **`<environment>.toml`** — environment-specific overrides committed to the repo (e.g. `development.toml`, `staging.toml`, `production.toml`).
3. **`<environment>.local.toml`** — local, machine-specific overrides. **Never committed to git** (must be listed in `.gitignore`). Use it for personal credentials, ports, or paths on a single dev's machine.

### Active Environment

The active environment is determined by `NODE_ENV` (or the equivalent env var used by the config loader). For example:

| `NODE_ENV`     | Files merged                                  |
|----------------|-----------------------------------------------|
| `development`  | `base.toml` → `development.toml` → `development.local.toml` |
| `staging`      | `base.toml` → `staging.toml` → `staging.local.toml`         |
| `production`   | `base.toml` → `production.toml` → `production.local.toml`   |

### Merge Semantics

- **Deep merge** for TOML tables: a key defined in `development.toml` only overrides that specific key — siblings from `base.toml` remain intact.
- **Array / list replacement**: arrays are replaced wholesale, not merged element-wise.
- **Missing file = skipped**: if `development.local.toml` doesn't exist, the loader simply moves on to the next layer.

### Typical Workflow

```bash
# 1. base.toml is shared and committed
cat config/base.toml

# 2. Pick (or create) your environment file
cat config/development.toml        # committed, team-wide dev config

# 3. Create a local override (gitignored) for your own machine
cat > config/development.local.toml <<'EOF'
[datasource.master]
  username = "minh"
  password = "my_local_pg_pw"

[redis.master]
  port = 6380                     # I run Redis on a non-default port locally
EOF

# 4. Run the app — loader merges base → development → development.local
NODE_ENV=development node dist/main.js
```

### `.gitignore` Recommendation

Add these to `.gitignore` so local overrides never leak:

```gitignore
config/*.local.toml
config/.*.local.toml
```

---

## Examples

### Development

```toml
[env]
  port = 3000

[datasource.master]
  dialect = "postgres"
  host = "localhost"
  port = 5432
  username = "dev"
  password = "dev"
  [datasource.master.pool]
    max = 10
    min = 0
    acquireTimeout = 30000
    idle = 10000
  [datasource.master.option]
    ssl = false
    connectionTimeout = 60000

[redis.master]
  host = "localhost"
  port = 6379
  keyPrefix = "app:"
  db = 0
  [redis.master.option]
    connectionTimeout = 60000
    keepAlive = 30000
    maxRetriesPerRequest = 5

[redis.queue]
  host = "localhost"
  port = 6379
  keyPrefix = "queue:"
  db = 1
  [redis.queue.option]
    connectionTimeout = 60000
    keepAlive = 30000
    maxRetriesPerRequest = 5

[logging]
  path = "logs"
  baseFileName = "app"
  level = "info"
  [logging.rotatingFile]
    frequency = "daily"
    size = "100m"
    [logging.rotatingFile.limit]
      count = 30
```

### Production

```toml
[env]
  port = 8080

[datasource.master]
  host = "db.production.internal"
  port = 5432
  username = "app_user"
  password = "${DB_PASSWORD}"
  [datasource.master.option]
    ssl = true
    connectionTimeout = 30000

[redis.master]
  host = "redis.production.internal"
  port = 6379
  keyPrefix = "app:"
  db = 0
  [redis.master.option]
    connectionTimeout = 10000
    keepAlive = 30000
    maxRetriesPerRequest = 3

[redis.queue]
  host = "redis.production.internal"
  port = 6379
  keyPrefix = "queue:"
  db = 1
  [redis.queue.option]
    connectionTimeout = 10000
    keepAlive = 30000
    maxRetriesPerRequest = 3

[logging]
  path = "/var/log/app"
  baseFileName = "app"
  level = "warn"
  [logging.rotatingFile]
    frequency = "daily"
    size = "1g"
    [logging.rotatingFile.limit]
      count = 14
```

## Notes

- `[datasource]` (singular) holds one or more named database connections; there is no top-level `source` selector — pick the named source your application code expects (e.g., `master`).
- `[redis]` has no top-level `source` selector; the application code chooses which named instance to use (`master`, `queue`, etc.).
