# Phase 3: Docs And Repo Hygiene (priority 3)

## Context
README is jokey and stale (clone URL `funny-project-001`, `npm start`, Sequelize CLI dump). `docs/configuration.md` (240 lines) vs `docs/environment-configuration.md` (76) may overlap, unverified. `.gitignore` still has `.commandcode` entries. `docs/todos.md` is 3 unstructured lines. Dependencies: dev-only tools sit in `dependencies`; `@types/node` ^26 vs `.node-version` 22.22.0; no `engines`; `resolutions.uuid ^11` vs `dependencies.uuid ^14` with no `uuid` import in `src/` or `scripts/` (unused; ids use `randomUUID` from `node:crypto`).

## Requirements
- README: correct yarn commands, repo/URL, links to `docs/installation.md`, `docs/project-structure.md`; tone is anh's call
- Read both config docs; merge or cross-link, no duplicated facts
- Clean `.gitignore`
- `docs/todos.md`: checklist or delete once phase 2 lands
- Dependency housekeeping: `@types/node` to ^22, add `engines.node >=22`, drop unused `uuid` (check `yarn why uuid` first), move dev-only packages (typescript, ts-node, tsx, nodemon, sequelize-cli, tsconfig-paths, commander, mustache, pluralize, ansis, date-fns) to `devDependencies` **only if** nothing under `src/` imports them at runtime
- Record decision "no ESLint/Prettier" in `docs/code-standards.md`

## Steps
1. Housekeeping first; verify with a production-style install, then `yarn build` and boot the compiled server
2. Docs edits, then check every command in README runs
3. Optional: rename GitHub repo, `git remote set-url`, fix README URL

## Validation
Follow README from a clean clone. `yarn build` passes.

## Risks
- Moving a runtime dep to dev breaks production start. Note `start` runs `yarn clean && yarn build`, which itself needs typescript and tsc-alias in the prod image, so keep those in `dependencies` or change `start`.
- Repo rename: GitHub redirects old URLs; update local remotes.
