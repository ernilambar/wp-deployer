/**
 * Validate repository URLs used with SVN (http(s), svn, svn+ssh, file).
 * Extend this module when adding stricter WordPress.org host checks, etc.
 */

import { requireNonEmptyTrimmedString, hasAsciiControlOrNul } from './shared.js'

const DEFAULT_SCHEMES = new Set(['http:', 'https:', 'svn:', 'svn+ssh:', 'file:'])

/**
 * @param {unknown} input
 * @param {{
 *   schemes?: Set<string>,
 *   label?: string
 * }} [options]
 * @returns {import('./shared.js').ValidationResult}
 */
export function validateSvnUrl (input, options = {}) {
  const schemes = options.schemes ?? DEFAULT_SCHEMES
  const label = options.label ?? 'SVN URL'

  const base = requireNonEmptyTrimmedString(input, { label })
  if (!base.ok) return base

  const trimmed = base.value

  if (hasAsciiControlOrNul(trimmed)) {
    return {
      ok: false,
      code: 'invalid_characters',
      message: `${label} must not contain control characters or NUL.`
    }
  }

  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    return {
      ok: false,
      code: 'parse_error',
      message: `${label} is not a valid absolute URL.`
    }
  }

  if (!schemes.has(parsed.protocol)) {
    return {
      ok: false,
      code: 'unsupported_scheme',
      message: `${label} must use one of: ${[...schemes].join(', ')}.`
    }
  }

  if (parsed.protocol === 'file:') {
    if (!parsed.pathname || parsed.pathname === '/') {
      return {
        ok: false,
        code: 'invalid_file_url',
        message: `${label} file URL must include a repository path.`
      }
    }
  } else {
    if (!parsed.hostname) {
      return {
        ok: false,
        code: 'missing_host',
        message: `${label} must include a hostname.`
      }
    }
  }

  return { ok: true, value: parsed.href }
}

/**
 * @param {unknown} input
 * @param {{ schemes?: Set<string> }} [options]
 * @returns {boolean}
 */
export function isSvnUrl (input, options) {
  return validateSvnUrl(input, options).ok
}
