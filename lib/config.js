/**
 * Config resolution: defaults + wpDeployer merge, url/svnPath/buildDir normalization.
 * Returns { settings, error }. error is set for validation failures (caller should exit).
 */

import merge from 'just-merge'

export function getDefaults (pkg) {
  return {
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
}

/**
 * Resolve settings from package.json. Does not exit; returns an error key if validation fails.
 * @param {object} pkg - Parsed package.json (must have name, version)
 * @returns {{ settings: object, error: null | 'username_required' | 'theme_earlier_version_required' }}
 */
export function resolveSettings (pkg) {
  const defaults = getDefaults(pkg)
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
    return { settings, error: 'username_required' }
  }

  if (!settings.earlierVersion && settings.repoType === 'theme') {
    return { settings, error: 'theme_earlier_version_required' }
  }

  return { settings, error: null }
}
