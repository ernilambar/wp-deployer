#!/usr/bin/env node

import fs from 'fs-extra'
import chalk from 'chalk'
import merge from 'just-merge'
import { exec } from 'child_process'
import { waterfall } from 'async'

const pkg = fs.readJsonSync('./package.json')

const awk = process.platform === 'win32' ? 'gawk' : 'awk'
const noRunIfEmpty = process.platform !== 'darwin' ? '--no-run-if-empty ' : ''

const wpDeployer = async () => {
  console.log(chalk.cyan('Processing...'))

  const clearTrunk = (settings) => {
    return function (settings, callback) {
      console.log('Clearing trunk.')

      exec(`rm -fr ${settings.svnPath}/trunk/*`, function (error, stdout, stderr) {
        callback(null, settings)
      })
    }
  }

  const clearAssets = (settings) => {
    return function (settings, callback) {
      console.log('Clearing assets.')

      exec(`rm -fr ${settings.svnPath}/assets/*`, function (error, stdout, stderr) {
        callback(null, settings)
      })
    }
  }

  const prepareThemeTmp = (settings) => {
    return function (settings, callback) {
      console.log('Preparing temporary folder.')

      exec(`rm -fr ${settings.svnPath}/`, function (error, stdout, stderr) {
        callback(null, settings)
      })
    }
  }

  const clearTheme = (settings) => {
    return function (settings, callback) {
      console.log('Clearing theme.')

      exec(`rm -fr ${settings.svnPath}/${settings.newVersion}/*`, function (error, stdout, stderr) {
        callback(null, settings)
      })
    }
  }

  const checkoutDir = (dir, settings) => {
    return function (settings, callback) {
      console.log(`Checking out ${settings.url}${dir}/...`)

      const checkoutUrl = `${settings.url}${dir}/`
      const targetPath = `${settings.svnPath}/${dir}`

      exec(`svn co --force-interactive --username="${settings.username}" ${checkoutUrl} ${targetPath}`, { maxBuffer: settings.maxBuffer }, function (error, stdout, stderr) {
        if (error !== null) {
          console.error(`Checkout of ${settings.url}${dir}/ unsuccessful: ${error}`)
        } else {
          console.log('Check out complete.')
        }
        callback(null, settings)
      })
    }
  }

  const checkoutTheme = (settings) => {
    return function (settings, callback) {
      console.log(`Checking out ${settings.url}...`)

      const checkoutUrl = `${settings.url}/`
      const targetPath = `${settings.svnPath}/`

      exec(`svn co --force-interactive --username="${settings.username}" ${checkoutUrl} ${targetPath}`, { maxBuffer: settings.maxBuffer }, function (error, stdout, stderr) {
        if (error !== null) {
          console.error(`Checkout of ${settings.url}/ unsuccessful: ${error}`)
        } else {
          console.log('Check out complete.')
        }
        callback(null, settings)
      })
    }
  }

  const copyDirectory = (srcDir, destDir, callback) => {
    if (srcDir.substr(-1) !== '/') {
      srcDir = `${srcDir}/`
    }

    fs.copySync(srcDir, destDir)
    callback()
  }

  const copyBuild = (settings) => {
    return function (settings, callback) {
      console.log(`Copying build directory: ${settings.buildDir}`)

      copyDirectory(settings.buildDir, `${settings.svnPath}/trunk/`, function () {
        callback(null, settings)
      })
    }
  }

  const copyTheme = (settings) => {
    return function (settings, callback) {
      console.log(`Copying build directory: ${settings.buildDir}`)

      copyDirectory(settings.buildDir, `${settings.svnPath}/${settings.newVersion}/`, function () {
        callback(null, settings)
      })
    }
  }

  const copyAssets = (settings) => {
    return function (settings, callback) {
      console.log('Copying assets')

      copyDirectory(settings.assetsDir, `${settings.svnPath}/assets/`, function () {
        callback(null, settings)
      })
    }
  }

  const addFiles = (settings, callback) => {
    return function (settings, callback) {
      console.log('Adding files in trunk')

      let cmd = 'svn resolve --accept working -R . && svn status |' + awk + " '/^[?]/{print $2}' | xargs " + noRunIfEmpty + 'svn add;'
      cmd += 'svn status | ' + awk + " '/^[!]/{print $2}' | xargs " + noRunIfEmpty + 'svn delete;'

      exec(cmd, { cwd: `${settings.svnPath}/trunk` }, function (error, stdout, stderr) {
        callback(null, settings)
      })
    }
  }

  const addThemeFiles = (settings, callback) => {
    return function (settings, callback) {
      console.log('Adding theme files')

      let cmd = 'svn resolve --accept working -R . && svn status |' + awk + " '/^[?]/{print $2}' | xargs " + noRunIfEmpty + 'svn add;'
      cmd += 'svn status | ' + awk + " '/^[!]/{print $2}' | xargs " + noRunIfEmpty + 'svn delete;'

      exec(cmd, { cwd: `${settings.svnPath}/${settings.newVersion}` }, function (error, stdout, stderr) {
        callback(null, settings)
      })
    }
  }

  const addAssets = (settings, callback) => {
    return function (settings, callback) {
      console.log('Adding assets')

      let cmd = 'svn resolve --accept working -R . && svn status |' + awk + " '/^[?]/{print $2}' | xargs " + noRunIfEmpty + 'svn add;'
      cmd += 'svn status | ' + awk + " '/^[!]/{print $2}' | xargs " + noRunIfEmpty + 'svn delete;'

      exec(cmd, { cwd: `${settings.svnPath}/assets` }, function (error, stdout, stderr) {
        callback(null, settings)
      })
    }
  }

  const commitToTrunk = (settings, callback) => {
    return function (settings, callback) {
      const commitMsg = `Committing ${settings.newVersion} to trunk`

      const cmd = `svn commit --force-interactive --username="${settings.username}" -m "${commitMsg}"`

      exec(cmd, { cwd: `${settings.svnPath}/trunk` }, function (error, stdout, stderr) {
        if (error !== null) {
          console.error(chalk.red(`Failed to commit to trunk: ${error}`))
        }
        callback(null, settings)
      })
    }
  }

  const commitToAssets = (settings, callback) => {
    return function (settings, callback) {
      const commitMsg = 'Committing assets'

      const cmd = `svn commit --force-interactive --username="${settings.username}" -m "${commitMsg}"`

      exec(cmd, { cwd: `${settings.svnPath}/assets` }, function (error, stdout, stderr) {
        if (error !== null) {
          console.error(chalk.red(`Failed to commit to assets: ${error}`))
        }
        callback(null, settings)
      })
    }
  }

  const commitTheme = (settings, callback) => {
    return function (settings, callback) {
      const commitMsg = `Committing theme ${settings.newVersion}`

      console.log(commitMsg)

      const cmd = `svn commit --force-interactive --username="${settings.username}" -m "${commitMsg}"`

      exec(cmd, { cwd: `${settings.svnPath}/${settings.newVersion}` }, function (error, stdout, stderr) {
        if (error !== null) {
          console.error(chalk.red(`Failed to commit theme: ${error}`))
        }
        callback(null, settings)
      })
    }
  }

  const commitTag = (settings, callback) => {
    return function (settings, callback) {
      const tagCommitMsg = `Tagging ${settings.newVersion}`

      console.log(tagCommitMsg)

      const cmd = 'svn copy ' + settings.url + 'trunk/ ' + settings.url + 'tags/' + settings.newVersion + '/ ' + ' ' + ' --force-interactive --username="' + settings.username + '" -m "' + tagCommitMsg + '"'
      exec(cmd, { cwd: settings.svnPath }, function (error, stdout, stderr) {
        if (error !== null) {
          console.error(`Failed to commit tag: ${error}`)
        }
        callback(null, settings)
      })
    }
  }

  const createThemeTag = (settings, callback) => {
    return function (settings, callback) {
      console.log(`Creating tag ${settings.newVersion}`)

      const cmd = `svn copy ${settings.earlierVersion} ${settings.newVersion}`

      exec(cmd, { cwd: settings.svnPath }, function (error, stdout, stderr) {
        if (error !== null) {
          console.error(`Failed to create tag: ${error}`)
        }
        callback(null, settings)
      })
    }
  }

  const defaults = {
    url: '',
    slug: `${pkg.name}`,
    mainFile: `${pkg.name}.php`,
    username: '',
    repoType: 'plugin',
    buildDir: 'dist',
    maxBuffer: 200 * 1024,
    deployTrunk: true,
    deployTag: true,
    deployAssets: false,
    assetsDir: '.wordpress-org',
    tmpDir: '/tmp/',
    earlierVersion: '',
    newVersion: pkg.version
  }

  let settings = merge(defaults, Object.prototype.hasOwnProperty.call(pkg, 'wpDeployer') ? pkg.wpDeployer : {})

  settings = merge(settings, {
    svnPath: settings.tmpDir.replace(/\/$|$/, '/') + settings.slug
  })

  settings.buildDir = settings.buildDir.replace(/\/$|$/, '/')

  if (!settings.url) {
    if (settings.repoType === 'plugin') {
      settings.url = `https://plugins.svn.wordpress.org/${pkg.name}/`
    } else if (settings.repoType === 'theme') {
      settings.url = `https://themes.svn.wordpress.org/${pkg.name}/`
    }
  }

  if (!settings.username) {
    console.error(chalk.red('Username is required.'))
    process.exit()
  }

  if (!settings.earlierVersion && settings.repoType === 'theme') {
    console.error(chalk.red('For repoType theme, earlierVersion is required.'))
    process.exit()
  }

  let steps = []

  if (settings.repoType === 'plugin') {
    steps = [
      function (callback) {
        callback(null, settings)
      },
      settings.deployTrunk ? checkoutDir('trunk', settings) : null,
      settings.deployTrunk ? clearTrunk(settings) : null,
      settings.deployTrunk ? copyBuild(settings) : null,
      settings.deployTrunk ? addFiles(settings) : null,
      settings.deployTrunk ? commitToTrunk(settings) : null,

      settings.deployTag ? commitTag(settings) : null,

      settings.deployAssets ? checkoutDir('assets', settings) : null,
      settings.deployAssets ? clearAssets(settings) : null,
      settings.deployAssets ? copyAssets(settings) : null,
      settings.deployAssets ? addAssets(settings) : null,
      settings.deployAssets ? commitToAssets(settings) : null
    ].filter(function (val) { return val !== null })
  } else if (settings.repoType === 'theme') {
    steps = [
      function (callback) {
        callback(null, settings)
      },
      prepareThemeTmp(settings),
      checkoutTheme(settings),
      createThemeTag(settings),
      clearTheme(settings),
      copyTheme(settings),
      addThemeFiles(settings),
      commitTheme(settings)
    ].filter(function (val) { return val !== null })
  }

  waterfall(steps, function (err, result) {
  })
}

wpDeployer()
