import { AIConfig } from '@repodoc/configuration';
import { AIProvider, AIProviderError, FetchLike } from './types.js';
import {
  OPENAI_COMPATIBLE_BASE_URLS,
  OpenAICompatibleProvider,
} from './providers/openai-compatible.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { GoogleGeminiProvider } from './providers/google.js';
import { OllamaProvider } from './providers/ollama.js';

export class AIProviderRegistry {
  private readonly providers = new Map<string, AIProvider>();

  public register(provider: AIProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  public get(name: string): AIProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  public list(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Resolves or instantiates an AIProvider from AIConfig without persisting secrets.
   * Returns undefined when provider is 'default' (offline/agent-driven mode).
   */
  public resolveFromConfig(
    config: AIConfig,
    env: Record<string, string | undefined> = process.env,
    fetchFn?: FetchLike
  ): AIProvider | undefined {
    const providerName = config.provider.trim().toLowerCase();
    if (!providerName || providerName === 'default' || providerName === 'none') {
      return undefined;
    }

    const existing = this.get(providerName);
    if (existing) {
      return existing;
    }

    const model = config.model && config.model !== 'default' ? config.model : undefined;

    if (providerName === 'ollama') {
      return new OllamaProvider({
        baseUrl: config.endpoint,
        defaultModel: model,
        fetchFn,
      });
    }

    if (providerName === 'anthropic') {
      const apiKey = config.apiKey ?? env['ANTHROPIC_API_KEY'];
      if (!apiKey) {
        throw new AIProviderError('Missing ANTHROPIC_API_KEY for anthropic provider', 'anthropic');
      }
      return new AnthropicProvider({
        apiKey,
        baseUrl: config.endpoint,
        defaultModel: model,
        fetchFn,
      });
    }

    if (providerName === 'google' || providerName === 'gemini') {
      const apiKey = config.apiKey ?? env['GEMINI_API_KEY'] ?? env['GOOGLE_API_KEY'];
      if (!apiKey) {
        throw new AIProviderError('Missing GEMINI_API_KEY for google provider', 'google');
      }
      return new GoogleGeminiProvider({
        apiKey,
        baseUrl: config.endpoint,
        defaultModel: model,
        fetchFn,
      });
    }

    // OpenAI and OpenAI-compatible presets (deepseek, siliconflow, openrouter, custom)
    const envKeyName = `${providerName.toUpperCase()}_API_KEY`;
    const apiKey = config.apiKey ?? env[envKeyName] ?? env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new AIProviderError(`Missing API key for provider '${providerName}'`, providerName);
    }

    return new OpenAICompatibleProvider({
      name: providerName,
      apiKey,
      baseUrl: config.endpoint ?? OPENAI_COMPATIBLE_BASE_URLS[providerName],
      defaultModel: model,
      fetchFn,
    });
  }
}
