/**
 * Step factories for the deploy pipeline.
 * Each step is an async function (settings) => settings used in sequence.
 * Config and helpers are passed in; this module does not read package.json.
 * Errors propagate — the runner should abort the pipeline on first failure.
 */

import path from 'node:path'

function copyDirectory (fs, srcDir, destDir) {
  if (srcDir.slice(-1) !== '/') {
    srcDir = `${srcDir}/`
  }
  fs.copySync(srcDir, destDir)
}

export function createPluginSteps (settings, { exec, fs, awk, noRunIfEmpty, dryRun = false }) {
  const clearTrunk = (s) => {
    return async function (s) {
      console.log('Clearing trunk.')
      await exec(`rm -fr ${path.join(s.svnPath, 'trunk')}/*`)
      return s
    }
  }

  const clearAssets = (s) => {
    return async function (s) {
      console.log('Clearing assets.')
      await exec(`rm -fr ${path.join(s.svnPath, 'assets')}/*`)
      return s
    }
  }

  const checkoutDir = (dir, s) => {
    return async function (s) {
      console.log(`Checking out ${s.url}${dir}/...`)
      const checkoutUrl = `${s.url}${dir}/`
      const targetPath = path.join(s.svnPath, dir)
      await exec(`svn co --force-interactive --username="${s.username}" ${checkoutUrl} ${targetPath}`, { maxBuffer: s.maxBuffer })
      console.log('Check out complete.')
      return s
    }
  }

  const copyBuild = (s) => {
    return async function (s) {
      console.log(`Copying build directory: ${s.buildDir}`)
      copyDirectory(fs, s.buildDir, path.join(s.svnPath, 'trunk') + path.sep)
      return s
    }
  }

  const addFiles = (s) => {
    return async function (s) {
      console.log('Adding files in trunk')
      let cmd = 'svn resolve --accept working -R . && svn status |' + awk + " '/^[?]/{print $2}' | xargs " + noRunIfEmpty + 'svn add;'
      cmd += 'svn status | ' + awk + " '/^[!]/{print $2}' | xargs " + noRunIfEmpty + 'svn delete;'
      await exec(cmd, { cwd: path.join(s.svnPath, 'trunk') })
      return s
    }
  }

  const commitToTrunk = (s) => {
    return async function (s) {
      const commitMsg = `Committing ${s.newVersion} to trunk`
      const cmd = `svn commit --force-interactive --username="${s.username}" -m "${commitMsg}"`
      await exec(cmd, { cwd: path.join(s.svnPath, 'trunk') })
      return s
    }
  }

  const commitTag = (s) => {
    return async function (s) {
      const tagCommitMsg = `Tagging ${s.newVersion}`
      console.log(tagCommitMsg)
      const cmd = 'svn copy ' + s.url + 'trunk/ ' + s.url + 'tags/' + s.newVersion + '/ ' + ' ' + ' --force-interactive --username="' + s.username + '" -m "' + tagCommitMsg + '"'
      await exec(cmd, { cwd: s.svnPath })
      return s
    }
  }

  const copyAssets = (s) => {
    return async function (s) {
      console.log('Copying assets')
      copyDirectory(fs, s.assetsDir, path.join(s.svnPath, 'assets') + path.sep)
      return s
    }
  }

  const addAssets = (s) => {
    return async function (s) {
      console.log('Adding assets')
      let cmd = 'svn resolve --accept working -R . && svn status |' + awk + " '/^[?]/{print $2}' | xargs " + noRunIfEmpty + 'svn add;'
      cmd += 'svn status | ' + awk + " '/^[!]/{print $2}' | xargs " + noRunIfEmpty + 'svn delete;'
      await exec(cmd, { cwd: path.join(s.svnPath, 'assets') })
      return s
    }
  }

  const commitToAssets = (s) => {
    return async function (s) {
      const commitMsg = 'Committing assets'
      const cmd = `svn commit --force-interactive --username="${s.username}" -m "${commitMsg}"`
      await exec(cmd, { cwd: path.join(s.svnPath, 'assets') })
      return s
    }
  }

  const steps = [
    settings.deployTrunk ? checkoutDir('trunk', settings) : null,
    settings.deployTrunk ? clearTrunk(settings) : null,
    settings.deployTrunk ? copyBuild(settings) : null,
    settings.deployTrunk ? addFiles(settings) : null,
    settings.deployTrunk && !dryRun ? commitToTrunk(settings) : null,
    settings.deployTag && !dryRun ? commitTag(settings) : null,
    settings.deployAssets ? checkoutDir('assets', settings) : null,
    settings.deployAssets ? clearAssets(settings) : null,
    settings.deployAssets ? copyAssets(settings) : null,
    settings.deployAssets ? addAssets(settings) : null,
    settings.deployAssets && !dryRun ? commitToAssets(settings) : null
  ].filter(function (val) { return val !== null })

  return steps
}

export function createThemeSteps (settings, { exec, fs, awk, noRunIfEmpty, dryRun = false }) {
  const prepareThemeTmp = (s) => {
    return async function (s) {
      console.log('Preparing temporary folder.')
      await exec(`rm -fr ${s.svnPath}`)
      return s
    }
  }

  const checkoutTheme = (s) => {
    return async function (s) {
      console.log(`Checking out ${s.url}...`)
      const checkoutUrl = `${s.url}/`
      const targetPath = s.svnPath
      await exec(`svn co --force-interactive --username="${s.username}" ${checkoutUrl} ${targetPath}`, { maxBuffer: s.maxBuffer })
      console.log('Check out complete.')
      return s
    }
  }

  const createThemeTag = (s) => {
    return async function (s) {
      console.log(`Creating tag ${s.newVersion}`)
      const cmd = `svn copy ${s.earlierVersion} ${s.newVersion}`
      await exec(cmd, { cwd: s.svnPath })
      return s
    }
  }

  const clearTheme = (s) => {
    return async function (s) {
      console.log('Clearing theme.')
      await exec(`rm -fr ${path.join(s.svnPath, s.newVersion)}/*`)
      return s
    }
  }

  const copyTheme = (s) => {
    return async function (s) {
      console.log(`Copying build directory: ${s.buildDir}`)
      copyDirectory(fs, s.buildDir, path.join(s.svnPath, s.newVersion) + path.sep)
      return s
    }
  }

  const addThemeFiles = (s) => {
    return async function (s) {
      console.log('Adding theme files')
      let cmd = 'svn resolve --accept working -R . && svn status |' + awk + " '/^[?]/{print $2}' | xargs " + noRunIfEmpty + 'svn add;'
      cmd += 'svn status | ' + awk + " '/^[!]/{print $2}' | xargs " + noRunIfEmpty + 'svn delete;'
      await exec(cmd, { cwd: path.join(s.svnPath, s.newVersion) })
      return s
    }
  }

  const commitTheme = (s) => {
    return async function (s) {
      const commitMsg = `Committing theme ${s.newVersion}`
      console.log(commitMsg)
      const cmd = `svn commit --force-interactive --username="${s.username}" -m "${commitMsg}"`
      await exec(cmd, { cwd: path.join(s.svnPath, s.newVersion) })
      return s
    }
  }

  const steps = [
    prepareThemeTmp(settings),
    checkoutTheme(settings),
    createThemeTag(settings),
    clearTheme(settings),
    copyTheme(settings),
    addThemeFiles(settings),
    dryRun ? null : commitTheme(settings)
  ].filter(function (val) { return val !== null })

  return steps
}
