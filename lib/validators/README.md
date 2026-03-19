# Validators

Small, composable checks used before deploy. Each validator returns the same shape:

- **Success:** `{ ok: true, value: string }` — `value` is normalized when useful (e.g. `URL.href`).
- **Failure:** `{ ok: false, code: string, message: string }` — stable `code` for tests/CI; human `message` for CLI.

## Layout

| Module | Role |
|--------|------|
| `shared.js` | Common helpers (`requireNonEmptyTrimmedString`, path/shell safety). |
| `svn-version.js` | Tag / version strings safe as SVN path segments. |
| `svn-url.js` | Absolute repository URLs (`https:`, `svn:`, `svn+ssh:`, `file:`). |

## Adding a validator

1. Create `lib/validators/my-check.js` (or extend an existing file if tightly related).
2. Export `validateMyThing(input, options?)` returning the result shape above.
3. Optionally export `isMyThing(input)` → boolean.
4. Re-export from `index.js`.
5. Add tests under `test/validators/`.
