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
import { exec } from 'child_process'
import { waterfall } from 'async'
import { resolveSettings } from './lib/config.js'
import { createPluginSteps, createThemeSteps } from './lib/steps.js'

const pkg = fs.readJsonSync('./package.json')

const awk = process.platform === 'win32' ? 'gawk' : 'awk'
const noRunIfEmpty = process.platform !== 'darwin' ? '--no-run-if-empty ' : ''

const wpDeployer = async () => {
  console.log(chalk.cyan('Processing...'))

  const { settings, error } = resolveSettings(pkg)
  if (error === 'username_required') {
    console.error(chalk.red('Username is required.'))
    process.exit()
  }
  if (error === 'theme_earlier_version_required') {
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
