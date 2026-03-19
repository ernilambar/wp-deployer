/**
 * End-to-end smoke tests against a local repository created with svnadmin create.
 * Skipped automatically when svnadmin / svn / awk are unavailable (e.g. minimal CI images).
 */

import path from 'node:path'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFileSync, exec as execCb } from 'node:child_process'
import { promisify } from 'node:util'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'fs-extra'
import { resolveSettings } from '../lib/config.js'
import { validateSvnUrl } from '../lib/validators/index.js'
import { createPluginSteps, createThemeSteps } from '../lib/steps.js'
import { runPreflightSync } from '../lib/preflight.js'

const exec = promisify(execCb)

const awk = process.platform === 'win32' ? 'gawk' : 'awk'
const noRunIfEmpty = process.platform !== 'darwin' ? '--no-run-if-empty ' : ''

function svnToolsAvailable () {
  try {
    execFileSync('svnadmin', ['--version'], { stdio: 'ignore' })
    execFileSync('svn', ['--version'], { stdio: 'ignore' })
    execFileSync('awk', ['BEGIN { exit 0 }'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function repoFileUrl (repoDir) {
  let href = pathToFileURL(repoDir).href
  if (!href.endsWith('/')) href += '/'
  return href
}

function svnRun (args, options = {}) {
  return execFileSync('svn', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim()
}

function createPluginRepo (root) {
  const repoDir = path.join(root, 'repo')
  mkdirSync(repoDir)
  execFileSync('svnadmin', ['create', repoDir], { stdio: 'ignore' })
  const url = repoFileUrl(repoDir)

  const importRoot = path.join(root, 'import-plugin')
  mkdirSync(path.join(importRoot, 'trunk'), { recursive: true })
  writeFileSync(path.join(importRoot, 'trunk', 'readme.txt'), 'seed\n')
  svnRun(['import', importRoot, url, '-m', 'init'])
  svnRun(['mkdir', `${url}tags`, '-m', 'tags'])

  return { repoDir, url }
}

function createThemeRepo (root) {
  const repoDir = path.join(root, 'repo')
  mkdirSync(repoDir)
  execFileSync('svnadmin', ['create', repoDir], { stdio: 'ignore' })
  const url = repoFileUrl(repoDir)

  const importRoot = path.join(root, 'import-theme')
  mkdirSync(path.join(importRoot, '1.0.0'), { recursive: true })
  writeFileSync(path.join(importRoot, '1.0.0', 'style.css'), '/* seed */\n')
  svnRun(['import', importRoot, url, '-m', 'init'])

  return { repoDir, url }
}

/** Point resolved settings at a local file:// repo (only for this integration suite). */
function withLocalSvnUrl (settings, fileUrl) {
  const r = validateSvnUrl(fileUrl)
  if (!r.ok) assert.fail(r.message)
  settings.url = r.value
  return settings
}

function assertSameFileContent (svnCatOutput, expected) {
  assert.strictEqual(svnCatOutput.replace(/\r?\n$/, ''), expected.replace(/\r?\n$/, ''))
}

describe('SVN fixture e2e (svnadmin create)', { skip: !svnToolsAvailable() }, () => {
  it('plugin: full pipeline commits trunk, creates tag, and tag matches build', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wpdep-e2e-p-'))
    const { url } = createPluginRepo(root)

    const buildDir = path.join(root, 'dist')
    mkdirSync(buildDir, { recursive: true })
    const main = '<?php\n// e2e plugin\n'
    writeFileSync(path.join(buildDir, 'e2e-plugin.php'), main)

    const pkg = {
      name: 'e2e-plugin-pkg',
      version: '1.0.0',
      wpDeployer: {
        username: 'e2euser',
        slug: 'e2e-plugin',
        tmpDir: path.join(root, 'wc'),
        buildDir: path.join(buildDir) + path.sep,
        deployTrunk: true,
        deployTag: true,
        deployAssets: false
      }
    }

    const { settings: resolved, error } = resolveSettings(pkg)
    assert.strictEqual(error, null)
    const settings = withLocalSvnUrl(resolved, url)

    const helpers = { exec, fs, awk, noRunIfEmpty, dryRun: false }
    runPreflightSync(settings, { fs, awk }, { checkCommands: false })

    const steps = createPluginSteps(settings, helpers)
    let s = settings
    for (const step of steps) {
      s = await step(s)
    }

    const trunkList = svnRun(['ls', `${url}trunk`])
    assert.ok(trunkList.includes('e2e-plugin.php'), `trunk listing: ${trunkList}`)

    const tagList = svnRun(['ls', `${url}tags/1.0.0`])
    assert.ok(tagList.includes('e2e-plugin.php'), `tag listing: ${tagList}`)

    const catOut = svnRun(['cat', `${url}tags/1.0.0/e2e-plugin.php`])
    assertSameFileContent(catOut, main)
  })

  it('plugin: dry-run leaves repo without new trunk revision; WC has local changes', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wpdep-e2e-pdry-'))
    const { url } = createPluginRepo(root)

    const revBefore = svnRun(['info', '--show-item', 'revision', `${url}trunk`])

    const buildDir = path.join(root, 'dist')
    mkdirSync(buildDir, { recursive: true })
    writeFileSync(path.join(buildDir, 'new.php'), '<?php\n')

    const pkg = {
      name: 'dry-pkg',
      version: '2.0.0',
      wpDeployer: {
        username: 'e2euser',
        slug: 'dry-plugin',
        tmpDir: path.join(root, 'wc'),
        buildDir: path.join(buildDir) + path.sep,
        deployTrunk: true,
        deployTag: true,
        deployAssets: false
      }
    }

    const { settings: resolved, error } = resolveSettings(pkg)
    assert.strictEqual(error, null)
    const settings = withLocalSvnUrl(resolved, url)

    const helpers = { exec, fs, awk, noRunIfEmpty, dryRun: true }
    runPreflightSync(settings, { fs, awk }, { checkCommands: false })

    const steps = createPluginSteps(settings, helpers)
    let s = settings
    for (const step of steps) {
      s = await step(s)
    }

    const revAfter = svnRun(['info', '--show-item', 'revision', `${url}trunk`])
    assert.strictEqual(revAfter, revBefore)

    const trunkWc = path.join(settings.svnPath, 'trunk')
    const st = svnRun(['status', '--ignore-externals'], { cwd: trunkWc })
    assert.ok(/new\.php/.test(st), `expected uncommitted file in WC, got:\n${st}`)
  })

  it('theme: pipeline commits newVersion directory from earlierVersion tag', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wpdep-e2e-t-'))
    const { url } = createThemeRepo(root)

    const buildDir = path.join(root, 'dist')
    mkdirSync(buildDir, { recursive: true })
    const css = '/* e2e theme 2.0 */\n'
    writeFileSync(path.join(buildDir, 'style.css'), css)

    const pkg = {
      name: 'e2e-theme-pkg',
      version: '2.0.0',
      wpDeployer: {
        username: 'e2euser',
        repoType: 'theme',
        slug: 'e2e-theme',
        earlierVersion: '1.0.0',
        tmpDir: path.join(root, 'wc'),
        buildDir: path.join(buildDir) + path.sep
      }
    }

    const { settings: resolved, error } = resolveSettings(pkg)
    assert.strictEqual(error, null)
    const settings = withLocalSvnUrl(resolved, url)

    const helpers = { exec, fs, awk, noRunIfEmpty, dryRun: false }
    runPreflightSync(settings, { fs, awk }, { checkCommands: false })

    const steps = createThemeSteps(settings, helpers)
    let s = settings
    for (const step of steps) {
      s = await step(s)
    }

    const ls = svnRun(['ls', `${url}2.0.0`])
    assert.ok(ls.includes('style.css'), ls)

    const catOut = svnRun(['cat', `${url}2.0.0/style.css`])
    assertSameFileContent(catOut, css)

    const wcStyle = path.join(settings.svnPath, '2.0.0', 'style.css')
    assertSameFileContent(readFileSync(wcStyle, 'utf8'), css)
  })
})
