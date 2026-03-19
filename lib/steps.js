/**
 * Step factories for the deploy pipeline.
 * Each step is an async function (settings) => settings used in sequence.
 * Config and helpers are passed in; this module does not read package.json.
 */

function copyDirectory (fs, srcDir, destDir) {
  if (srcDir.slice(-1) !== '/') {
    srcDir = `${srcDir}/`
  }
  fs.copySync(srcDir, destDir)
}

export function createPluginSteps (settings, { exec, chalk, fs, awk, noRunIfEmpty }) {
  const clearTrunk = (s) => {
    return async function (s) {
      console.log('Clearing trunk.')
      try {
        await exec(`rm -fr ${s.svnPath}/trunk/*`)
      } catch (error) {
        console.error(error)
      }
      return s
    }
  }

  const clearAssets = (s) => {
    return async function (s) {
      console.log('Clearing assets.')
      try {
        await exec(`rm -fr ${s.svnPath}/assets/*`)
      } catch (error) {
        console.error(error)
      }
      return s
    }
  }

  const checkoutDir = (dir, s) => {
    return async function (s) {
      console.log(`Checking out ${s.url}${dir}/...`)
      const checkoutUrl = `${s.url}${dir}/`
      const targetPath = `${s.svnPath}/${dir}`
      try {
        await exec(`svn co --force-interactive --username="${s.username}" ${checkoutUrl} ${targetPath}`, { maxBuffer: s.maxBuffer })
        console.log('Check out complete.')
      } catch (error) {
        console.error(`Checkout of ${s.url}${dir}/ unsuccessful: ${error}`)
      }
      return s
    }
  }

  const copyBuild = (s) => {
    return async function (s) {
      console.log(`Copying build directory: ${s.buildDir}`)
      copyDirectory(fs, s.buildDir, `${s.svnPath}/trunk/`)
      return s
    }
  }

  const addFiles = (s) => {
    return async function (s) {
      console.log('Adding files in trunk')
      let cmd = 'svn resolve --accept working -R . && svn status |' + awk + " '/^[?]/{print $2}' | xargs " + noRunIfEmpty + 'svn add;'
      cmd += 'svn status | ' + awk + " '/^[!]/{print $2}' | xargs " + noRunIfEmpty + 'svn delete;'
      try {
        await exec(cmd, { cwd: `${s.svnPath}/trunk` })
      } catch (error) {
        console.error(error)
      }
      return s
    }
  }

  const commitToTrunk = (s) => {
    return async function (s) {
      const commitMsg = `Committing ${s.newVersion} to trunk`
      const cmd = `svn commit --force-interactive --username="${s.username}" -m "${commitMsg}"`
      try {
        await exec(cmd, { cwd: `${s.svnPath}/trunk` })
      } catch (error) {
        console.error(chalk.red(`Failed to commit to trunk: ${error}`))
      }
      return s
    }
  }

  const commitTag = (s) => {
    return async function (s) {
      const tagCommitMsg = `Tagging ${s.newVersion}`
      console.log(tagCommitMsg)
      const cmd = 'svn copy ' + s.url + 'trunk/ ' + s.url + 'tags/' + s.newVersion + '/ ' + ' ' + ' --force-interactive --username="' + s.username + '" -m "' + tagCommitMsg + '"'
      try {
        await exec(cmd, { cwd: s.svnPath })
      } catch (error) {
        console.error(`Failed to commit tag: ${error}`)
      }
      return s
    }
  }

  const copyAssets = (s) => {
    return async function (s) {
      console.log('Copying assets')
      copyDirectory(fs, s.assetsDir, `${s.svnPath}/assets/`)
      return s
    }
  }

  const addAssets = (s) => {
    return async function (s) {
      console.log('Adding assets')
      let cmd = 'svn resolve --accept working -R . && svn status |' + awk + " '/^[?]/{print $2}' | xargs " + noRunIfEmpty + 'svn add;'
      cmd += 'svn status | ' + awk + " '/^[!]/{print $2}' | xargs " + noRunIfEmpty + 'svn delete;'
      try {
        await exec(cmd, { cwd: `${s.svnPath}/assets` })
      } catch (error) {
        console.error(error)
      }
      return s
    }
  }

  const commitToAssets = (s) => {
    return async function (s) {
      const commitMsg = 'Committing assets'
      const cmd = `svn commit --force-interactive --username="${s.username}" -m "${commitMsg}"`
      try {
        await exec(cmd, { cwd: `${s.svnPath}/assets` })
      } catch (error) {
        console.error(chalk.red(`Failed to commit to assets: ${error}`))
      }
      return s
    }
  }

  const steps = [
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
    return async function (s) {
      console.log('Preparing temporary folder.')
      try {
        await exec(`rm -fr ${s.svnPath}/`)
      } catch (error) {
        console.error(error)
      }
      return s
    }
  }

  const checkoutTheme = (s) => {
    return async function (s) {
      console.log(`Checking out ${s.url}...`)
      const checkoutUrl = `${s.url}/`
      const targetPath = `${s.svnPath}/`
      try {
        await exec(`svn co --force-interactive --username="${s.username}" ${checkoutUrl} ${targetPath}`, { maxBuffer: s.maxBuffer })
        console.log('Check out complete.')
      } catch (error) {
        console.error(`Checkout of ${s.url}/ unsuccessful: ${error}`)
      }
      return s
    }
  }

  const createThemeTag = (s) => {
    return async function (s) {
      console.log(`Creating tag ${s.newVersion}`)
      const cmd = `svn copy ${s.earlierVersion} ${s.newVersion}`
      try {
        await exec(cmd, { cwd: s.svnPath })
      } catch (error) {
        console.error(`Failed to create tag: ${error}`)
      }
      return s
    }
  }

  const clearTheme = (s) => {
    return async function (s) {
      console.log('Clearing theme.')
      try {
        await exec(`rm -fr ${s.svnPath}/${s.newVersion}/*`)
      } catch (error) {
        console.error(error)
      }
      return s
    }
  }

  const copyTheme = (s) => {
    return async function (s) {
      console.log(`Copying build directory: ${s.buildDir}`)
      copyDirectory(fs, s.buildDir, `${s.svnPath}/${s.newVersion}/`)
      return s
    }
  }

  const addThemeFiles = (s) => {
    return async function (s) {
      console.log('Adding theme files')
      let cmd = 'svn resolve --accept working -R . && svn status |' + awk + " '/^[?]/{print $2}' | xargs " + noRunIfEmpty + 'svn add;'
      cmd += 'svn status | ' + awk + " '/^[!]/{print $2}' | xargs " + noRunIfEmpty + 'svn delete;'
      try {
        await exec(cmd, { cwd: `${s.svnPath}/${s.newVersion}` })
      } catch (error) {
        console.error(error)
      }
      return s
    }
  }

  const commitTheme = (s) => {
    return async function (s) {
      const commitMsg = `Committing theme ${s.newVersion}`
      console.log(commitMsg)
      const cmd = `svn commit --force-interactive --username="${s.username}" -m "${commitMsg}"`
      try {
        await exec(cmd, { cwd: `${s.svnPath}/${s.newVersion}` })
      } catch (error) {
        console.error(chalk.red(`Failed to commit theme: ${error}`))
      }
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
    commitTheme(settings)
  ]

  return steps
}
