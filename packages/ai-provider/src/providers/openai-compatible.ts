import {
  AIProviderError,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  FetchLike,
} from '../types.js';
import { BaseHttpAIProvider } from './base-http-provider.js';

export const OPENAI_COMPATIBLE_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  siliconflow: 'https://api.siliconflow.cn/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

export interface OpenAICompatibleOptions {
  name?: string;
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  timeoutMs?: number;
  fetchFn?: FetchLike;
}

interface OpenAIChatResponse {
  model?: string;
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface OpenAIEmbeddingResponse {
  data?: Array<{ embedding: number[]; index: number }>;
}

export class OpenAICompatibleProvider extends BaseHttpAIProvider {
  public readonly name: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultEmbeddingModel: string;

  constructor(options: OpenAICompatibleOptions) {
    super(options.fetchFn, options.timeoutMs);
    this.name = options.name ?? 'openai';
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? OPENAI_COMPATIBLE_BASE_URLS['openai']!).replace(/\/+$/, '');
    this.defaultModel = options.defaultModel ?? 'gpt-4o-mini';
    this.defaultEmbeddingModel = options.defaultEmbeddingModel ?? 'text-embedding-3-small';
  }

  public async complete(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<CompletionResponse> {
    const model = options.model ?? this.defaultModel;
    const payload: Record<string, unknown> = {
      model,
      messages,
    };

    if (options.temperature !== undefined) payload['temperature'] = options.temperature;
    if (options.maxTokens !== undefined) payload['max_tokens'] = options.maxTokens;
    if (options.stopSequences) payload['stop'] = options.stopSequences;

    const data = await this.postJson<OpenAIChatResponse>(
      `${this.baseUrl}/chat/completions`,
      { Authorization: `Bearer ${this.apiKey}` },
      payload,
      options.timeoutMs
    );

    const content = data.choices?.[0]?.message?.content;
    if (content === undefined) {
      throw new AIProviderError(`Empty completion response from ${this.name}`, this.name);
    }

    return {
      content,
      model: data.model ?? model,
      provider: this.name,
      finishReason: data.choices?.[0]?.finish_reason,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
            totalTokens: data.usage.total_tokens ?? 0,
          }
        : undefined,
    };
  }

  public async embed(texts: string[], model?: string): Promise<number[][]> {
    const data = await this.postJson<OpenAIEmbeddingResponse>(
      `${this.baseUrl}/embeddings`,
      { Authorization: `Bearer ${this.apiKey}` },
      {
        model: model ?? this.defaultEmbeddingModel,
        input: texts,
      }
    );

    const sorted = [...(data.data ?? [])].sort((a, b) => a.index - b.index);
    return sorted.map((item) => item.embedding);
  }
}
