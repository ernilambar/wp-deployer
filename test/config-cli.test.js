/**
 * End-to-end CLI tests for config source resolution (package.json#wpDeployer,
 * wp-deployer.json, --config). Exits before any svn/preflight work runs.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { describe, it } from 'node:test'
import assert from 'node:assert'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const indexJs = path.join(__dirname, '..', 'index.js')

function makeProjectDir () {
  return mkdtempSync(path.join(tmpdir(), 'wpdep-config-cli-'))
}

function writePkg (dir, pkg) {
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg))
}

function run (args, cwd) {
  return spawnSync(process.execPath, [indexJs, ...args], { encoding: 'utf8', cwd })
}

describe('config source CLI resolution', () => {
  it('fails loudly when both package.json#wpDeployer and wp-deployer.json exist', () => {
    const dir = makeProjectDir()
    writePkg(dir, { name: 'dup-pkg', version: '1.0.0', wpDeployer: { username: 'jane' } })
    writeFileSync(path.join(dir, 'wp-deployer.json'), JSON.stringify({ username: 'bob' }))

    const r = run([], dir)
    assert.strictEqual(r.status, 1, r.stderr)
    assert.match(r.stderr, /both package\.json#wpDeployer and wp-deployer\.json/)
  })

  it('reads settings from wp-deployer.json when package.json has no wpDeployer key', () => {
    const dir = makeProjectDir()
    writePkg(dir, { name: 'standalone-pkg', version: '1.0.0' })
    writeFileSync(path.join(dir, 'wp-deployer.json'), JSON.stringify({}))

    const r = run([], dir)
    assert.strictEqual(r.status, 1, r.stderr)
    assert.match(r.stderr, /Username is required/)
  })

  it('--config points at a custom file and is used over package.json/wp-deployer.json', () => {
    const dir = makeProjectDir()
    writePkg(dir, { name: 'custom-pkg', version: '1.0.0', wpDeployer: { username: 'ignored' } })
    writeFileSync(path.join(dir, 'my-config.json'), JSON.stringify({}))

    const r = run(['--config', 'my-config.json'], dir)
    assert.strictEqual(r.status, 1, r.stderr)
    assert.match(r.stderr, /Username is required/)
  })

  it('--config with a missing file fails loudly', () => {
    const dir = makeProjectDir()
    writePkg(dir, { name: 'missing-config-pkg', version: '1.0.0' })

    const r = run(['--config', 'nope.json'], dir)
    assert.strictEqual(r.status, 1, r.stderr)
    assert.match(r.stderr, /Config file not found/)
  })

  it('--config with malformed JSON fails loudly', () => {
    const dir = makeProjectDir()
    writePkg(dir, { name: 'bad-json-pkg', version: '1.0.0' })
    writeFileSync(path.join(dir, 'bad.json'), '{ not valid')

    const r = run(['--config', 'bad.json'], dir)
    assert.strictEqual(r.status, 1, r.stderr)
    assert.match(r.stderr, /Invalid JSON/)
  })
})
