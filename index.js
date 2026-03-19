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
import { exec as execCb } from 'child_process'
import { promisify } from 'util'
import { resolveSettings } from './lib/config.js'
import { createPluginSteps, createThemeSteps } from './lib/steps.js'

const exec = promisify(execCb)

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

  const helpers = { exec, chalk, fs, awk, noRunIfEmpty }
  const steps = settings.repoType === 'plugin'
    ? createPluginSteps(settings, helpers)
    : createThemeSteps(settings, helpers)

  try {
    let s = settings
    for (const step of steps) {
      s = await step(s)
    }
  } catch (err) {
    console.error(chalk.red(err))
  }
}

wpDeployer()
