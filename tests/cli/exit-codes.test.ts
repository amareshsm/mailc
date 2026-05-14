/**
 * Tests for CLI exit codes.
 *
 * @module tests/cli/exit-codes
 */

import { describe, it, expect } from 'vitest';
import {
  EXIT_SUCCESS,
  EXIT_COMPILE_ERROR,
  EXIT_CONFIG_ERROR,
  EXIT_IO_ERROR,
} from '../../src/cli/exit-codes.js';

describe('CLI exit codes', () => {
  it('EXIT_SUCCESS is 0', () => {
    expect(EXIT_SUCCESS).toBe(0);
  });

  it('EXIT_COMPILE_ERROR is 1', () => {
    expect(EXIT_COMPILE_ERROR).toBe(1);
  });

  it('EXIT_CONFIG_ERROR is 2', () => {
    expect(EXIT_CONFIG_ERROR).toBe(2);
  });

  it('EXIT_IO_ERROR is 3', () => {
    expect(EXIT_IO_ERROR).toBe(3);
  });

  it('all exit codes are unique', () => {
    const codes = [EXIT_SUCCESS, EXIT_COMPILE_ERROR, EXIT_CONFIG_ERROR, EXIT_IO_ERROR];
    expect(new Set(codes).size).toBe(codes.length);
  });
});
