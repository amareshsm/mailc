/**
 * CLI exit codes.
 *
 * Standard exit codes used across all CLI commands.
 * Follows the convention from Doc 09.
 *
 * @module cli/exit-codes
 */

/** Compilation or validation succeeded. */
export const EXIT_SUCCESS = 0;

/** Compilation error (invalid markup, missing attributes, etc.). */
export const EXIT_COMPILE_ERROR = 1;

/** Configuration error (invalid config file, missing fields). */
export const EXIT_CONFIG_ERROR = 2;

/** File I/O error (file not found, permission denied, unreadable). */
export const EXIT_IO_ERROR = 3;
