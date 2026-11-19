import { LanguageParser } from './interface.js';
import { TypeScriptParser } from './typescript-parser.js';
import { GenericRegexParser } from './generic-parser.js';

export class ParserRegistry {
  private readonly parsers: LanguageParser[] = [];
  private readonly fallbackParser: LanguageParser;

  constructor() {
    this.fallbackParser = new GenericRegexParser();
    // Register default specialized parsers
    this.register(new TypeScriptParser());
  }

  public register(parser: LanguageParser): void {
    this.parsers.unshift(parser); // Newest parsers take precedence
  }

  public getParser(language: string, filePath: string): LanguageParser {
    for (const parser of this.parsers) {
      if (parser.supports(language, filePath)) {
        return parser;
      }
    }
    return this.fallbackParser;
  }
}
