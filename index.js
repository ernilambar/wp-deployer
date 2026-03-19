#!/usr/bin/env node

/**
 * wp-deployer
 *
 * Deploys a WordPress plugin or theme to the WordPress.org SVN repo.
 * Config is read from package.json under the "wpDeployer" key.
 * Run from the project root (where package.json and wpDeployer config live).
 *
 * Exit codes: 0 success, 1 config/validation/preflight, 2 deploy failure, 130 SIGINT.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import chalk from 'chalk'
import minimist from 'minimist'
import { exec as execCb } from 'child_process'
import { promisify } from 'util'
import { resolveSettings } from './lib/config.js'
import { createPluginSteps, createThemeSteps } from './lib/steps.js'
import { runPreflightSync } from './lib/preflight.js'
import { DeployError } from './lib/deploy-error.js'
import { EXIT_SUCCESS, EXIT_CONFIG, EXIT_RUNTIME, EXIT_SIGINT } from './lib/exit-codes.js'

const exec = promisify(execCb)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const argv = minimist(process.argv.slice(2), {
  boolean: ['help', 'version'],
  alias: { h: 'help', v: 'version' }
})

function printHelp () {
  console.log(`Usage: wp-deployer [options]

Deploy a WordPress plugin or theme to WordPress.org SVN using wpDeployer in package.json.

Options:
  --help, -h     Show this message
  --version, -v  Print wp-deployer version
`)
}

function printVersion () {
  const selfPkg = fs.readJsonSync(path.join(__dirname, 'package.json'))
  console.log(selfPkg.version)
}

if (argv.help) {
  printHelp()
  process.exit(EXIT_SUCCESS)
}

if (argv.version) {
  printVersion()
  process.exit(EXIT_SUCCESS)
}

const pkgPath = path.join(process.cwd(), 'package.json')
const pkg = fs.readJsonSync(pkgPath)

const awk = process.platform === 'win32' ? 'gawk' : 'awk'
const noRunIfEmpty = process.platform !== 'darwin' ? '--no-run-if-empty ' : ''

process.on('SIGINT', () => {
  console.error(chalk.yellow('Interrupted.'))
  process.exit(EXIT_SIGINT)
})

const wpDeployer = async () => {
  console.log(chalk.cyan('Processing...'))

  const { settings, error, errorMessage } = resolveSettings(pkg)
  if (error === 'invalid_slug') {
    console.error(chalk.red(`Invalid slug: ${errorMessage}`))
    return EXIT_CONFIG
  }
  if (error === 'username_required') {
    console.error(chalk.red('Username is required.'))
    return EXIT_CONFIG
  }
  if (error === 'theme_earlier_version_required') {
    console.error(chalk.red('For repoType theme, earlierVersion is required.'))
    return EXIT_CONFIG
  }
  if (error === 'invalid_new_version') {
    console.error(chalk.red(`Invalid package version for SVN (newVersion): ${errorMessage}`))
    return EXIT_CONFIG
  }
  if (error === 'invalid_earlier_version') {
    console.error(chalk.red(`Invalid earlierVersion for SVN: ${errorMessage}`))
    return EXIT_CONFIG
  }
  if (error === 'invalid_svn_url') {
    console.error(chalk.red(`Invalid SVN URL: ${errorMessage}`))
    return EXIT_CONFIG
  }
  if (error === 'invalid_config') {
    console.error(chalk.red(errorMessage || 'Invalid wpDeployer configuration.'))
    return EXIT_CONFIG
  }

  try {
    runPreflightSync(settings, { fs, awk })
  } catch (e) {
    if (e instanceof DeployError) {
      console.error(chalk.red(e.message))
      return e.exitCode
    }
    throw e
  }

  const helpers = { exec, fs, awk, noRunIfEmpty }
  const steps = settings.repoType === 'plugin'
    ? createPluginSteps(settings, helpers)
    : createThemeSteps(settings, helpers)

  try {
    let s = settings
    for (const step of steps) {
      s = await step(s)
    }
    console.log(chalk.green('Finished successfully.'))
    return EXIT_SUCCESS
  } catch (err) {
    console.error(chalk.red(err?.message || err))
    return EXIT_RUNTIME
  }
}

wpDeployer()
  .then((code) => {
    process.exit(code ?? EXIT_SUCCESS)
  })
  .catch((err) => {
    if (err instanceof DeployError) {
      console.error(chalk.red(err.message))
      process.exit(err.exitCode)
    }
    console.error(chalk.red(err?.message || err))
    process.exit(EXIT_RUNTIME)
  })
