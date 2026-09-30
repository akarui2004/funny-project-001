# Phase 5: CI Pipeline (deferred, lowest priority)

## Context
Decision by anh: skip CI for now to avoid build/run cost. Nothing to do until this is revisited.

## Zero-cost alternative (when tests exist)
Local pre-push hook: `git config core.hooksPath .githooks`, `.githooks/pre-push` runs `yarn build && yarn test`. No service, no minutes.

## If CI is wanted later
- One workflow, trigger `pull_request` to `main` only, Node 22, `yarn install --frozen-lockfile`, build, test
- Cost limiters: `concurrency` with cancel-in-progress, yarn cache, no matrix, no scheduled runs
- Public repos: Actions minutes free. Private: free tier is limited, check plan
- Migration job (Postgres + Redis service containers) only if wanted; keep separate so it can be disabled

## Files
`.github/workflows/ci.yml` or `.githooks/pre-push`
