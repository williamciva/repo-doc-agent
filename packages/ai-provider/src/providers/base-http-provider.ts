import {
  AIProvider,
  AIProviderError,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  FetchLike,
  StructuredOutputOptions,
} from '../types.js';

export abstract class BaseHttpAIProvider implements AIProvider {
  public abstract readonly name: string;
  protected readonly fetchFn: FetchLike;
  protected readonly defaultTimeoutMs: number;

  constructor(fetchFn?: FetchLike, defaultTimeoutMs = 30000) {
    this.fetchFn = fetchFn ?? globalThis.fetch;
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  public abstract complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse>;

  public async completeStructured<T>(
    messages: ChatMessage[],
    options: StructuredOutputOptions<T>
  ): Promise<{ data: T; response: CompletionResponse }> {
    const schemaInstruction: ChatMessage = {
      role: 'system',
      content: `Respond ONLY with valid JSON${options.schemaName ? ` matching schema '${options.schemaName}'` : ''}. Do not include markdown fences or commentary.`,
    };

    const response = await this.complete([schemaInstruction, ...messages], options);
    const cleaned = this.extractJson(response.content);

    try {
      const parsedJson = JSON.parse(cleaned) as unknown;
      const data = options.schema.parse(parsedJson);
      return { data, response };
    } catch (error) {
      throw new AIProviderError(
        `Structured output validation failed for provider '${this.name}': ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        undefined,
        { rawContent: response.content }
      );
    }
  }

  protected async postJson<TResponse>(
    url: string,
    headers: Record<string, string>,
    body: unknown,
    timeoutMs?: number
  ): Promise<TResponse> {
    const controller = new AbortController();
    const timeout = timeoutMs ?? this.defaultTimeoutMs;
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new AIProviderError(
          `HTTP ${res.status} from ${this.name}: ${errText || res.statusText}`,
          this.name,
          res.status
        );
      }

      return (await res.json()) as TResponse;
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AIProviderError(
          `Request to ${this.name} timed out after ${timeout}ms`,
          this.name,
          408
        );
      }
      throw new AIProviderError(
        `Request to ${this.name} failed: ${error instanceof Error ? error.message : String(error)}`,
        this.name
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private extractJson(raw: string): string {
    const trimmed = raw.trim();
    const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenceMatch && fenceMatch[1]) {
      return fenceMatch[1].trim();
    }
    return trimmed;
  }
}
