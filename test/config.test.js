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
    assert.strictEqual(d.url, '')
    assert.strictEqual(d.tmpDir, '/tmp/')
    assert.strictEqual(d.maxBuffer, 200 * 1024)
  })

  it('uses pkg.name for mainFile default', () => {
    const pkg = { name: 'foo-bar', version: '0.0.1' }
    const d = getDefaults(pkg)
    assert.strictEqual(d.mainFile, 'foo-bar.php')
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

  it('keeps custom url when provided', () => {
    const custom = 'https://custom.svn.example.com/repo/'
    const pkg = { ...basePkg, wpDeployer: { username: 'jane', url: custom } }
    const { settings } = resolveSettings(pkg)
    assert.strictEqual(settings.url, custom)
  })

  it('normalizes svnPath from tmpDir + slug (tmpDir with trailing slash)', () => {
    const pkg = { ...basePkg, wpDeployer: { username: 'jane', tmpDir: '/tmp/' } }
    const { settings } = resolveSettings(pkg)
    assert.strictEqual(settings.svnPath, '/tmp/my-plugin')
  })

  it('normalizes svnPath when tmpDir has no trailing slash', () => {
    const pkg = { ...basePkg, wpDeployer: { username: 'jane', tmpDir: '/var/cache' } }
    const { settings } = resolveSettings(pkg)
    assert.strictEqual(settings.svnPath, '/var/cache/my-plugin')
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
        deployAssets: true
      }
    }
    const { settings } = resolveSettings(pkg)
    assert.strictEqual(settings.slug, 'custom-slug')
    assert.strictEqual(settings.buildDir, 'out/')
    assert.strictEqual(settings.deployTrunk, false)
    assert.strictEqual(settings.deployAssets, true)
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
  })
})
