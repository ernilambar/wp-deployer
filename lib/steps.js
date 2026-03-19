/**
 * Step factories for the deploy waterfall.
 * Each step is a function (settings, callback) used by async.waterfall.
 * Config and helpers are passed in; this module does not read package.json.
 */

function copyDirectory (fs, srcDir, destDir, callback) {
  if (srcDir.slice(-1) !== '/') {
    srcDir = `${srcDir}/`
  }
  fs.copySync(srcDir, destDir)
  callback()
}

export function createPluginSteps (settings, { exec, chalk, fs, awk, noRunIfEmpty }) {
  const clearTrunk = (s) => {
    return function (s, callback) {
      console.log('Clearing trunk.')
      exec(`rm -fr ${s.svnPath}/trunk/*`, function (error, stdout, stderr) {
        if (error) console.error(error)
        callback(null, s)
      })
    }
  }

  const clearAssets = (s) => {
    return function (s, callback) {
      console.log('Clearing assets.')
      exec(`rm -fr ${s.svnPath}/assets/*`, function (error, stdout, stderr) {
        if (error) console.error(error)
        callback(null, s)
      })
    }
  }

  const checkoutDir = (dir, s) => {
    return function (s, callback) {
      console.log(`Checking out ${s.url}${dir}/...`)
      const checkoutUrl = `${s.url}${dir}/`
      const targetPath = `${s.svnPath}/${dir}`
      exec(`svn co --force-interactive --username="${s.username}" ${checkoutUrl} ${targetPath}`, { maxBuffer: s.maxBuffer }, function (error, stdout, stderr) {
        if (error !== null) {
          console.error(`Checkout of ${s.url}${dir}/ unsuccessful: ${error}`)
        } else {
          console.log('Check out complete.')
        }
        callback(null, s)
      })
    }
  }

  const copyBuild = (s) => {
    return function (s, callback) {
      console.log(`Copying build directory: ${s.buildDir}`)
      copyDirectory(fs, s.buildDir, `${s.svnPath}/trunk/`, function () {
        callback(null, s)
      })
    }
  }

  const addFiles = (s) => {
    return function (s, callback) {
      console.log('Adding files in trunk')
      let cmd = 'svn resolve --accept working -R . && svn status |' + awk + " '/^[?]/{print $2}' | xargs " + noRunIfEmpty + 'svn add;'
      cmd += 'svn status | ' + awk + " '/^[!]/{print $2}' | xargs " + noRunIfEmpty + 'svn delete;'
      exec(cmd, { cwd: `${s.svnPath}/trunk` }, function (error, stdout, stderr) {
        if (error) console.error(error)
        callback(null, s)
      })
    }
  }

  const commitToTrunk = (s) => {
    return function (s, callback) {
      const commitMsg = `Committing ${s.newVersion} to trunk`
      const cmd = `svn commit --force-interactive --username="${s.username}" -m "${commitMsg}"`
      exec(cmd, { cwd: `${s.svnPath}/trunk` }, function (error, stdout, stderr) {
        if (error !== null) {
          console.error(chalk.red(`Failed to commit to trunk: ${error}`))
        }
        callback(null, s)
      })
    }
  }

  const commitTag = (s) => {
    return function (s, callback) {
      const tagCommitMsg = `Tagging ${s.newVersion}`
      console.log(tagCommitMsg)
      const cmd = 'svn copy ' + s.url + 'trunk/ ' + s.url + 'tags/' + s.newVersion + '/ ' + ' ' + ' --force-interactive --username="' + s.username + '" -m "' + tagCommitMsg + '"'
      exec(cmd, { cwd: s.svnPath }, function (error, stdout, stderr) {
        if (error !== null) {
          console.error(`Failed to commit tag: ${error}`)
        }
        callback(null, s)
      })
    }
  }

  const copyAssets = (s) => {
    return function (s, callback) {
      console.log('Copying assets')
      copyDirectory(fs, s.assetsDir, `${s.svnPath}/assets/`, function () {
        callback(null, s)
      })
    }
  }

  const addAssets = (s) => {
    return function (s, callback) {
      console.log('Adding assets')
      let cmd = 'svn resolve --accept working -R . && svn status |' + awk + " '/^[?]/{print $2}' | xargs " + noRunIfEmpty + 'svn add;'
      cmd += 'svn status | ' + awk + " '/^[!]/{print $2}' | xargs " + noRunIfEmpty + 'svn delete;'
      exec(cmd, { cwd: `${s.svnPath}/assets` }, function (error, stdout, stderr) {
        if (error) console.error(error)
        callback(null, s)
      })
    }
  }

  const commitToAssets = (s) => {
    return function (s, callback) {
      const commitMsg = 'Committing assets'
      const cmd = `svn commit --force-interactive --username="${s.username}" -m "${commitMsg}"`
      exec(cmd, { cwd: `${s.svnPath}/assets` }, function (error, stdout, stderr) {
        if (error !== null) {
          console.error(chalk.red(`Failed to commit to assets: ${error}`))
        }
        callback(null, s)
      })
    }
  }

  const steps = [
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

  return steps
}

export function createThemeSteps (settings, { exec, chalk, fs, awk, noRunIfEmpty }) {
  const prepareThemeTmp = (s) => {
    return function (s, callback) {
      console.log('Preparing temporary folder.')
      exec(`rm -fr ${s.svnPath}/`, function (error, stdout, stderr) {
        if (error) console.error(error)
        callback(null, s)
      })
    }
  }

  const checkoutTheme = (s) => {
    return function (s, callback) {
      console.log(`Checking out ${s.url}...`)
      const checkoutUrl = `${s.url}/`
      const targetPath = `${s.svnPath}/`
      exec(`svn co --force-interactive --username="${s.username}" ${checkoutUrl} ${targetPath}`, { maxBuffer: s.maxBuffer }, function (error, stdout, stderr) {
        if (error !== null) {
          console.error(`Checkout of ${s.url}/ unsuccessful: ${error}`)
        } else {
          console.log('Check out complete.')
        }
        callback(null, s)
      })
    }
  }

  const createThemeTag = (s) => {
    return function (s, callback) {
      console.log(`Creating tag ${s.newVersion}`)
      const cmd = `svn copy ${s.earlierVersion} ${s.newVersion}`
      exec(cmd, { cwd: s.svnPath }, function (error, stdout, stderr) {
        if (error !== null) {
          console.error(`Failed to create tag: ${error}`)
        }
        callback(null, s)
      })
    }
  }

  const clearTheme = (s) => {
    return function (s, callback) {
      console.log('Clearing theme.')
      exec(`rm -fr ${s.svnPath}/${s.newVersion}/*`, function (error, stdout, stderr) {
        if (error) console.error(error)
        callback(null, s)
      })
    }
  }

  const copyTheme = (s) => {
    return function (s, callback) {
      console.log(`Copying build directory: ${s.buildDir}`)
      copyDirectory(fs, s.buildDir, `${s.svnPath}/${s.newVersion}/`, function () {
        callback(null, s)
      })
    }
  }

  const addThemeFiles = (s) => {
    return function (s, callback) {
      console.log('Adding theme files')
      let cmd = 'svn resolve --accept working -R . && svn status |' + awk + " '/^[?]/{print $2}' | xargs " + noRunIfEmpty + 'svn add;'
      cmd += 'svn status | ' + awk + " '/^[!]/{print $2}' | xargs " + noRunIfEmpty + 'svn delete;'
      exec(cmd, { cwd: `${s.svnPath}/${s.newVersion}` }, function (error, stdout, stderr) {
        if (error) console.error(error)
        callback(null, s)
      })
    }
  }

  const commitTheme = (s) => {
    return function (s, callback) {
      const commitMsg = `Committing theme ${s.newVersion}`
      console.log(commitMsg)
      const cmd = `svn commit --force-interactive --username="${s.username}" -m "${commitMsg}"`
      exec(cmd, { cwd: `${s.svnPath}/${s.newVersion}` }, function (error, stdout, stderr) {
        if (error !== null) {
          console.error(chalk.red(`Failed to commit theme: ${error}`))
        }
        callback(null, s)
      })
    }
  }

  const steps = [
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
  ]

  return steps
}
