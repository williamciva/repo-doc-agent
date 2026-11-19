import { describe, it, expect } from 'vitest';
import { TypeScriptParser } from '../src/parsers/typescript-parser.js';

describe('TypeScriptParser', () => {
  const parser = new TypeScriptParser();

  it('should parse TypeScript classes, interfaces, and methods with docstrings', async () => {
    const code = `
      import * as path from 'node:path';
      import { Logger } from '@repodoc/shared';

      /**
       * UserService handles user authentication and profiles.
       */
      export class UserService {
        private secret: string;

        constructor() {
          this.secret = 'test';
        }

        /**
         * Authenticates a user.
         */
        public async authenticate(username: string): Promise<boolean> {
          return true;
        }
      }

      export interface UserProfile {
        id: string;
        name: string;
      }

      export function createProfile(): UserProfile {
        return { id: '1', name: 'Admin' };
      }
    `;

    const result = await parser.parse('src/user.service.ts', code);

    expect(result.parserUsed).toBe('typescript-ast');
    expect(result.imports).toHaveLength(2);
    expect(result.dependencies).toContain('node:path');
    expect(result.dependencies).toContain('@repodoc/shared');

    // Symbols check
    const classSym = result.symbols.find((s) => s.name === 'UserService');
    expect(classSym).toBeDefined();
    expect(classSym?.kind).toBe('class');
    expect(classSym?.isExported).toBe(true);
    expect(classSym?.docstring).toContain('UserService handles user authentication');

    const methodSym = result.symbols.find((s) => s.name === 'authenticate');
    expect(methodSym).toBeDefined();
    expect(methodSym?.kind).toBe('method');
    expect(methodSym?.parentSymbol).toBe('UserService');
    expect(methodSym?.visibility).toBe('public');

    const interfaceSym = result.symbols.find((s) => s.name === 'UserProfile');
    expect(interfaceSym).toBeDefined();
    expect(interfaceSym?.kind).toBe('interface');

    const funcSym = result.symbols.find((s) => s.name === 'createProfile');
    expect(funcSym).toBeDefined();
    expect(funcSym?.kind).toBe('function');
  });
});
