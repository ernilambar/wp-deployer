# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm test                          # Run all tests
node --test test/config.test.js   # Run a single test file
npm run lint                      # Check with StandardJS
npm run lint:fix                  # Auto-fix lint issues
```

Node 22+ is required.

## Quality Gate

Every task must end with:
1. `npm run lint:fix` then `npm run lint` — must exit clean
2. `npm test`

## Architecture

**wp-deployer** is a CLI tool (`index.js`) that deploys WordPress plugins and themes to WordPress.org SVN. It runs as a pipeline: resolve config → preflight checks → execute sequential steps.

### Pipeline flow

1. `index.js` — Entry point. Parses CLI flags (`--assets`, `--dry-run`, `--config`), reads `package.json` from CWD, calls `loadConfigSource()` then `resolveSettings()`, then `runPreflightSync()`, then runs steps in sequence. Errors from any step abort the pipeline.
2. `lib/config-source.js` — Locates the wpDeployer settings object: `package.json#wpDeployer`, a standalone `wp-deployer.json` in CWD, or an explicit `--config` path. The first two are mutually exclusive — if both exist, returns an error instead of picking one. `--config` bypasses both. Returns `{ wpDeployerConfig, error, errorMessage }` — never throws.
3. `lib/config.js` — `resolveSettings(pkg, wpDeployerOverride?)` merges the wpDeployer config (from `pkg.wpDeployer` by default, or the override from `loadConfigSource()`) with defaults, normalises paths, derives the SVN URL, and validates via `lib/config-schema.js`. Returns `{ settings, error, errorMessage }` — never throws.
4. `lib/config-schema.js` — Validates merged settings against `lib/schemas/config.schema.json` using Ajv. Maps AJV errors to stable error codes consumed by `index.js`.
5. `lib/preflight.js` — Synchronous environment checks: `svn` and `awk` on PATH, build/assets dirs exist and are non-empty. Throws `DeployError` on failure.
6. `lib/steps.js` — Step factories. `createPluginSteps()` and `createThemeSteps()` each return an array of `async (settings) => settings` functions. Steps are composed, not inherited. Each step receives the live settings object and returns it (possibly mutated). `dryRun` skips commit steps.

### Plugin vs theme deploy

**Plugin** (`createPluginSteps`): checks out `trunk/` (and optionally `assets/`), clears the directory, copies the build, runs `svn add`/`svn delete`, commits, then does a server-side `svn copy trunk/ tags/<version>/`.

**Theme** (`createThemeSteps`): wipes the entire `svnPath`, checks out the full repo, copies `earlierVersion` to `newVersion` via `svn copy`, clears the new tag dir, copies the build, adds/deletes, commits.

### Key conventions

- **Linter:** StandardJS (no config file — zero-config). No semicolons, 2-space indent.
- **ESM only** — `"type": "module"` in package.json; all imports use `.js` extensions.
- **Error handling:** `DeployError` (in `lib/deploy-error.js`) carries an explicit exit code. Exit code constants live in `lib/exit-codes.js`: `EXIT_SUCCESS=0`, `EXIT_CONFIG=1`, `EXIT_RUNTIME=2`, `EXIT_SIGINT=130`.
- **Shell safety:** Validators in `lib/validators/` guard against shell-unsafe characters in usernames, versions, and URLs before they reach `exec()` calls.
- **Test runner:** Node's built-in `--test` (no external framework). Tests live in `test/`.
