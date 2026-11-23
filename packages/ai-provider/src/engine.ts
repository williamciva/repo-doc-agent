import { Logger, SilentLogger } from '@repodoc/shared';
import { EmbeddingProvider } from '@repodoc/indexer';
import {
  AIProvider,
  AIProviderError,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  StreamChunk,
  StructuredOutputOptions,
} from './types.js';

export interface AIProviderEngineOptions {
  providers?: AIProvider[];
  logger?: Logger;
}

export class AIProviderEngine {
  private readonly chain: AIProvider[];
  private readonly logger: Logger;

  constructor(options: AIProviderEngineOptions = {}) {
    this.chain = [...(options.providers ?? [])];
    this.logger = options.logger ?? new SilentLogger();
  }

  public hasProviders(): boolean {
    return this.chain.length > 0;
  }

  public addProvider(provider: AIProvider): void {
    this.chain.push(provider);
  }

  public async complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    return this.executeWithFallback((provider) => provider.complete(messages, options));
  }

  public async completeStructured<T>(
    messages: ChatMessage[],
    options: StructuredOutputOptions<T>
  ): Promise<{ data: T; response: CompletionResponse }> {
    return this.executeWithFallback((provider) =>
      provider.completeStructured(messages, options)
    );
  }

  public async *stream(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): AsyncIterable<StreamChunk> {
    if (this.chain.length === 0) {
      throw new AIProviderError('No AI providers configured', 'none');
    }

    const primary = this.chain[0]!;
    if (primary.stream) {
      yield* primary.stream(messages, options);
      return;
    }

    const full = await this.complete(messages, options);
    yield {
      delta: full.content,
      done: true,
      usage: full.usage,
    };
  }

  public async embed(texts: string[], model?: string): Promise<number[][]> {
    const embedCapable = this.chain.filter((p) => typeof p.embed === 'function');
    if (embedCapable.length === 0) {
      throw new AIProviderError('No embedding-capable AI provider configured', 'none');
    }

    let lastError: unknown;
    for (const provider of embedCapable) {
      try {
        return await provider.embed!(texts, model);
      } catch (error) {
        lastError = error;
        this.logger.warn(`Embedding failed on provider '${provider.name}', trying fallback`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new AIProviderError('All embedding providers failed', 'none');
  }

  /**
   * Adapts this engine into an EmbeddingProvider for @repodoc/indexer.
   * Returns undefined if no embedding-capable provider is registered.
   */
  public asEmbeddingProvider(model?: string): EmbeddingProvider | undefined {
    const embedCapable = this.chain.find((p) => typeof p.embed === 'function');
    if (!embedCapable) return undefined;

    return {
      name: `ai-engine:${embedCapable.name}`,
      embed: (texts: string[]) => this.embed(texts, model),
    };
  }

  private async executeWithFallback<TResult>(
    fn: (provider: AIProvider) => Promise<TResult>
  ): Promise<TResult> {
    if (this.chain.length === 0) {
      throw new AIProviderError('No AI providers configured', 'none');
    }

    let lastError: unknown;
    for (const provider of this.chain) {
      try {
        return await fn(provider);
      } catch (error) {
        lastError = error;
        this.logger.warn(`AI request failed on provider '${provider.name}', trying next fallback`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new AIProviderError('All AI providers failed', 'none');
  }
}
