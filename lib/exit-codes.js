/** Process exit codes for the wp-deployer CLI */
export const EXIT_SUCCESS = 0
/** Invalid config, validation, or preflight (environment / paths) */
export const EXIT_CONFIG = 1
/** Deploy pipeline / SVN / filesystem failure */
export const EXIT_RUNTIME = 2
/** User interrupt */
export const EXIT_SIGINT = 130
