import { describe, it } from 'node:test'
import assert from 'node:assert'
import { createPluginSteps, createThemeSteps } from '../lib/steps.js'

const noopChalk = {
  red: (s) => s
}

function mockExec () {
  return function (cmd, opts) {
    return Promise.resolve({ stdout: '', stderr: '' })
  }
}

function mockFs () {
  return {
    copySync (src, dest) {}
  }
}

const helpers = {
  exec: mockExec(),
  chalk: noopChalk,
  fs: mockFs(),
  awk: 'awk',
  noRunIfEmpty: ''
}

describe('createPluginSteps', () => {
  const baseSettings = {
    svnPath: '/tmp/my-plugin',
    url: 'https://plugins.svn.wordpress.org/my-plugin/',
    username: 'jane',
    buildDir: 'dist/',
    newVersion: '1.0.0',
    maxBuffer: 200 * 1024,
    assetsDir: '.wordpress-org/',
    deployTrunk: true,
    deployTag: true,
    deployAssets: false
  }

  it('returns an array of functions', () => {
    const steps = createPluginSteps(baseSettings, helpers)
    assert(Array.isArray(steps))
    steps.forEach((step, i) => {
      assert.strictEqual(typeof step, 'function', `step ${i} should be a function`)
    })
  })

  it('full plugin (deployTrunk + deployTag) has 6 steps', () => {
    const steps = createPluginSteps(baseSettings, helpers)
    assert.strictEqual(steps.length, 6) // checkout, clear, copy, add, commit trunk, commit tag
  })

  it('plugin with deployTrunk false has 1 step (commitTag only)', () => {
    const settings = { ...baseSettings, deployTrunk: false }
    const steps = createPluginSteps(settings, helpers)
    assert.strictEqual(steps.length, 1)
  })

  it('plugin with deployTag false has 5 steps (no commit tag)', () => {
    const settings = { ...baseSettings, deployTag: false }
    const steps = createPluginSteps(settings, helpers)
    assert.strictEqual(steps.length, 5)
  })

  it('plugin with deployAssets true has 11 steps', () => {
    const settings = { ...baseSettings, deployAssets: true }
    const steps = createPluginSteps(settings, helpers)
    assert.strictEqual(steps.length, 11)
  })

  it('first step receives settings and returns settings', async () => {
    const steps = createPluginSteps(baseSettings, helpers)
    const result = await steps[0](baseSettings)
    assert.strictEqual(result, baseSettings)
  })

  it('all steps run in sequence and each returns settings', async () => {
    const steps = createPluginSteps(baseSettings, helpers)
    let s = baseSettings
    for (const step of steps) {
      s = await step(s)
      assert.strictEqual(s, baseSettings, 'each step should pass through same settings reference')
    }
    assert.strictEqual(s, baseSettings)
  })
})

describe('createThemeSteps', () => {
  const baseSettings = {
    svnPath: '/tmp/my-theme',
    url: 'https://themes.svn.wordpress.org/my-theme/',
    username: 'jane',
    buildDir: 'dist/',
    newVersion: '2.0.0',
    earlierVersion: '1.0.0',
    maxBuffer: 200 * 1024
  }

  it('returns an array of functions', () => {
    const steps = createThemeSteps(baseSettings, helpers)
    assert(Array.isArray(steps))
    steps.forEach((step, i) => {
      assert.strictEqual(typeof step, 'function', `step ${i} should be a function`)
    })
  })

  it('theme always has 7 steps', () => {
    const steps = createThemeSteps(baseSettings, helpers)
    assert.strictEqual(steps.length, 7)
  })

  it('first step receives settings and returns settings', async () => {
    const steps = createThemeSteps(baseSettings, helpers)
    const result = await steps[0](baseSettings)
    assert.strictEqual(result, baseSettings)
  })

  it('all theme steps run in sequence and each returns settings', async () => {
    const steps = createThemeSteps(baseSettings, helpers)
    let s = baseSettings
    for (const step of steps) {
      s = await step(s)
      assert.strictEqual(s, baseSettings, 'each step should pass through same settings reference')
    }
    assert.strictEqual(s, baseSettings)
  })
})
