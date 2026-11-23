import {
  AIProviderError,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  FetchLike,
} from '../types.js';
import { BaseHttpAIProvider } from './base-http-provider.js';

export interface OllamaProviderOptions {
  baseUrl?: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  timeoutMs?: number;
  fetchFn?: FetchLike;
}

interface OllamaChatResponse {
  model?: string;
  message?: { content?: string };
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaEmbedResponse {
  embeddings?: number[][];
}

export class OllamaProvider extends BaseHttpAIProvider {
  public readonly name = 'ollama';
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultEmbeddingModel: string;

  constructor(options: OllamaProviderOptions = {}) {
    super(options.fetchFn, options.timeoutMs ?? 60000);
    this.baseUrl = (options.baseUrl ?? 'http://localhost:11434').replace(/\/+$/, '');
    this.defaultModel = options.defaultModel ?? 'llama3.2';
    this.defaultEmbeddingModel = options.defaultEmbeddingModel ?? 'nomic-embed-text';
  }

  public async complete(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<CompletionResponse> {
    const model = options.model ?? this.defaultModel;
    const data = await this.postJson<OllamaChatResponse>(
      `${this.baseUrl}/api/chat`,
      {},
      {
        model,
        messages,
        stream: false,
        options: {
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          ...(options.maxTokens !== undefined ? { num_predict: options.maxTokens } : {}),
        },
      },
      options.timeoutMs
    );

    const content = data.message?.content;
    if (content === undefined) {
      throw new AIProviderError('Empty completion response from ollama', this.name);
    }

    const promptTokens = data.prompt_eval_count ?? 0;
    const completionTokens = data.eval_count ?? 0;

    return {
      content,
      model: data.model ?? model,
      provider: this.name,
      finishReason: data.done_reason,
      usage:
        data.prompt_eval_count !== undefined || data.eval_count !== undefined
          ? {
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
            }
          : undefined,
    };
  }

  public async embed(texts: string[], model?: string): Promise<number[][]> {
    const data = await this.postJson<OllamaEmbedResponse>(
      `${this.baseUrl}/api/embed`,
      {},
      {
        model: model ?? this.defaultEmbeddingModel,
        input: texts,
      }
    );

    return data.embeddings ?? [];
  }
}
