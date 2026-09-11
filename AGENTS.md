# AGENTS.md

## Overview

wp-deployer is a CLI tool that deploys WordPress plugins and themes to WordPress.org SVN. ESM-only Node.js project using neostandard (ESLint) and the built-in test runner.

## Setup

Requires Node 22+.

```sh
npm ci
```

## Commands

```sh
npm run lint          # Check with ESLint (neostandard)
npm run format        # Auto-fix lint issues
npm test              # Run all tests (node --test)
node --test test/config.test.js   # Run a single test file
```

## Conventions

- **neostandard** — ESLint flat config (`eslint.config.mjs`). No semicolons, 2-space indent.
- **ESM only** — `"type": "module"` in package.json. All imports must use `.js` extensions.
- **Pipeline architecture** — config resolution → preflight checks → sequential steps. Each step is an `async (settings) => settings` function. Errors abort the pipeline.
- **Error handling** — `DeployError` carries explicit exit codes: `EXIT_SUCCESS=0`, `EXIT_CONFIG=1`, `EXIT_RUNTIME=2`, `EXIT_SIGINT=130`.
- **Shell safety** — Validators in `lib/validators/` guard against shell-unsafe characters before any `exec()` call.

## Architecture

Pipeline flow: `index.js` → `lib/config-source.js` → `lib/config.js` → `lib/preflight.js` → `lib/steps.js`. Each step is `async (settings) => settings`. Errors abort the pipeline.

- **Plugin deploy**: checks out `trunk/` (and optionally `assets/`), clears, copies build, runs `svn add`/`svn delete`, commits, then `svn copy trunk/ tags/<version>/`.
- **Theme deploy**: wipes SVN path, checks out full repo, copies `earlierVersion` to `newVersion`, clears new tag dir, copies build, adds/deletes, commits.

## Quality Gate

Every task must end with:
1. `npm run format` then `npm run lint` — must exit clean
2. `npm test`
