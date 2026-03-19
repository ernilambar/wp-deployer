import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { spawnSync } from 'node:child_process'
import fs from 'fs-extra'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const indexJs = path.join(__dirname, '..', 'index.js')

describe('CLI flags', () => {
  it('--version prints package version from wp-deployer package.json', () => {
    const pkg = fs.readJsonSync(path.join(__dirname, '..', 'package.json'))
    const r = spawnSync(process.execPath, [indexJs, '--version'], { encoding: 'utf8' })
    assert.strictEqual(r.status, 0, r.stderr)
    assert.strictEqual(r.stdout.trim(), pkg.version)
  })

  it('-v is alias for --version', () => {
    const pkg = fs.readJsonSync(path.join(__dirname, '..', 'package.json'))
    const r = spawnSync(process.execPath, [indexJs, '-v'], { encoding: 'utf8' })
    assert.strictEqual(r.status, 0, r.stderr)
    assert.strictEqual(r.stdout.trim(), pkg.version)
  })

  it('--help exits 0 and mentions usage', () => {
    const r = spawnSync(process.execPath, [indexJs, '--help'], { encoding: 'utf8' })
    assert.strictEqual(r.status, 0, r.stderr)
    assert.match(r.stdout, /Usage:\s*wp-deployer/i)
    assert.match(r.stdout, /--version/)
  })

  it('-h is alias for --help', () => {
    const r = spawnSync(process.execPath, [indexJs, '-h'], { encoding: 'utf8' })
    assert.strictEqual(r.status, 0, r.stderr)
    assert.match(r.stdout, /Usage:\s*wp-deployer/i)
  })

  it('--help documents --assets', () => {
    const r = spawnSync(process.execPath, [indexJs, '--help'], { encoding: 'utf8' })
    assert.strictEqual(r.status, 0, r.stderr)
    assert.match(r.stdout, /--assets\b/)
  })

  it('--help documents --dry-run', () => {
    const r = spawnSync(process.execPath, [indexJs, '--help'], { encoding: 'utf8' })
    assert.strictEqual(r.status, 0, r.stderr)
    assert.match(r.stdout, /--dry-run\b/)
  })
})
