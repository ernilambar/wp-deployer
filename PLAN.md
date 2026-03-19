# Improvement Plan (Non-Breaking Only)

Only additive or internal changes. No change to: exit codes, when the pipeline continues or stops, config, CLI, or deploy flow.

---

## Phase 1: Lint & deprecated APIs

**Goal:** Pass `standard` and remove deprecated usage. Behavior unchanged.

- [x] **1.1** In every `exec` callback, reference `error` (e.g. log it) so the linter rule `n/handle-callback-err` is satisfied. Keep calling `callback(null, settings)` so the pipeline continues as it does today.
- [x] **1.2** In the final `waterfall` callback, reference `err` (e.g. log it if present) so the linter is satisfied. Do not change exit code or stop behavior.
- [x] **1.3** Replace deprecated `String.prototype.substr(-1)` with `String.prototype.slice(-1)` in `copyDirectory`.
- [x] **1.4** Run `npm run lint` and `npm run lint:fix` until clean.

**Outcome:** Green lint, no deprecated APIs. Same success/failure flow and exit behavior.

---

## Phase 2: Structure & maintainability

**Goal:** Clearer code layout and docs. No change to public API or flow.

- [x] **2.1** Extract step factories into a small number of named functions or a single internal module (e.g. `lib/steps.js` or sections in index.js) so the main file reads as “config → build steps → run waterfall.” Keep the same step sequence and callback contract.
- [x] **2.2** Add a short JSDoc block at the top describing the script and that config comes from `package.json` → `wpDeployer`.
- [x] **2.3** Document the `wpDeployer` options (defaults, plugin vs theme) in a comment or in README so they stay in sync with the code.

**Outcome:** Easier to read and change; no new CLI flags or config keys.

---

## Phase 3: Developer experience & docs

**Goal:** Better onboarding and usage. No change to how the deploy works.

- [x] **3.1** In README, state the minimum Node version (e.g. “Node 20 or later”) in the Install section.
- [x] **3.2** Add a “Usage” section: run via `npx wp-deployer` or `npm run wpdeploy` from the project root (where package.json with `wpDeployer` lives).
- [x] **3.3** Fix README typo for `deployTag` (correct the description to match the option).
- [x] **3.4** Add an optional script example in README (e.g. `"deploy": "wp-deployer"` or existing `wpdeploy`).

**Outcome:** README and usage are clear and accurate; behavior unchanged.

---

## Phase 4: Optional tooling

**Goal:** Convenience; still non-breaking.

- [ ] **4.1** Optionally add a `prepublishOnly` or `prepack` script (e.g. run lint) so published packages are lint-clean.
- [x] **4.2** Optionally add `.nvmrc` or engines note in README for contributors (Node 20+).

**Outcome:** Smoother contribution and release; no impact on existing users.

---

## Out of scope (would change behavior or risk breakage)

- Changing exit codes (e.g. `process.exit(1)` on validation or on pipeline failure).
- Propagating errors so the pipeline stops on first failure.
- Adding validation that exits before the current flow (e.g. buildDir exists).
- Changing config source, required options, or `wpDeployer` keys.
- Replacing `async.waterfall` or changing step sequence/callback contract.
- Adding new deploy targets or changing plugin/theme deploy steps.
- Changing how SVN is invoked (same commands and order).

---

## Order of work

Phases 1 → 2 → 3 → 4. Phase 1 is the only one that touches runtime code; the rest are structure and docs.
