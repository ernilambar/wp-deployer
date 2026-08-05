/**
 * Locates the wpDeployer settings object: package.json#wpDeployer,
 * a standalone wp-deployer.json, or an explicit --config path.
 * package.json#wpDeployer and wp-deployer.json are mutually exclusive.
 */

import path from 'node:path'

export const CONFIG_FILE_NAME = 'wp-deployer.json'

/**
 * @param {object} pkg - Parsed package.json
 * @param {{ fs: import('fs-extra').default, cwd: string, configPath?: string }} io
 * @returns {{ wpDeployerConfig: object, error: null } | { wpDeployerConfig: null, error: 'duplicate_config' | 'config_file_not_found' | 'invalid_config_json', errorMessage: string }}
 */
export function loadConfigSource (pkg, { fs, cwd, configPath }) {
  if (configPath) {
    return readConfigFile(fs, path.resolve(cwd, configPath))
  }

  const pkgHasWpDeployer = Object.prototype.hasOwnProperty.call(pkg, 'wpDeployer')
  const defaultConfigFile = path.join(cwd, CONFIG_FILE_NAME)
  const defaultConfigExists = fs.existsSync(defaultConfigFile)

  if (defaultConfigExists && pkgHasWpDeployer) {
    return {
      wpDeployerConfig: null,
      error: 'duplicate_config',
      errorMessage: `Config found in both package.json#wpDeployer and ${CONFIG_FILE_NAME}. Remove one — refusing to guess which is authoritative.`
    }
  }

  if (defaultConfigExists) {
    return readConfigFile(fs, defaultConfigFile)
  }

  return { wpDeployerConfig: pkgHasWpDeployer ? pkg.wpDeployer : {}, error: null }
}

function readConfigFile (fs, filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      wpDeployerConfig: null,
      error: 'config_file_not_found',
      errorMessage: `Config file not found: ${filePath}`
    }
  }

  const raw = fs.readFileSync(filePath, 'utf8')

  try {
    return { wpDeployerConfig: JSON.parse(raw), error: null }
  } catch (e) {
    return {
      wpDeployerConfig: null,
      error: 'invalid_config_json',
      errorMessage: `Invalid JSON in config file ${filePath}: ${e.message}`
    }
  }
}
