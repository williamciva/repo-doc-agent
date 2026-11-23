import { z } from 'zod';
import { RepoDocError } from '@repodoc/shared';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  stopSequences?: string[];
}

export interface CompletionResponse {
  content: string;
  model: string;
  provider: string;
  usage?: TokenUsage;
  finishReason?: string;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  usage?: TokenUsage;
}

export interface StructuredOutputOptions<T> extends CompletionOptions {
  schema: z.ZodType<T>;
  schemaName?: string;
}

export class AIProviderError extends RepoDocError {
  public readonly provider: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    provider: string,
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'AI_PROVIDER_ERROR', { provider, statusCode, ...details });
    this.name = 'AIProviderError';
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

export type FetchLike = typeof fetch;

export interface AIProvider {
  readonly name: string;
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResponse>;
  completeStructured<T>(
    messages: ChatMessage[],
    options: StructuredOutputOptions<T>
  ): Promise<{ data: T; response: CompletionResponse }>;
  stream?(messages: ChatMessage[], options?: CompletionOptions): AsyncIterable<StreamChunk>;
  embed?(texts: string[], model?: string): Promise<number[][]>;
}
