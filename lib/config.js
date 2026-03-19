/**
 * Config resolution: defaults + wpDeployer merge, svnPath/buildDir normalization,
 * and WordPress.org SVN base URL (derived from repoType + slug).
 * Returns { settings, error }. error is set for validation failures (caller should exit).
 */

import path from 'node:path'
import os from 'node:os'
import { validateSettingsSchema } from './config-schema.js'
import { validateSvnSafeVersion, validateSvnUrl } from './validators/index.js'
import { hasPathUnsafeChars } from './validators/shared.js'

function wordpressOrgSvnBaseUrl (repoType, slug) {
  if (repoType === 'theme') {
    return `https://themes.svn.wordpress.org/${slug}/`
  }
  return `https://plugins.svn.wordpress.org/${slug}/`
}

export function getDefaults (pkg) {
  return {
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
    tmpDir: os.tmpdir(),
    earlierVersion: '',
    newVersion: pkg.version
  }
}

/**
 * Resolve settings from package.json. Does not exit; returns an error key if validation fails.
 * @param {object} pkg - Parsed package.json (must have name, version)
 * @returns {{ settings: object, error: null | 'invalid_slug' | 'username_required' | 'theme_earlier_version_required' | 'invalid_config' | 'invalid_svn_url' | 'invalid_new_version' | 'invalid_earlier_version', errorMessage?: string }}
 */
export function resolveSettings (pkg) {
  const defaults = getDefaults(pkg)
  const wpDeployer = Object.prototype.hasOwnProperty.call(pkg, 'wpDeployer') ? pkg.wpDeployer : {}
  let settings = { ...defaults, ...wpDeployer }

  if (Object.prototype.hasOwnProperty.call(wpDeployer, 'url')) {
    return {
      settings,
      error: 'invalid_config',
      errorMessage:
        'wpDeployer.url is not supported; SVN URL is derived from repoType and slug.'
    }
  }

  const slug = settings.slug
  if (typeof slug !== 'string' || slug.length === 0) {
    return { settings, error: 'invalid_slug', errorMessage: 'slug must be a non-empty string.' }
  }
  if (slug !== slug.trim()) {
    return { settings, error: 'invalid_slug', errorMessage: 'slug must not have leading or trailing whitespace.' }
  }
  if (slug === '.' || slug === '..' || slug.includes('..')) {
    return { settings, error: 'invalid_slug', errorMessage: 'slug must not be "." or ".." or contain "..".' }
  }
  if (hasPathUnsafeChars(slug)) {
    return {
      settings,
      error: 'invalid_slug',
      errorMessage: 'slug must be a single path segment (no / or \\).'
    }
  }

  if (!Object.prototype.hasOwnProperty.call(wpDeployer, 'mainFile')) {
    settings.mainFile = `${settings.slug}.php`
  }

  settings = {
    ...settings,
    svnPath: path.join(settings.tmpDir, settings.slug)
  }

  settings.buildDir = settings.buildDir.replace(/\/$|$/, '/')

  const schemaResult = validateSettingsSchema(settings)
  if (!schemaResult.ok) {
    return {
      settings,
      error: schemaResult.error,
      ...(schemaResult.errorMessage !== undefined && { errorMessage: schemaResult.errorMessage })
    }
  }

  if (
    settings.repoType === 'plugin' &&
    settings.deployTag === true &&
    settings.deployTrunk === false
  ) {
    return {
      settings,
      error: 'invalid_config',
      errorMessage:
        'For plugins, deployTag cannot be true when deployTrunk is false. Deploy trunk first (or set deployTag to false).'
    }
  }

  settings.url = wordpressOrgSvnBaseUrl(settings.repoType, settings.slug)

  const urlResult = validateSvnUrl(settings.url)
  if (!urlResult.ok) {
    return {
      settings,
      error: 'invalid_svn_url',
      errorMessage: urlResult.message
    }
  }
  settings.url = urlResult.value

  const newVersionResult = validateSvnSafeVersion(settings.newVersion)
  if (!newVersionResult.ok) {
    return {
      settings,
      error: 'invalid_new_version',
      errorMessage: newVersionResult.message
    }
  }
  settings.newVersion = newVersionResult.value

  if (settings.repoType === 'theme') {
    const earlierResult = validateSvnSafeVersion(settings.earlierVersion)
    if (!earlierResult.ok) {
      return {
        settings,
        error: 'invalid_earlier_version',
        errorMessage: earlierResult.message
      }
    }
    settings.earlierVersion = earlierResult.value
  }

  return { settings, error: null }
}
