import { describe, it } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'
import { loadConfigSource } from '../lib/config-source.js'

const cwd = '/project'
const defaultConfigFile = path.join(cwd, 'wp-deployer.json')

function fakeFs (files) {
  return {
    existsSync: (p) => Object.prototype.hasOwnProperty.call(files, p),
    readFileSync: (p) => {
      if (!Object.prototype.hasOwnProperty.call(files, p)) {
        throw new Error(`ENOENT: ${p}`)
      }
      return files[p]
    }
  }
}

describe('loadConfigSource', () => {
  it('falls back to pkg.wpDeployer when no standalone file and no --config', () => {
    const pkg = { name: 'x', version: '1.0.0', wpDeployer: { username: 'jane' } }
    const fs = fakeFs({})
    const result = loadConfigSource(pkg, { fs, cwd })
    assert.strictEqual(result.error, null)
    assert.deepStrictEqual(result.wpDeployerConfig, { username: 'jane' })
  })

  it('returns empty object when pkg has no wpDeployer and no standalone file', () => {
    const pkg = { name: 'x', version: '1.0.0' }
    const fs = fakeFs({})
    const result = loadConfigSource(pkg, { fs, cwd })
    assert.strictEqual(result.error, null)
    assert.deepStrictEqual(result.wpDeployerConfig, {})
  })

  it('reads wp-deployer.json when present and pkg has no wpDeployer key', () => {
    const pkg = { name: 'x', version: '1.0.0' }
    const fs = fakeFs({ [defaultConfigFile]: JSON.stringify({ username: 'bob' }) })
    const result = loadConfigSource(pkg, { fs, cwd })
    assert.strictEqual(result.error, null)
    assert.deepStrictEqual(result.wpDeployerConfig, { username: 'bob' })
  })

  it('returns duplicate_config when both pkg.wpDeployer and wp-deployer.json exist', () => {
    const pkg = { name: 'x', version: '1.0.0', wpDeployer: { username: 'jane' } }
    const fs = fakeFs({ [defaultConfigFile]: JSON.stringify({ username: 'bob' }) })
    const result = loadConfigSource(pkg, { fs, cwd })
    assert.strictEqual(result.error, 'duplicate_config')
    assert.strictEqual(result.wpDeployerConfig, null)
    assert.ok(/both package\.json#wpDeployer and wp-deployer\.json/.test(result.errorMessage))
  })

  it('returns invalid_config_json when wp-deployer.json has malformed JSON', () => {
    const pkg = { name: 'x', version: '1.0.0' }
    const fs = fakeFs({ [defaultConfigFile]: '{ not valid json' })
    const result = loadConfigSource(pkg, { fs, cwd })
    assert.strictEqual(result.error, 'invalid_config_json')
    assert.ok(/Invalid JSON/.test(result.errorMessage))
  })

  it('uses --config path and ignores pkg.wpDeployer entirely (no duplicate_config check)', () => {
    const pkg = { name: 'x', version: '1.0.0', wpDeployer: { username: 'jane' } }
    const customPath = path.join(cwd, 'custom.json')
    const fs = fakeFs({ [customPath]: JSON.stringify({ username: 'custom' }) })
    const result = loadConfigSource(pkg, { fs, cwd, configPath: 'custom.json' })
    assert.strictEqual(result.error, null)
    assert.deepStrictEqual(result.wpDeployerConfig, { username: 'custom' })
  })

  it('resolves --config path relative to cwd', () => {
    const pkg = { name: 'x', version: '1.0.0' }
    const customPath = path.join(cwd, 'sub', 'custom.json')
    const fs = fakeFs({ [customPath]: JSON.stringify({ username: 'custom' }) })
    const result = loadConfigSource(pkg, { fs, cwd, configPath: 'sub/custom.json' })
    assert.strictEqual(result.error, null)
    assert.deepStrictEqual(result.wpDeployerConfig, { username: 'custom' })
  })

  it('returns config_file_not_found when --config path does not exist', () => {
    const pkg = { name: 'x', version: '1.0.0' }
    const fs = fakeFs({})
    const result = loadConfigSource(pkg, { fs, cwd, configPath: 'missing.json' })
    assert.strictEqual(result.error, 'config_file_not_found')
    assert.strictEqual(result.wpDeployerConfig, null)
    assert.ok(/Config file not found/.test(result.errorMessage))
  })

  it('returns invalid_config_json when --config file has malformed JSON', () => {
    const pkg = { name: 'x', version: '1.0.0' }
    const customPath = path.join(cwd, 'custom.json')
    const fs = fakeFs({ [customPath]: '{ bad' })
    const result = loadConfigSource(pkg, { fs, cwd, configPath: 'custom.json' })
    assert.strictEqual(result.error, 'invalid_config_json')
  })
})
