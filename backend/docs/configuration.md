# Configuration

This document describes the configuration options available in `base.toml`.

## Overview

| Section | Description |
|---------|-------------|
| `[env]` | Server environment settings |
| `[datasources]` | Database connection configuration |
| `[redis]` | Redis connection configuration |

---

## [env]

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `listenPort` | number | `3000` | The port number on which the server will listen for incoming requests. |

---

## [datasources]

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `source` | string | `"default"` | The name of the default datasource to be used by the application. |

---

## [datasources.\<name\>]

Supports multiple datasources. Each datasource has its own section (e.g., `[datasources.default]`, `[datasources.replica]`).

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `dialect` | string | — | The type of database being used (e.g., `postgresql`, `mysql`, `sqlite`). |
| `host` | string | `"localhost"` | The host name or IP address of the database server. |
| `port` | number | `5432` | The port number on which the database server is listening. |
| `schema` | string | `"public"` | The database schema to be used. |
| `database` | string | — | The name of the database to connect to. |
| `username` | string | — | The username for authenticating with the database. |
| `password` | string | — | The password for authentication with the database. |

### [datasources.\<name\>.pool]

Connection pool settings.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `max` | number | `10` | The maximum number of connections in the connection pool. |
| `min` | number | `0` | The minimum number of connections in the connection pool. |
| `acquire` | number | `30000` | Max time (ms) to try to get connection before throwing error. |
| `idle` | number | `10000` | Max time (ms) that a connection can be idle before being released. |

### [datasources.\<name\>.options]

Additional connection options.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `ssl` | boolean | `false` | Whether to use SSL for the database connection. |
| `connectTimeout` | number | `60000` | The maximum time (ms) to wait for a connection to be established before timing out. |

---

## [redis]

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `source` | string | `"main"` | The name of the default Redis instance to be used by the application. |

---

## [redis.\<name\>]

Supports multiple Redis instances. Each instance has its own section (e.g., `[redis.main]`, `[redis.queue]`).

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `host` | string | `"localhost"` | The host name or IP address of the Redis server. |
| `port` | number | `6379` | The port number on which the Redis server is listening. |
| `keyPrefix` | string | `""` | The key prefix for all Redis keys (e.g., `"fp-api:"`). |
| `db` | number | `0` | The Redis database number (0-15). |

### [redis.\<name\>.options]

Connection options for Redis.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `connectTimeout` | number | `5000` | The maximum time (ms) to wait for a connection. |
| `keepAlive` | number | `5000` | Idle connection timeout (ms). |
| `enableReadyCheck` | boolean | `true` | Check connection readiness before commands. |
| `maxRetriesPerRequest` | number | `3` | Number of retries for a failed command. |

---

## Usage

1. Copy `config/base.toml` to `config/local.toml` or `config/production.toml`
2. Override values as needed for your environment
3. The configuration loader will merge configs in order: `base.toml` → `<environment>.toml`

## Examples

### Development

```toml
[env]
  listen_port = 3000

[datasources]
  source = "default"

  [datasources.default]
    host = "localhost"
    port = 5432
    username = "dev"
    password = "dev"

[redis]
  source = "main"

  [redis.main]
    host = "localhost"
    port = 6379
    keyPrefix = "fp-dev:"
    db = 0

    [redis.main.options]
      connectTimeout = 5000
      keepAlive = 5000
      enableReadyCheck = true
      maxRetriesPerRequest = 3
```

### Production

```toml
[env]
  listen_port = 8080

[datasources]
  source = "default"

  [datasources.default]
    host = "db.production.internal"
    port = 5432
    database = "funny_project_prod"
    username = "app_user"

    [datasources.default.options]
      ssl = true
      connectTimeout = 30000

[redis]
  source = "main"

  [redis.main]
    host = "redis.production.internal"
    port = 6379
    keyPrefix = "fp-prod:"
    db = 0

    [redis.main.options]
      connectTimeout = 10000
      enableReadyCheck = true
      maxRetriesPerRequest = 3
```