import { describe, it } from 'node:test'
import assert from 'node:assert'
import { runPreflightSync } from '../lib/preflight.js'
import { DeployError } from '../lib/deploy-error.js'
import { EXIT_CONFIG } from '../lib/exit-codes.js'

const basePlugin = {
  repoType: 'plugin',
  deployTrunk: true,
  deployTag: true,
  deployAssets: false,
  buildDir: 'dist/',
  assetsDir: '.wordpress-org/'
}

describe('runPreflightSync', () => {
  it('throws DeployError when buildDir does not exist', () => {
    const fs = {
      existsSync: () => false,
      statSync: () => ({ isDirectory: () => true }),
      readdirSync: () => ['file']
    }
    assert.throws(
      () => runPreflightSync(basePlugin, { fs, awk: 'awk' }, { checkCommands: false }),
      (e) => e instanceof DeployError && e.exitCode === EXIT_CONFIG && /buildDir does not exist/.test(e.message)
    )
  })

  it('throws when buildDir is empty', () => {
    const fs = {
      existsSync: () => true,
      statSync: () => ({ isDirectory: () => true }),
      readdirSync: () => []
    }
    assert.throws(
      () => runPreflightSync(basePlugin, { fs, awk: 'awk' }, { checkCommands: false }),
      (e) => e instanceof DeployError && /buildDir is empty/.test(e.message)
    )
  })

  it('skips buildDir check when deployTrunk is false (plugin)', () => {
    const fs = {
      existsSync: () => false,
      statSync: () => ({ isDirectory: () => true }),
      readdirSync: () => []
    }
    assert.doesNotThrow(() =>
      runPreflightSync(
        { ...basePlugin, deployTrunk: false, deployTag: true },
        { fs, awk: 'awk' },
        { checkCommands: false }
      )
    )
  })

  it('requires assetsDir when deployAssets is true', () => {
    const fs = {
      existsSync: (p) => {
        const norm = String(p).replace(/\\/g, '/')
        if (norm.includes('wordpress-org')) return false
        return /(^|\/)dist$/.test(norm)
      },
      statSync: () => ({ isDirectory: () => true }),
      readdirSync: () => ['a']
    }
    assert.throws(
      () =>
        runPreflightSync(
          { ...basePlugin, deployAssets: true },
          { fs, awk: 'awk' },
          { checkCommands: false }
        ),
      (e) => e instanceof DeployError && /assetsDir does not exist/.test(e.message)
    )
  })
})
