import { z } from 'zod';

export const ProviderCredentialsSchema = z.object({
  apiKey: z.string().optional(),
  endpoint: z.string().optional(),
  organization: z.string().optional(),
  defaultModel: z.string().optional(),
});

export const GlobalConfigSchema = z.object({
  version: z.number().int().default(1),
  defaultLanguage: z.string().default('en'),
  providers: z.record(ProviderCredentialsSchema).default({}),
  telemetry: z.boolean().default(false),
  cacheDirectory: z.string().optional(),
});

export type GlobalConfig = z.infer<typeof GlobalConfigSchema>;
