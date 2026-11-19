import { describe, it, expect } from 'vitest';
import { GenericRegexParser } from '../src/parsers/generic-parser.js';

describe('GenericRegexParser', () => {
  const parser = new GenericRegexParser();

  it('should parse Python definitions heuristically', async () => {
    const pythonCode = `
import os
from datetime import datetime

class OrderProcessor:
    def process(self, order_id):
        pass

def calculate_tax(amount):
    return amount * 0.1
    `;

    const result = await parser.parse('order.py', pythonCode);
    expect(result.parserUsed).toBe('generic-regex');
    expect(result.dependencies).toContain('os');
    expect(result.dependencies).toContain('datetime');

    const classSym = result.symbols.find((s) => s.name === 'OrderProcessor');
    expect(classSym).toBeDefined();
    expect(classSym?.kind).toBe('class');

    const funcSym = result.symbols.find((s) => s.name === 'calculate_tax');
    expect(funcSym).toBeDefined();
    expect(funcSym?.kind).toBe('function');
  });
});
