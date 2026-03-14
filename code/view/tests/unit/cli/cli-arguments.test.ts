/**
 * CLI Arguments Processing Test
 * Tests FUNC-104 compliant argument parsing
 * @created 2026-03-13
 * @checked 2026-03-14
 * @updated 2026-03-14
 */

import { describe, it, expect } from 'vitest';
import { parseArguments } from '../../../src/cli/argument-parser.js';

describe('CLI Arguments Processing (FUNC-104)', () => {
  describe('Basic Option Parsing', () => {
    it('should parse --view option', () => {
      const args = parseArguments(['--view']);
      expect(args.view).toBe(true);
    });

    it('should parse --help option', () => {
      const args = parseArguments(['--help']);
      expect(args.help).toBe(true);
    });

    it('should parse -h option', () => {
      const args = parseArguments(['-h']);
      expect(args.help).toBe(true);
    });

    it('should parse --verbose option', () => {
      const args = parseArguments(['--verbose']);
      expect(args.verbose).toBe(true);
    });

    it('should parse --timeout with value', () => {
      const args = parseArguments(['--timeout', '300']);
      expect(args.timeout).toBe(300);
    });

    it('should parse directory argument', () => {
      const args = parseArguments(['src/']);
      expect(args.directory).toBe('src/');
    });
  });

  describe('Combined Options', () => {
    it('should parse --view with directory', () => {
      const args = parseArguments(['--view', 'src/']);
      expect(args.view).toBe(true);
      expect(args.directory).toBe('src/');
    });

    it('should parse --view with --verbose', () => {
      const args = parseArguments(['--view', '--verbose']);
      expect(args.view).toBe(true);
      expect(args.verbose).toBe(true);
    });

    it('should parse multiple options correctly', () => {
      const args = parseArguments(['--view', '--verbose', '--timeout', '60', 'project/']);
      expect(args.view).toBe(true);
      expect(args.verbose).toBe(true);
      expect(args.timeout).toBe(60);
      expect(args.directory).toBe('project/');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arguments', () => {
      const args = parseArguments([]);
      expect(Object.keys(args)).toHaveLength(0);
    });

    it('should ignore unknown options', () => {
      const args = parseArguments(['--unknown', '--view']);
      expect(args.view).toBe(true);
      expect((args as any).unknown).toBeUndefined();
    });

    it('should handle --timeout without value', () => {
      const args = parseArguments(['--timeout']);
      expect(args.timeout).toBeUndefined();
    });
  });
});
