import { EXIT_RUNTIME } from './exit-codes.js'

/**
 * Error with explicit CLI exit code (preflight / deploy).
 */
export class DeployError extends Error {
  /**
   * @param {string} message
   * @param {number} [exitCode=EXIT_RUNTIME]
   */
  constructor (message, exitCode = EXIT_RUNTIME) {
    super(message)
    this.name = 'DeployError'
    this.exitCode = exitCode
  }
}
