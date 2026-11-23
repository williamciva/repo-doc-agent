import {
  AIProviderError,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  FetchLike,
} from '../types.js';
import { BaseHttpAIProvider } from './base-http-provider.js';

export interface AnthropicProviderOptions {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  timeoutMs?: number;
  fetchFn?: FetchLike;
}

interface AnthropicResponse {
  model?: string;
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export class AnthropicProvider extends BaseHttpAIProvider {
  public readonly name = 'anthropic';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(options: AnthropicProviderOptions) {
    super(options.fetchFn, options.timeoutMs);
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.anthropic.com/v1').replace(/\/+$/, '');
    this.defaultModel = options.defaultModel ?? 'claude-3-5-sonnet-latest';
  }

  public async complete(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<CompletionResponse> {
    const model = options.model ?? this.defaultModel;
    const systemText = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const nonSystem = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const payload: Record<string, unknown> = {
      model,
      max_tokens: options.maxTokens ?? 4096,
      messages: nonSystem,
    };

    if (systemText) payload['system'] = systemText;
    if (options.temperature !== undefined) payload['temperature'] = options.temperature;
    if (options.stopSequences) payload['stop_sequences'] = options.stopSequences;

    const data = await this.postJson<AnthropicResponse>(
      `${this.baseUrl}/messages`,
      {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      payload,
      options.timeoutMs
    );

    const text = data.content?.find((c) => c.type === 'text')?.text;
    if (text === undefined) {
      throw new AIProviderError('Empty completion response from anthropic', this.name);
    }

    const promptTokens = data.usage?.input_tokens ?? 0;
    const completionTokens = data.usage?.output_tokens ?? 0;

    return {
      content: text,
      model: data.model ?? model,
      provider: this.name,
      finishReason: data.stop_reason,
      usage: data.usage
        ? {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
          }
        : undefined,
    };
  }
}
