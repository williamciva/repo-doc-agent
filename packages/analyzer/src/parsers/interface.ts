import { ParsedFile } from '../types.js';

export interface LanguageParser {
  readonly id: string;
  supports(language: string, filePath: string): boolean;
  parse(filePath: string, content: string): Promise<ParsedFile>;
}
