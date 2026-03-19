/**
 * JSON Schema validation for merged wp-deployer settings (via Ajv).
 * Domain rules JSON Schema cannot express stay in lib/validators and config.js.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import Ajv from 'ajv'

const __dirname = dirname(fileURLToPath(import.meta.url))

const schema = JSON.parse(
  readFileSync(join(__dirname, 'schemas', 'config.schema.json'), 'utf8')
)

const ajv = new Ajv({ allErrors: true, strict: true })
const validate = ajv.compile(schema)

/**
 * @param {object} settings - Merged settings object
 * @returns {{ ok: true } | { ok: false, error: 'username_required' | 'theme_earlier_version_required' | 'invalid_config', errorMessage?: string }}
 */
export function validateSettingsSchema (settings) {
  const valid = validate(settings)
  if (valid) return { ok: true }

  const errors = validate.errors ?? []
  const mapped = mapSchemaErrors(errors, settings)
  if (mapped) return { ok: false, ...mapped }

  return {
    ok: false,
    error: 'invalid_config',
    errorMessage: ajv.errorsText(errors, { separator: '\n' })
  }
}

/**
 * Preserve stable error codes used by the CLI where they match a schema failure.
 * @param {import('ajv').ErrorObject[]} errors
 * @param {object} settings
 * @returns {{ error: string, errorMessage?: string } | null}
 */
function mapSchemaErrors (errors, settings) {
  for (const e of errors) {
    const path = e.instancePath ?? ''
    const missing = e.params?.missingProperty

    if (missing === 'username' || (path === '/username' && e.keyword === 'minLength')) {
      return { error: 'username_required' }
    }

    if (settings.repoType === 'theme') {
      if (missing === 'earlierVersion' || (path === '/earlierVersion' && e.keyword === 'minLength')) {
        return { error: 'theme_earlier_version_required' }
      }
    }
  }

  return null
}
