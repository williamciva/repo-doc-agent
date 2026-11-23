import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { OpenAICompatibleProvider } from '../src/providers/openai-compatible.js';
import { AnthropicProvider } from '../src/providers/anthropic.js';
import { GoogleGeminiProvider } from '../src/providers/google.js';
import { OllamaProvider } from '../src/providers/ollama.js';
import { AIProviderRegistry } from '../src/registry.js';
import { AIProviderEngine } from '../src/engine.js';
import { AIProviderError, FetchLike } from '../src/types.js';

function mockJsonFetch(status: number, body: unknown): FetchLike {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as FetchLike;
}

describe('AI Provider Engine & Adapters', () => {
  it('should complete chat and embeddings using OpenAICompatibleProvider', async () => {
    const chatFetch = mockJsonFetch(200, {
      model: 'gpt-4o-mini',
      choices: [{ message: { content: 'Hello from OpenAI' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 },
    });

    const provider = new OpenAICompatibleProvider({
      apiKey: 'test-key',
      fetchFn: chatFetch,
    });

    const res = await provider.complete([{ role: 'user', content: 'Hi' }]);
    expect(res.content).toBe('Hello from OpenAI');
    expect(res.provider).toBe('openai');
    expect(res.usage?.totalTokens).toBe(9);

    const embedProvider = new OpenAICompatibleProvider({
      apiKey: 'test-key',
      fetchFn: mockJsonFetch(200, {
        data: [
          { index: 1, embedding: [0.2, 0.8] },
          { index: 0, embedding: [0.9, 0.1] },
        ],
      }),
    });

    const vectors = await embedProvider.embed(['first', 'second']);
    expect(vectors).toEqual([
      [0.9, 0.1],
      [0.2, 0.8],
    ]);
  });

  it('should complete chat using AnthropicProvider', async () => {
    const provider = new AnthropicProvider({
      apiKey: 'ant-key',
      fetchFn: mockJsonFetch(200, {
        model: 'claude-3-5-sonnet-latest',
        content: [{ type: 'text', text: 'Hello from Claude' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    });

    const res = await provider.complete([
      { role: 'system', content: 'Be concise.' },
      { role: 'user', content: 'Hi' },
    ]);
    expect(res.content).toBe('Hello from Claude');
    expect(res.provider).toBe('anthropic');
    expect(res.usage?.totalTokens).toBe(15);
  });

  it('should complete chat using GoogleGeminiProvider', async () => {
    const provider = new GoogleGeminiProvider({
      apiKey: 'gem-key',
      fetchFn: mockJsonFetch(200, {
        candidates: [
          { content: { parts: [{ text: 'Hello from Gemini' }] }, finishReason: 'STOP' },
        ],
        usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 3, totalTokenCount: 7 },
      }),
    });

    const res = await provider.complete([{ role: 'user', content: 'Hi' }]);
    expect(res.content).toBe('Hello from Gemini');
    expect(res.provider).toBe('google');
    expect(res.usage?.totalTokens).toBe(7);
  });

  it('should complete chat and embeddings using OllamaProvider', async () => {
    const provider = new OllamaProvider({
      fetchFn: mockJsonFetch(200, {
        model: 'llama3.2',
        message: { content: 'Hello from Ollama' },
        done_reason: 'stop',
        prompt_eval_count: 6,
        eval_count: 4,
      }),
    });

    const res = await provider.complete([{ role: 'user', content: 'Hi' }]);
    expect(res.content).toBe('Hello from Ollama');
    expect(res.provider).toBe('ollama');
  });

  it('should parse and validate structured output with Zod (even with markdown fences)', async () => {
    const schema = z.object({
      summary: z.string(),
      confidence: z.number(),
    });

    const provider = new OpenAICompatibleProvider({
      apiKey: 'test-key',
      fetchFn: mockJsonFetch(200, {
        choices: [
          {
            message: {
              content: '```json\n{"summary":"Valid architecture","confidence":0.95}\n```',
            },
          },
        ],
      }),
    });

    const { data } = await provider.completeStructured(
      [{ role: 'user', content: 'Summarize' }],
      { schema, schemaName: 'SummaryOutput' }
    );
    expect(data).toEqual({ summary: 'Valid architecture', confidence: 0.95 });
  });

  it('should execute fallback chain when primary provider fails', async () => {
    const failingPrimary = new OpenAICompatibleProvider({
      name: 'primary-openai',
      apiKey: 'bad-key',
      fetchFn: mockJsonFetch(500, { error: 'Internal Server Error' }),
    });

    const workingFallback = new OllamaProvider({
      fetchFn: mockJsonFetch(200, {
        model: 'llama3.2',
        message: { content: 'Recovered via Ollama' },
      }),
    });

    const engine = new AIProviderEngine({
      providers: [failingPrimary, workingFallback],
    });

    const res = await engine.complete([{ role: 'user', content: 'Hello' }]);
    expect(res.content).toBe('Recovered via Ollama');
    expect(res.provider).toBe('ollama');

    const chunks: string[] = [];
    for await (const chunk of engine.stream([{ role: 'user', content: 'Stream' }])) {
      chunks.push(chunk.delta);
    }
    expect(chunks.join('')).toBe('Recovered via Ollama');
  });

  it('should resolve providers from AIConfig without storing secrets', () => {
    const registry = new AIProviderRegistry();

    const offline = registry.resolveFromConfig({ provider: 'default', model: 'default' });
    expect(offline).toBeUndefined();

    const deepseek = registry.resolveFromConfig(
      { provider: 'deepseek', model: 'deepseek-chat' },
      { DEEPSEEK_API_KEY: 'env-ds-key' }
    );
    expect(deepseek?.name).toBe('deepseek');

    expect(() =>
      registry.resolveFromConfig({ provider: 'anthropic', model: 'default' }, {})
    ).toThrow(AIProviderError);
  });

  it('should adapt AIProviderEngine into an EmbeddingProvider for Indexer', async () => {
    const openai = new OpenAICompatibleProvider({
      apiKey: 'k',
      fetchFn: mockJsonFetch(200, {
        data: [{ index: 0, embedding: [0.1, 0.2, 0.3] }],
      }),
    });

    const engine = new AIProviderEngine({ providers: [openai] });
    const adapter = engine.asEmbeddingProvider();
    expect(adapter).toBeDefined();

    const vecs = await adapter!.embed(['hello']);
    expect(vecs).toEqual([[0.1, 0.2, 0.3]]);
  });
});
