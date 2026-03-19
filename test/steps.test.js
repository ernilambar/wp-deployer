import { describe, it } from 'node:test'
import assert from 'node:assert'
import { createPluginSteps, createThemeSteps } from '../lib/steps.js'

const noopChalk = {
  red: (s) => s
}

function mockExec () {
  return function (cmd, opts, callback) {
    if (typeof opts === 'function') {
      opts(null, '', '')
    } else {
      callback(null, '', '')
    }
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

  it('full plugin (deployTrunk + deployTag) has 7 steps', () => {
    const steps = createPluginSteps(baseSettings, helpers)
    assert.strictEqual(steps.length, 7) // noop, checkout, clear, copy, add, commit trunk, commit tag
  })

  it('plugin with deployTrunk false has 2 steps (noop + commitTag)', () => {
    const settings = { ...baseSettings, deployTrunk: false }
    const steps = createPluginSteps(settings, helpers)
    assert.strictEqual(steps.length, 2)
  })

  it('plugin with deployTag false has 6 steps (no trunk commit tag)', () => {
    const settings = { ...baseSettings, deployTag: false }
    const steps = createPluginSteps(settings, helpers)
    assert.strictEqual(steps.length, 6)
  })

  it('plugin with deployAssets true has 12 steps', () => {
    const settings = { ...baseSettings, deployAssets: true }
    const steps = createPluginSteps(settings, helpers)
    assert.strictEqual(steps.length, 12)
  })

  it('first step passes settings to next (waterfall seed)', (t, done) => {
    const steps = createPluginSteps(baseSettings, helpers)
    const first = steps[0]
    first((err, result) => {
      assert.ifError(err)
      assert.strictEqual(result, baseSettings)
      done()
    })
  })

  it('all steps eventually call callback(null, settings)', (t, done) => {
    const steps = createPluginSteps(baseSettings, helpers)
    let index = 0
    const runNext = (err, settings) => {
      assert.ifError(err)
      if (index >= steps.length) {
        done()
        return
      }
      const step = steps[index]
      index += 1
      if (step.length === 1) {
        step((e, s) => runNext(e, s))
      } else {
        step(settings, (e, s) => runNext(e, s))
      }
    }
    runNext(null, baseSettings)
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

  it('theme always has 8 steps', () => {
    const steps = createThemeSteps(baseSettings, helpers)
    assert.strictEqual(steps.length, 8)
  })

  it('first step passes settings to next', (t, done) => {
    const steps = createThemeSteps(baseSettings, helpers)
    steps[0]((err, result) => {
      assert.ifError(err)
      assert.strictEqual(result, baseSettings)
      done()
    })
  })

  it('all theme steps eventually call callback(null, settings)', (t, done) => {
    const steps = createThemeSteps(baseSettings, helpers)
    let index = 0
    const runNext = (err, settings) => {
      assert.ifError(err)
      if (index >= steps.length) {
        done()
        return
      }
      const step = steps[index]
      index += 1
      if (step.length === 1) {
        step((e, s) => runNext(e, s))
      } else {
        step(settings, (e, s) => runNext(e, s))
      }
    }
    runNext(null, baseSettings)
  })
})
