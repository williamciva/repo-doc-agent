import { ChunkingOptions } from './types.js';

export class TextChunker {
  private readonly maxChunkSize: number;
  private readonly overlap: number;

  constructor(options: ChunkingOptions = {}) {
    this.maxChunkSize = Math.max(100, options.maxChunkSize ?? 1200);
    this.overlap = Math.max(0, Math.min(this.maxChunkSize - 1, options.overlap ?? 150));
  }

  public chunk(text: string): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (trimmed.length <= this.maxChunkSize) return [trimmed];

    const chunks: string[] = [];
    let start = 0;

    while (start < trimmed.length) {
      let end = Math.min(start + this.maxChunkSize, trimmed.length);

      if (end < trimmed.length) {
        const lastNewline = trimmed.lastIndexOf('\n', end);
        if (lastNewline > start + Math.floor(this.maxChunkSize * 0.5)) {
          end = lastNewline;
        }
      }

      const slice = trimmed.slice(start, end).trim();
      if (slice.length > 0) {
        chunks.push(slice);
      }

      if (end >= trimmed.length) break;
      start = Math.max(end - this.overlap, start + 1);
    }

    return chunks;
  }
}
