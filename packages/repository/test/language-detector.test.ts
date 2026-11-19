import { describe, it, expect } from 'vitest';
import { LanguageDetector } from '../src/language-detector.js';

describe('Language Detector', () => {
  it('should identify languages by extension', () => {
    expect(LanguageDetector.detect('service.ts').language).toBe('typescript');
    expect(LanguageDetector.detect('main.py').language).toBe('python');
    expect(LanguageDetector.detect('App.java').language).toBe('java');
    expect(LanguageDetector.detect('schema.sql').language).toBe('sql');
    expect(LanguageDetector.detect('config.yaml').language).toBe('yaml');
    expect(LanguageDetector.detect('README.md').language).toBe('markdown');
  });

  it('should identify special filenames', () => {
    expect(LanguageDetector.detect('Dockerfile').language).toBe('dockerfile');
    expect(LanguageDetector.detect('Makefile').language).toBe('makefile');
  });

  it('should identify binary files by extension or buffer', () => {
    expect(LanguageDetector.detect('photo.png').isBinary).toBe(true);
    expect(LanguageDetector.detect('archive.zip').isBinary).toBe(true);

    const binaryBuffer = Buffer.from([0, 0, 0, 1, 2, 0, 0, 3]);
    expect(LanguageDetector.isBinaryBuffer(binaryBuffer)).toBe(true);

    const textBuffer = Buffer.from('console.log("hello world");');
    expect(LanguageDetector.isBinaryBuffer(textBuffer)).toBe(false);
  });
});
