import path from 'node:path'
import os from 'node:os'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { getDefaults, resolveSettings } from '../lib/config.js'

describe('getDefaults', () => {
  it('returns defaults with slug and newVersion from pkg name and version', () => {
    const pkg = { name: 'my-plugin', version: '1.2.3' }
    const d = getDefaults(pkg)
    assert.strictEqual(d.slug, 'my-plugin')
    assert.strictEqual(d.newVersion, '1.2.3')
    assert.strictEqual(d.repoType, 'plugin')
    assert.strictEqual(d.buildDir, 'dist')
    assert.strictEqual(d.deployTrunk, true)
    assert.strictEqual(d.deployTag, true)
    assert.strictEqual(d.deployAssets, false)
    assert.strictEqual(d.username, '')
    assert.ok(!Object.prototype.hasOwnProperty.call(d, 'url'))
    assert.strictEqual(d.tmpDir, os.tmpdir())
    assert.strictEqual(d.maxBuffer, 200 * 1024)
  })

  it('uses pkg.name for mainFile default', () => {
    const pkg = { name: 'foo-bar', version: '0.0.1' }
    const d = getDefaults(pkg)
    assert.strictEqual(d.mainFile, 'foo-bar.php')
  })

  it('uses pkg.name verbatim as default slug (including scoped npm names)', () => {
    const pkg = { name: '@acme/my-plugin', version: '1.0.0' }
    const d = getDefaults(pkg)
    assert.strictEqual(d.slug, '@acme/my-plugin')
  })
})

describe('resolveSettings', () => {
  const basePkg = { name: 'my-plugin', version: '2.0.0' }

  it('merges defaults when pkg has no wpDeployer (still requires username)', () => {
    const { settings, error } = resolveSettings(basePkg)
    assert.strictEqual(error, 'username_required')
    assert.strictEqual(settings.slug, 'my-plugin')
    assert.strictEqual(settings.username, '')
  })

  it('returns username_required when username is missing (plugin)', () => {
    const { settings, error } = resolveSettings(basePkg)
    assert.strictEqual(error, 'username_required')
    assert.strictEqual(settings.username, '')
  })

  it('returns null error when username is provided (plugin)', () => {
    const pkg = { ...basePkg, wpDeployer: { username: 'jane' } }
    const { settings, error } = resolveSettings(pkg)
    assert.strictEqual(error, null)
    assert.strictEqual(settings.username, 'jane')
  })

  it('defaults url to plugins.svn.wordpress.org for plugin', () => {
    const pkg = { ...basePkg, wpDeployer: { username: 'jane' } }
    const { settings } = resolveSettings(pkg)
    assert.strictEqual(settings.url, 'https://plugins.svn.wordpress.org/my-plugin/')
  })

  it('defaults url to themes.svn.wordpress.org for theme when slug from pkg', () => {
    const pkg = { ...basePkg, wpDeployer: { username: 'jane', repoType: 'theme', earlierVersion: '1.0.0' } }
    const { settings } = resolveSettings(pkg)
    assert.strictEqual(settings.url, 'https://themes.svn.wordpress.org/my-plugin/')
  })

  it('returns invalid_config when wpDeployer sets url (not supported)', () => {
    const pkg = {
      ...basePkg,
      wpDeployer: {
        username: 'jane',
        url: 'https://custom.svn.example.com/repo/'
      }
    }
    const { error, errorMessage } = resolveSettings(pkg)
    assert.strictEqual(error, 'invalid_config')
    assert.ok(errorMessage && /wpDeployer\.url is not supported/.test(errorMessage))
  })

  it('normalizes svnPath from tmpDir + slug (tmpDir with trailing slash)', () => {
    const pkg = { ...basePkg, wpDeployer: { username: 'jane', tmpDir: '/tmp/' } }
    const { settings } = resolveSettings(pkg)
    assert.strictEqual(settings.svnPath, path.join('/tmp', 'my-plugin'))
  })

  it('normalizes svnPath when tmpDir has no trailing slash', () => {
    const pkg = { ...basePkg, wpDeployer: { username: 'jane', tmpDir: '/var/cache' } }
    const { settings } = resolveSettings(pkg)
    assert.strictEqual(settings.svnPath, path.join('/var/cache', 'my-plugin'))
  })

  it('normalizes buildDir with trailing slash', () => {
    const pkg = { ...basePkg, wpDeployer: { username: 'jane', buildDir: 'dist' } }
    const { settings } = resolveSettings(pkg)
    assert.strictEqual(settings.buildDir, 'dist/')
  })

  it('keeps buildDir trailing slash when already present', () => {
    const pkg = { ...basePkg, wpDeployer: { username: 'jane', buildDir: 'build/' } }
    const { settings } = resolveSettings(pkg)
    assert.strictEqual(settings.buildDir, 'build/')
  })

  it('returns theme_earlier_version_required for theme without earlierVersion', () => {
    const pkg = { ...basePkg, wpDeployer: { username: 'jane', repoType: 'theme' } }
    const { error } = resolveSettings(pkg)
    assert.strictEqual(error, 'theme_earlier_version_required')
  })

  it('returns null error for theme with earlierVersion', () => {
    const pkg = { ...basePkg, wpDeployer: { username: 'jane', repoType: 'theme', earlierVersion: '1.0.2' } }
    const { settings, error } = resolveSettings(pkg)
    assert.strictEqual(error, null)
    assert.strictEqual(settings.earlierVersion, '1.0.2')
  })

  it('merges wpDeployer over defaults (slug, buildDir, deployTrunk)', () => {
    const pkg = {
      ...basePkg,
      wpDeployer: {
        username: 'bob',
        slug: 'custom-slug',
        buildDir: 'out',
        deployTrunk: false,
        deployTag: false,
        deployAssets: true
      }
    }
    const { settings } = resolveSettings(pkg)
    assert.strictEqual(settings.slug, 'custom-slug')
    assert.strictEqual(settings.buildDir, 'out/')
    assert.strictEqual(settings.deployTrunk, false)
    assert.strictEqual(settings.deployTag, false)
    assert.strictEqual(settings.deployAssets, true)
    assert.strictEqual(
      settings.url,
      'https://plugins.svn.wordpress.org/custom-slug/',
      'default plugin url must use slug, not pkg.name'
    )
    assert.strictEqual(settings.svnPath, path.join(os.tmpdir(), 'custom-slug'))
    assert.strictEqual(settings.mainFile, 'custom-slug.php')
  })

  it('defaults plugin url from slug when slug differs from pkg.name', () => {
    const pkg = {
      name: 'my-company-plugin',
      version: '1.0.0',
      wpDeployer: { username: 'jane', slug: 'real-wp-slug' }
    }
    const { settings, error } = resolveSettings(pkg)
    assert.strictEqual(error, null)
    assert.strictEqual(settings.url, 'https://plugins.svn.wordpress.org/real-wp-slug/')
    assert.strictEqual(settings.svnPath, path.join(os.tmpdir(), 'real-wp-slug'))
    assert.strictEqual(settings.mainFile, 'real-wp-slug.php')
  })

  it('defaults theme url from slug when slug differs from pkg.name', () => {
    const pkg = {
      name: 'company-theme-pkg',
      version: '2.0.0',
      wpDeployer: {
        username: 'jane',
        repoType: 'theme',
        earlierVersion: '1.0.0',
        slug: 'theme-slug-on-org'
      }
    }
    const { settings, error } = resolveSettings(pkg)
    assert.strictEqual(error, null)
    assert.strictEqual(settings.url, 'https://themes.svn.wordpress.org/theme-slug-on-org/')
    assert.strictEqual(settings.svnPath, path.join(os.tmpdir(), 'theme-slug-on-org'))
    assert.strictEqual(settings.mainFile, 'theme-slug-on-org.php')
  })

  it('defaults svnPath to os.tmpdir + slug when tmpDir not set', () => {
    const pkg = { ...basePkg, wpDeployer: { username: 'jane' } }
    const { settings } = resolveSettings(pkg)
    assert.strictEqual(settings.svnPath, path.join(os.tmpdir(), 'my-plugin'))
  })

  it('keeps explicit mainFile when wpDeployer sets it (even if slug differs)', () => {
    const pkg = {
      name: 'npm-name',
      version: '1.0.0',
      wpDeployer: {
        username: 'jane',
        slug: 'wp-slug',
        mainFile: 'plugin-bootstrap.php'
      }
    }
    const { settings, error } = resolveSettings(pkg)
    assert.strictEqual(error, null)
    assert.strictEqual(settings.mainFile, 'plugin-bootstrap.php')
  })

  it('handles empty wpDeployer object', () => {
    const pkg = { ...basePkg, wpDeployer: {} }
    const { settings, error } = resolveSettings(pkg)
    assert.strictEqual(error, 'username_required')
    assert.strictEqual(settings.slug, 'my-plugin')
  })

  it('handles wpDeployer with only username', () => {
    const pkg = { ...basePkg, wpDeployer: { username: 'alice' } }
    const { settings, error } = resolveSettings(pkg)
    assert.strictEqual(error, null)
    assert.strictEqual(settings.username, 'alice')
    assert.strictEqual(settings.assetsDir, '.wordpress-org')
    assert.strictEqual(settings.maxBuffer, 200 * 1024)
    assert.strictEqual(settings.mainFile, 'my-plugin.php', 'mainFile follows slug when not set in wpDeployer')
  })

  it('returns invalid_new_version when package version is not SVN-safe', () => {
    const pkg = {
      name: 'x',
      version: '1.0.0/trunk',
      wpDeployer: { username: 'jane' }
    }
    const { error, errorMessage } = resolveSettings(pkg)
    assert.strictEqual(error, 'invalid_new_version')
    assert.ok(errorMessage && errorMessage.length > 0)
  })

  it('returns invalid_earlier_version when theme earlierVersion is not SVN-safe', () => {
    const pkg = {
      ...basePkg,
      version: '2.0.0',
      wpDeployer: {
        username: 'jane',
        repoType: 'theme',
        earlierVersion: '..'
      }
    }
    const { error, errorMessage } = resolveSettings(pkg)
    assert.strictEqual(error, 'invalid_earlier_version')
    assert.ok(errorMessage && errorMessage.length > 0)
  })

  it('normalizes valid newVersion via validator (trim not applied; invalid if padded)', () => {
    const pkg = { ...basePkg, version: '1.5.0', wpDeployer: { username: 'jane' } }
    const { settings, error } = resolveSettings(pkg)
    assert.strictEqual(error, null)
    assert.strictEqual(settings.newVersion, '1.5.0')
  })

  it('returns invalid_slug when slug contains a slash', () => {
    const pkg = { name: 'x', version: '1.0.0', wpDeployer: { slug: 'a/b', username: 'jane' } }
    const { error } = resolveSettings(pkg)
    assert.strictEqual(error, 'invalid_slug')
  })

  it('returns invalid_slug when default slug from scoped npm name is not a valid path segment', () => {
    const pkg = { name: '@acme/my-plugin', version: '1.0.0', wpDeployer: { username: 'jane' } }
    const { error } = resolveSettings(pkg)
    assert.strictEqual(error, 'invalid_slug')
  })

  it('returns invalid_config when merged settings fail JSON Schema (wrong type)', () => {
    const pkg = {
      ...basePkg,
      wpDeployer: { username: 'jane', maxBuffer: 'not-a-number' }
    }
    const { error, errorMessage } = resolveSettings(pkg)
    assert.strictEqual(error, 'invalid_config')
    assert.ok(errorMessage && errorMessage.length > 0)
  })

  it('returns invalid_config when wpDeployer sets unknown properties (additionalProperties)', () => {
    const pkg = {
      ...basePkg,
      wpDeployer: { username: 'jane', notARealOption: true }
    }
    const { error, errorMessage } = resolveSettings(pkg)
    assert.strictEqual(error, 'invalid_config')
    assert.ok(errorMessage && errorMessage.length > 0)
  })

  it('returns invalid_config when plugin has deployTag true and deployTrunk false', () => {
    const pkg = {
      ...basePkg,
      wpDeployer: { username: 'jane', deployTrunk: false, deployTag: true }
    }
    const { error, errorMessage } = resolveSettings(pkg)
    assert.strictEqual(error, 'invalid_config')
    assert.ok(errorMessage && /deployTag cannot be true when deployTrunk is false/.test(errorMessage))
  })
})
