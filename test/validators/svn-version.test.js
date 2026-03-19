import { describe, it } from 'node:test'
import assert from 'node:assert'
import { validateSvnSafeVersion, isSvnSafeVersion } from '../../lib/validators/index.js'

describe('validateSvnSafeVersion', () => {
  const ok = (input) => {
    const r = validateSvnSafeVersion(input)
    assert.strictEqual(r.ok, true, String(r.ok === false ? r.message : ''))
    if (r.ok) assert.strictEqual(r.value, input)
  }

  const bad = (input, code) => {
    const r = validateSvnSafeVersion(input)
    assert.strictEqual(r.ok, false)
    assert.strictEqual(r.code, code)
  }

  it('accepts common WordPress-style versions', () => {
    ok('1.0.0')
    ok('2.1.3')
    ok('1.0.0-beta.1')
    ok('1.0.0-rc.2')
    ok('1.0.0+build.1')
    ok('v1.2.3')
    ok('0.0.1')
  })

  it('accepts single segment tags', () => {
    ok('1')
    ok('a')
  })

  it('rejects empty and non-strings', () => {
    bad('', 'empty')
    bad('   ', 'empty')
    bad(null, 'invalid_type')
    bad(undefined, 'invalid_type')
    bad(123, 'invalid_type')
  })

  it('rejects leading or trailing whitespace', () => {
    bad(' 1.0.0', 'whitespace')
    bad('1.0.0 ', 'whitespace')
  })

  it('rejects path-like and reserved segments', () => {
    bad('.', 'reserved')
    bad('..', 'reserved')
    bad('1..0', 'path_unsafe')
    bad('1.0.0/trunk', 'path_unsafe')
    bad('1.0.0\\win', 'path_unsafe')
  })

  it('rejects shell-sensitive characters', () => {
    bad('1.0.0;rm', 'shell_unsafe')
    bad('1.0 0', 'shell_unsafe')
    bad('1.0.0$(x)', 'shell_unsafe')
  })

  it('rejects non-ASCII', () => {
    bad('1.0.0β', 'non_ascii')
  })

  it('rejects overly long strings', () => {
    bad('a'.repeat(129), 'too_long')
  })

  it('rejects odd punctuation for tag shape', () => {
    bad('1.0.0@x', 'format')
    bad('^1.0.0', 'format')
    bad('.1.0', 'format')
    bad('1..0.0', 'path_unsafe')
  })

  it('isSvnSafeVersion mirrors ok', () => {
    assert.strictEqual(isSvnSafeVersion('1.0.0'), true)
    assert.strictEqual(isSvnSafeVersion('1/0'), false)
  })
})
