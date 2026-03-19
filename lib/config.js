/**
 * Config resolution: defaults + wpDeployer merge, url/svnPath/buildDir normalization.
 * Returns { settings, error }. error is set for validation failures (caller should exit).
 */

import merge from 'just-merge'
import { validateSvnSafeVersion, validateSvnUrl } from './validators/index.js'
import { hasPathUnsafeChars } from './validators/shared.js'

export function getDefaults (pkg) {
  return {
    url: '',
    slug: `${pkg.name}`,
    // Seeded from pkg.name; resolveSettings aligns with slug when wpDeployer omits mainFile
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
}

/**
 * Resolve settings from package.json. Does not exit; returns an error key if validation fails.
 * @param {object} pkg - Parsed package.json (must have name, version)
 * @returns {{ settings: object, error: null | 'invalid_slug' | 'username_required' | 'theme_earlier_version_required' | 'invalid_svn_url' | 'invalid_new_version' | 'invalid_earlier_version', errorMessage?: string }}
 */
export function resolveSettings (pkg) {
  const defaults = getDefaults(pkg)
  const wpDeployer = Object.prototype.hasOwnProperty.call(pkg, 'wpDeployer') ? pkg.wpDeployer : {}
  let settings = merge(defaults, wpDeployer)

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

  settings = merge(settings, {
    svnPath: settings.tmpDir.replace(/\/$|$/, '/') + settings.slug
  })

  settings.buildDir = settings.buildDir.replace(/\/$|$/, '/')

  // Default WordPress.org SVN URLs follow `slug` (merged default: pkg.name), not pkg.name directly.
  if (!settings.url) {
    if (settings.repoType === 'plugin') {
      settings.url = `https://plugins.svn.wordpress.org/${settings.slug}/`
    } else if (settings.repoType === 'theme') {
      settings.url = `https://themes.svn.wordpress.org/${settings.slug}/`
    }
  }

  const urlResult = validateSvnUrl(settings.url)
  if (!urlResult.ok) {
    return {
      settings,
      error: 'invalid_svn_url',
      errorMessage: urlResult.message
    }
  }
  settings.url = urlResult.value

  if (!settings.username) {
    return { settings, error: 'username_required' }
  }

  if (!settings.earlierVersion && settings.repoType === 'theme') {
    return { settings, error: 'theme_earlier_version_required' }
  }

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
