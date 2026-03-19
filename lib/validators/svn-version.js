/**
 * SVN path-segment safety for deploy tags (e.g. plugins: tags/1.2.3/; themes: version directory names).
 */

import {
  requireNonEmptyTrimmedString,
  hasPathUnsafeChars,
  SHELL_METAS,
  isPrintableAscii
} from './shared.js'

const MAX_LENGTH = 128

/**
 * WordPress.org–style tag: one or more segments separated by `.`, `_`, or `+`, each segment alphanumeric / hyphens.
 * Examples: 1.0.0, 2.1.0-beta.1, 1.0.0+build.2
 */
const WP_ORG_TAG_LIKE = /^[0-9A-Za-z-]+(?:[._+][0-9A-Za-z-]+)*$/

/**
 * @param {unknown} input - Version/tag string (e.g. package.json version)
 * @returns {import('./shared.js').ValidationResult}
 */
export function validateSvnSafeVersion (input) {
  const base = requireNonEmptyTrimmedString(input, { label: 'Version' })
  if (!base.ok) return base

  const trimmed = base.value

  if (trimmed.length > MAX_LENGTH) {
    return {
      ok: false,
      code: 'too_long',
      message: `Version must be at most ${MAX_LENGTH} characters.`
    }
  }

  if (trimmed === '.' || trimmed === '..') {
    return {
      ok: false,
      code: 'reserved',
      message: 'Version must not be "." or "..".'
    }
  }

  if (trimmed.includes('..')) {
    return {
      ok: false,
      code: 'path_unsafe',
      message: 'Version must not contain ".." (path traversal risk).'
    }
  }

  if (hasPathUnsafeChars(trimmed)) {
    return {
      ok: false,
      code: 'path_unsafe',
      message: 'Version contains characters unsafe in SVN paths (e.g. /, \\, or control characters).'
    }
  }

  if (SHELL_METAS.test(trimmed)) {
    return {
      ok: false,
      code: 'shell_unsafe',
      message: 'Version contains whitespace or shell-special characters.'
    }
  }

  if (!isPrintableAscii(trimmed)) {
    return {
      ok: false,
      code: 'non_ascii',
      message: 'Version must contain only ASCII characters (WordPress.org tags are ASCII).'
    }
  }

  if (!WP_ORG_TAG_LIKE.test(trimmed)) {
    return {
      ok: false,
      code: 'format',
      message: 'Version must look like a WordPress-style tag (letters, digits, . _ + - only; sensible segments).'
    }
  }

  return { ok: true, value: trimmed }
}

/**
 * @param {unknown} input
 * @returns {boolean}
 */
export function isSvnSafeVersion (input) {
  return validateSvnSafeVersion(input).ok
}
