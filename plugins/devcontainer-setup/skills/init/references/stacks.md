# Stack reference

Official templates live at `ghcr.io/devcontainers/templates/<id>`. Official features live at `ghcr.io/devcontainers/features/<id>:<major>`.

## Template per detected stack

| Detected | Template id | Notes |
|---|---|---|
| Node + TypeScript (Next, Vite, Vue, Nuxt, Angular) | `typescript-node` | Node and the TypeScript compiler are in the image |
| Node, plain JavaScript | `javascript-node` | |
| Node + Postgres / Mongo needed | `javascript-node-postgres`, `javascript-node-mongo` | Adds a database service via compose |
| Python | `python` | |
| .NET | `dotnet` | `dotnet-postgres` or `dotnet-mssql` when a database is needed; `dotnet-fsharp` for F# |
| PHP | `php` | |
| PHP + database (WordPress, WooCommerce, Laravel) | `php-mariadb` | Gives PHP plus MariaDB. It does not install WordPress itself; add WordPress as a compose service or with a project tool |
| Rust | `rust` | `rust-postgres` with a database |
| Go | `go` | `go-postgres` with a database |
| Java or Kotlin (Gradle or Maven) | `java` | `java-postgres` with a database. Kotlin uses the same JDK image |
| Project already has docker-compose.yml | `docker-existing-docker-compose` | Reuses the existing compose services |
| Project needs to run docker itself (deploy tooling, compose stacks) | `docker-outside-of-docker` | Or add the feature `ghcr.io/devcontainers/features/docker-outside-of-docker:1` to another template |
| Flutter / Dart | none official | Use the fallback skeleton with a base image, and install Flutter in `postCreateCommand`. Treat as web, analysis and test work; Android emulators and device builds generally do not work inside a container |

## Per-stack defaults

| Stack | postCreateCommand | Extensions |
|---|---|---|
| Node (npm) | `npm ci` | `dbaeumer.vscode-eslint`, `esbenp.prettier-vscode` |
| Node (pnpm) | `corepack enable && pnpm install` | same |
| Node (yarn) | `corepack enable && yarn install` | same |
| Node (bun) | `bun install` (needs a Bun install step) | same |
| Vue / Nuxt | as above | add `Vue.volar` |
| Python | `pip install -r requirements.txt` (or `pip install -e .` for pyproject) | `ms-python.python`, `ms-python.vscode-pylance`, `charliermarsh.ruff` |
| .NET | `dotnet restore` | `ms-dotnettools.csdevkit` |
| PHP | `composer install` | `bmewburn.vscode-intelephense-client`, `xdebug.php-debug` |
| Rust | `cargo fetch` | `rust-lang.rust-analyzer` |
| Go | `go mod download` | `golang.go` |
| Java | `./gradlew build -x test` or `mvn -q -DskipTests package` | `vscjava.vscode-java-pack` |
| Kotlin | as Java | add `fwcs.kotlin` |
| Flutter | `git clone https://github.com/flutter/flutter.git -b stable $HOME/flutter && echo 'export PATH="$HOME/flutter/bin:$PATH"' >> $HOME/.bashrc && $HOME/flutter/bin/flutter pub get` | `Dart-Code.dart-code`, `Dart-Code.flutter` |

Use only what applies. Skip `postCreateCommand` entries for lockfile types the project does not have.

## Fallback skeleton (when the CLI or registry is unavailable)

```jsonc
{
  "name": "<project folder name>",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": {},
  "forwardPorts": [],
  "postCreateCommand": "",
  "customizations": {
      "vscode": {
          "extensions": []
      }
  }
}
```

Add the matching official feature for the stack under `features` (for example `ghcr.io/devcontainers/features/node:1`, `python:1`, `dotnet:2`, `java:1`, `php:1`, `rust:1`, `go:1`).

## Claude Code inside the container (optional)

Feature, placed after any Node feature:

```jsonc
"features": {
  "ghcr.io/anthropics/devcontainer-features/claude-code:1.0": {}
}
```

Optional volume so the login and settings survive rebuilds. The target path depends on `remoteUser`: base images use `vscode`, the Node images use `node`. Check the generated file first.

```jsonc
"mounts": [
  "source=claude-config-${devcontainerId},target=/home/vscode/.claude,type=volume"
]
```
