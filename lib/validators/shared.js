/**
 * Shared helpers for SVN-related string validation (versions, URLs, paths).
 */

/** @typedef {{ ok: true, value: string }} ValidationOk */
/** @typedef {{ ok: false, code: string, message: string }} ValidationErr */
/** @typedef {ValidationOk | ValidationErr} ValidationResult */

/**
 * @param {unknown} input
 * @param {{ label?: string }} [options]
 * @returns {ValidationResult}
 */
export function requireNonEmptyTrimmedString (input, options = {}) {
  const label = options.label ?? 'Value'

  if (input === null || input === undefined) {
    return { ok: false, code: 'invalid_type', message: `${label} must be a non-empty string.` }
  }
  if (typeof input !== 'string') {
    return { ok: false, code: 'invalid_type', message: `${label} must be a string.` }
  }
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    return { ok: false, code: 'empty', message: `${label} must not be empty.` }
  }
  if (trimmed !== input) {
    return { ok: false, code: 'whitespace', message: `${label} must not have leading or trailing whitespace.` }
  }
  return { ok: true, value: trimmed }
}

/**
 * Path / single-segment unsafe: NUL, slashes, backslashes, control chars.
 * Use for version tags and path segments — not for full URLs (those contain `/`).
 * @param {string} s
 * @returns {boolean}
 */
export function hasPathUnsafeChars (s) {
  if (s.includes('\0')) return true
  if (/[/\\]/.test(s)) return true
  return hasAsciiControlOrNul(s)
}

/**
 * NUL + ASCII control characters + DEL (safe to use on any user string, including URLs).
 * @param {string} s
 * @returns {boolean}
 */
export function hasAsciiControlOrNul (s) {
  if (s.includes('\0')) return true
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c <= 31 || c === 127) return true
  }
  return false
}

/** Characters that must not appear in values interpolated into shell commands */
export const SHELL_METAS = /[\s$`|"'&;<>?*#]/

/**
 * Printable ASCII only (for strict tags / tokens).
 * @param {string} s
 * @returns {boolean}
 */
export function isPrintableAscii (s) {
  return /^[\x20-\x7E]+$/.test(s)
}
