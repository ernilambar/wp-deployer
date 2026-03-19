import path from 'node:path'
import os from 'node:os'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { createPluginSteps, createThemeSteps } from '../lib/steps.js'

function createRecordingExec () {
  const calls = []
  const fn = (cmd, opts) => {
    calls.push({ cmd, opts: opts ?? {} })
    return Promise.resolve({ stdout: '', stderr: '' })
  }
  fn.calls = calls
  return fn
}

function createRecordingFs () {
  const copies = []
  return {
    copySync (src, dest) {
      copies.push({ src, dest })
    },
    copies
  }
}

const awk = 'awk'
const noRunIfEmpty = ''

describe('createPluginSteps', () => {
  const svnPath = path.join(os.tmpdir(), 'wp-deployer-test-plugin')
  const baseSettings = {
    svnPath,
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

  function helpersWith (exec, fs) {
    return { exec, fs, awk, noRunIfEmpty }
  }

  it('returns an array of functions', () => {
    const fs = createRecordingFs()
    const exec = createRecordingExec()
    const steps = createPluginSteps(baseSettings, helpersWith(exec, fs))
    assert(Array.isArray(steps))
    steps.forEach((step, i) => {
      assert.strictEqual(typeof step, 'function', `step ${i} should be a function`)
    })
  })

  it('full plugin (deployTrunk + deployTag) runs expected exec commands and cwd', async () => {
    const fs = createRecordingFs()
    const exec = createRecordingExec()
    const steps = createPluginSteps(baseSettings, helpersWith(exec, fs))
    let s = baseSettings
    for (const step of steps) {
      s = await step(s)
    }

    const trunk = path.join(svnPath, 'trunk')
    const url = baseSettings.url
    const addCmd =
      'svn resolve --accept working -R . && svn status |awk \'/^[?]/{print $2}\' | xargs svn add;' +
      'svn status | awk \'/^[!]/{print $2}\' | xargs svn delete;'

    assert.deepStrictEqual(exec.calls, [
      {
        cmd: `svn co --force-interactive --username="jane" ${url}trunk/ ${trunk}`,
        opts: { maxBuffer: baseSettings.maxBuffer }
      },
      {
        cmd: `rm -fr ${trunk}/*`,
        opts: {}
      },
      {
        cmd: addCmd,
        opts: { cwd: trunk }
      },
      {
        cmd: 'svn commit --force-interactive --username="jane" -m "Committing 1.0.0 to trunk"',
        opts: { cwd: trunk }
      },
      {
        cmd:
          'svn copy ' +
          url +
          'trunk/ ' +
          url +
          'tags/1.0.0/ ' +
          ' ' +
          ' --force-interactive --username="jane" -m "Tagging 1.0.0"',
        opts: { cwd: svnPath }
      }
    ])

    assert.deepStrictEqual(fs.copies, [
      { src: 'dist/', dest: path.join(svnPath, 'trunk') + path.sep }
    ])
  })

  it('plugin with deployTrunk false only runs commitTag with correct cwd', async () => {
    const fs = createRecordingFs()
    const exec = createRecordingExec()
    const settings = { ...baseSettings, deployTrunk: false }
    const steps = createPluginSteps(settings, helpersWith(exec, fs))
    let s = settings
    for (const step of steps) {
      s = await step(s)
    }
    assert.strictEqual(steps.length, 1)
    assert.strictEqual(exec.calls.length, 1)
    assert.strictEqual(
      exec.calls[0].cmd,
      'svn copy ' +
        settings.url +
        'trunk/ ' +
        settings.url +
        'tags/1.0.0/ ' +
        ' ' +
        ' --force-interactive --username="jane" -m "Tagging 1.0.0"'
    )
    assert.strictEqual(exec.calls[0].opts.cwd, svnPath)
    assert.strictEqual(fs.copies.length, 0)
  })

  it('plugin with deployTag false omits tag step exec and cwd', async () => {
    const fs = createRecordingFs()
    const exec = createRecordingExec()
    const settings = { ...baseSettings, deployTag: false }
    const steps = createPluginSteps(settings, helpersWith(exec, fs))
    let s = settings
    for (const step of steps) {
      s = await step(s)
    }
    const trunk = path.join(svnPath, 'trunk')
    const url = settings.url
    const addCmd =
      'svn resolve --accept working -R . && svn status |awk \'/^[?]/{print $2}\' | xargs svn add;' +
      'svn status | awk \'/^[!]/{print $2}\' | xargs svn delete;'

    assert.deepStrictEqual(exec.calls, [
      {
        cmd: `svn co --force-interactive --username="jane" ${url}trunk/ ${trunk}`,
        opts: { maxBuffer: settings.maxBuffer }
      },
      { cmd: `rm -fr ${trunk}/*`, opts: {} },
      { cmd: addCmd, opts: { cwd: trunk } },
      {
        cmd: 'svn commit --force-interactive --username="jane" -m "Committing 1.0.0 to trunk"',
        opts: { cwd: trunk }
      }
    ])
  })

  it('plugin with deployAssets true includes assets checkout, copy, svn add, commit with cwd', async () => {
    const fs = createRecordingFs()
    const exec = createRecordingExec()
    const settings = { ...baseSettings, deployAssets: true }
    const steps = createPluginSteps(settings, helpersWith(exec, fs))
    let s = settings
    for (const step of steps) {
      s = await step(s)
    }

    const assets = path.join(svnPath, 'assets')
    const addCmd =
      'svn resolve --accept working -R . && svn status |awk \'/^[?]/{print $2}\' | xargs svn add;' +
      'svn status | awk \'/^[!]/{print $2}\' | xargs svn delete;'

    assert.strictEqual(exec.calls.length, 9)
    assert.strictEqual(exec.calls[6].cmd, `rm -fr ${assets}/*`)
    assert.strictEqual(exec.calls[7].opts.cwd, assets)
    assert.strictEqual(exec.calls[7].cmd, addCmd)
    assert.strictEqual(exec.calls[8].opts.cwd, assets)
    assert.strictEqual(
      exec.calls[8].cmd,
      'svn commit --force-interactive --username="jane" -m "Committing assets"'
    )

    assert.deepStrictEqual(fs.copies, [
      { src: 'dist/', dest: path.join(svnPath, 'trunk') + path.sep },
      { src: '.wordpress-org/', dest: path.join(svnPath, 'assets') + path.sep }
    ])
  })

  it('first step receives settings and returns settings', async () => {
    const fs = createRecordingFs()
    const exec = createRecordingExec()
    const steps = createPluginSteps(baseSettings, helpersWith(exec, fs))
    const result = await steps[0](baseSettings)
    assert.strictEqual(result, baseSettings)
  })

  it('stops pipeline when exec rejects (fail-fast)', async () => {
    let calls = 0
    const failingExec = async () => {
      calls += 1
      throw new Error('simulated svn failure')
    }
    const fs = createRecordingFs()
    const steps = createPluginSteps(baseSettings, helpersWith(failingExec, fs))
    await assert.rejects(
      async () => {
        let s = baseSettings
        for (const step of steps) {
          s = await step(s)
        }
      },
      /simulated svn failure/
    )
    assert.strictEqual(calls, 1)
  })
})

describe('createThemeSteps', () => {
  const svnPath = path.join(os.tmpdir(), 'wp-deployer-test-theme')
  const baseSettings = {
    svnPath,
    url: 'https://themes.svn.wordpress.org/my-theme/',
    username: 'jane',
    buildDir: 'dist/',
    newVersion: '2.0.0',
    earlierVersion: '1.0.0',
    maxBuffer: 200 * 1024
  }

  function helpersWith (exec, fs) {
    return { exec, fs, awk, noRunIfEmpty }
  }

  it('returns an array of functions', () => {
    const fs = createRecordingFs()
    const exec = createRecordingExec()
    const steps = createThemeSteps(baseSettings, helpersWith(exec, fs))
    assert(Array.isArray(steps))
    steps.forEach((step, i) => {
      assert.strictEqual(typeof step, 'function', `step ${i} should be a function`)
    })
  })

  it('theme pipeline runs expected exec commands, cwd, and copySync destinations', async () => {
    const fs = createRecordingFs()
    const exec = createRecordingExec()
    const steps = createThemeSteps(baseSettings, helpersWith(exec, fs))
    let s = baseSettings
    for (const step of steps) {
      s = await step(s)
    }

    const verDir = path.join(svnPath, baseSettings.newVersion)
    const addCmd =
      'svn resolve --accept working -R . && svn status |awk \'/^[?]/{print $2}\' | xargs svn add;' +
      'svn status | awk \'/^[!]/{print $2}\' | xargs svn delete;'

    assert.deepStrictEqual(exec.calls, [
      { cmd: `rm -fr ${svnPath}`, opts: {} },
      {
        cmd: `svn co --force-interactive --username="jane" ${baseSettings.url}/ ${svnPath}`,
        opts: { maxBuffer: baseSettings.maxBuffer }
      },
      {
        cmd: 'svn copy 1.0.0 2.0.0',
        opts: { cwd: svnPath }
      },
      { cmd: `rm -fr ${verDir}/*`, opts: {} },
      { cmd: addCmd, opts: { cwd: verDir } },
      {
        cmd: 'svn commit --force-interactive --username="jane" -m "Committing theme 2.0.0"',
        opts: { cwd: verDir }
      }
    ])

    assert.deepStrictEqual(fs.copies, [
      { src: 'dist/', dest: path.join(svnPath, '2.0.0') + path.sep }
    ])
  })

  it('first step receives settings and returns settings', async () => {
    const fs = createRecordingFs()
    const exec = createRecordingExec()
    const steps = createThemeSteps(baseSettings, helpersWith(exec, fs))
    const result = await steps[0](baseSettings)
    assert.strictEqual(result, baseSettings)
  })
})
