import {
  AIProviderError,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  FetchLike,
} from '../types.js';
import { BaseHttpAIProvider } from './base-http-provider.js';

export interface GoogleGeminiOptions {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  timeoutMs?: number;
  fetchFn?: FetchLike;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

export class GoogleGeminiProvider extends BaseHttpAIProvider {
  public readonly name = 'google';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(options: GoogleGeminiOptions) {
    super(options.fetchFn, options.timeoutMs);
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta').replace(
      /\/+$/,
      ''
    );
    this.defaultModel = options.defaultModel ?? 'gemini-2.0-flash';
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

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const payload: Record<string, unknown> = { contents };
    if (systemText) {
      payload['systemInstruction'] = { parts: [{ text: systemText }] };
    }

    const generationConfig: Record<string, unknown> = {};
    if (options.temperature !== undefined) generationConfig['temperature'] = options.temperature;
    if (options.maxTokens !== undefined) generationConfig['maxOutputTokens'] = options.maxTokens;
    if (options.stopSequences) generationConfig['stopSequences'] = options.stopSequences;
    if (Object.keys(generationConfig).length > 0) {
      payload['generationConfig'] = generationConfig;
    }

    const url = `${this.baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const data = await this.postJson<GeminiResponse>(url, {}, payload, options.timeoutMs);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text === undefined) {
      throw new AIProviderError('Empty completion response from google', this.name);
    }

    return {
      content: text,
      model,
      provider: this.name,
      finishReason: data.candidates?.[0]?.finishReason,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount ?? 0,
            completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: data.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    };
  }
}
