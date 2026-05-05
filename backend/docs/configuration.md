# Configuration

This document describes the configuration options available in `base.toml`.

## Overview

| Section | Description |
|---------|-------------|
| `[env]` | Server environment settings |
| `[datasources]` | Database connection configuration |

---

## [env]

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `listen_port` | number | `3000` | The port number on which the server will listen for incoming requests. |

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
```