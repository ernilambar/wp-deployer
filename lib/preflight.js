/**
 * Pre-deploy checks: required tools on PATH, build/assets directories.
 */

import path from 'node:path'
import { execSync } from 'child_process'
import { DeployError } from './deploy-error.js'
import { EXIT_CONFIG } from './exit-codes.js'

/**
 * @param {string} command - Executable name (no spaces)
 */
function assertOnPath (command) {
  try {
    if (process.platform === 'win32') {
      execSync(`where ${command}`, { stdio: 'ignore' })
    } else {
      execSync(`command -v ${command}`, { stdio: 'ignore', shell: true })
    }
  } catch {
    throw new DeployError(
      `${command} not found on PATH. Install it or fix your environment.`,
      EXIT_CONFIG
    )
  }
}

function stripTrailingSlash (dir) {
  return dir.replace(/\/+$/, '') || dir
}

function needsBuildCopy (settings) {
  if (settings.repoType === 'theme') return true
  return settings.deployTrunk === true
}

function needsAssetsDir (settings) {
  return settings.repoType === 'plugin' && settings.deployAssets === true
}

function needsAwk (settings) {
  if (settings.repoType === 'theme') return true
  return settings.deployTrunk === true || settings.deployAssets === true
}

/**
 * @param {object} settings - Resolved wpDeployer settings
 * @param {{ fs: import('fs-extra').default, awk: string }} io
 * @param {{ checkCommands?: boolean }} [options] - Set checkCommands false in tests only
 */
export function runPreflightSync (settings, { fs, awk }, options = {}) {
  const { checkCommands = true } = options

  if (checkCommands) {
    assertOnPath('svn')
    if (needsAwk(settings)) {
      assertOnPath(awk)
    }
  }

  const cwd = process.cwd()

  if (needsBuildCopy(settings)) {
    const rel = stripTrailingSlash(settings.buildDir)
    const abs = path.resolve(cwd, rel)
    if (!fs.existsSync(abs)) {
      throw new DeployError(
        `buildDir does not exist: ${settings.buildDir} (resolved to ${abs})`,
        EXIT_CONFIG
      )
    }
    if (!fs.statSync(abs).isDirectory()) {
      throw new DeployError(
        `buildDir is not a directory: ${settings.buildDir}`,
        EXIT_CONFIG
      )
    }
    const entries = fs.readdirSync(abs)
    if (entries.length === 0) {
      throw new DeployError(
        `buildDir is empty: ${settings.buildDir}. Build your project before deploying.`,
        EXIT_CONFIG
      )
    }
  }

  if (needsAssetsDir(settings)) {
    const rel = stripTrailingSlash(settings.assetsDir)
    const abs = path.resolve(cwd, rel)
    if (!fs.existsSync(abs)) {
      throw new DeployError(
        `assetsDir does not exist: ${settings.assetsDir} (resolved to ${abs})`,
        EXIT_CONFIG
      )
    }
    if (!fs.statSync(abs).isDirectory()) {
      throw new DeployError(
        `assetsDir is not a directory: ${settings.assetsDir}`,
        EXIT_CONFIG
      )
    }
  }
}
