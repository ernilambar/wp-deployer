#!/usr/bin/env node

/**
 * wp-deployer
 *
 * Deploys a WordPress plugin or theme to the WordPress.org SVN repo.
 * Config is read from package.json under the "wpDeployer" key.
 * Run from the project root (where package.json and wpDeployer config live).
 */

import fs from 'fs-extra'
import chalk from 'chalk'
import merge from 'just-merge'
import { exec } from 'child_process'
import { waterfall } from 'async'
import { createPluginSteps, createThemeSteps } from './lib/steps.js'

const pkg = fs.readJsonSync('./package.json')

const awk = process.platform === 'win32' ? 'gawk' : 'awk'
const noRunIfEmpty = process.platform !== 'darwin' ? '--no-run-if-empty ' : ''

const wpDeployer = async () => {
  console.log(chalk.cyan('Processing...'))

  // Resolve config: defaults + package.json "wpDeployer"
  // wpDeployer options (all optional except username; theme also requires earlierVersion):
  //   slug          - Plugin/theme slug; default: package.json "name"
  //   url           - SVN repo URL; default: plugins or themes .svn.wordpress.org from slug
  //   username      - (required) WordPress.org SVN username
  //   repoType      - 'plugin' | 'theme'; default: 'plugin'
  //   buildDir      - Dir to deploy from; default: 'dist'
  //   maxBuffer     - exec maxBuffer (bytes); default: 200*1024
  //   deployTrunk   - (plugin) Deploy to trunk; default: true
  //   deployTag     - (plugin) Create tag from trunk; default: true
  //   deployAssets  - (plugin) Deploy assets dir; default: false
  //   assetsDir     - (plugin) Dir for .wordpress-org assets; default: '.wordpress-org'
  //   tmpDir        - Temp dir for SVN checkout; default: '/tmp/'
  //   earlierVersion - (theme, required) Last released version for tag copy
  //   newVersion    - Version to deploy; default: package.json "version"
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

  // Build steps and run waterfall (same step sequence and callback contract as before)
  const helpers = { exec, chalk, fs, awk, noRunIfEmpty }
  const steps = settings.repoType === 'plugin'
    ? createPluginSteps(settings, helpers)
    : createThemeSteps(settings, helpers)

  waterfall(steps, function (err, result) {
    if (err) console.error(chalk.red(err))
  })
}

wpDeployer()
