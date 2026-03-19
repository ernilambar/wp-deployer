import { describe, it } from 'node:test'
import assert from 'node:assert'
import { validateSvnUrl, isSvnUrl } from '../../lib/validators/index.js'

describe('validateSvnUrl', () => {
  it('accepts https WordPress.org-style URLs', () => {
    const r = validateSvnUrl('https://plugins.svn.wordpress.org/my-plugin/')
    assert.strictEqual(r.ok, true)
    if (r.ok) assert.ok(r.value.startsWith('https://plugins.svn.wordpress.org/'))
  })

  it('normalizes via URL parsing (href)', () => {
    const r = validateSvnUrl('https://plugins.svn.wordpress.org/my-plugin')
    assert.strictEqual(r.ok, true)
    if (r.ok) assert.ok(r.value.includes('plugins.svn.wordpress.org'))
  })

  it('accepts svn and svn+ssh', () => {
    assert.strictEqual(validateSvnUrl('svn://svn.example.org/repo').ok, true)
    assert.strictEqual(validateSvnUrl('svn+ssh://user@svn.example.org/repo').ok, true)
  })

  it('accepts file URLs with a path', () => {
    const r = validateSvnUrl('file:///tmp/local-svn/repo')
    assert.strictEqual(r.ok, true)
  })

  it('rejects invalid URLs', () => {
    assert.strictEqual(validateSvnUrl('not-a-url').ok, false)
    assert.strictEqual(validateSvnUrl('').ok, false)
  })

  it('rejects unsupported schemes', () => {
    const r = validateSvnUrl('ftp://example.com/repo')
    assert.strictEqual(r.ok, false)
    if (!r.ok) assert.strictEqual(r.code, 'unsupported_scheme')
  })

  it('rejects file URL without repo path', () => {
    const r = validateSvnUrl('file:///')
    assert.strictEqual(r.ok, false)
    if (!r.ok) assert.strictEqual(r.code, 'invalid_file_url')
  })

  it('rejects leading/trailing whitespace', () => {
    assert.strictEqual(validateSvnUrl(' https://a.com/').ok, false)
  })

  it('isSvnUrl mirrors ok', () => {
    assert.strictEqual(isSvnUrl('https://themes.svn.wordpress.org/foo/'), true)
    assert.strictEqual(isSvnUrl('bogus'), false)
  })
})
