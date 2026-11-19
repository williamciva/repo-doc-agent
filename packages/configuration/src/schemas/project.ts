import { z } from 'zod';

export const DocumentationDepthSchema = z.enum([
  'overview',
  'standard',
  'detailed',
  'comprehensive',
]);

export const DocumentationDestinationSchema = z.object({
  type: z.enum(['local', 'external', 'repository']).default('local'),
  path: z.string().default('./docs/repodoc'),
});

export const DocumentationConfigSchema = z.object({
  language: z.string().min(2).default('en'),
  depth: DocumentationDepthSchema.default('detailed'),
  destination: DocumentationDestinationSchema.default({
    type: 'local',
    path: './docs/repodoc',
  }),
  update: z
    .object({
      mode: z.enum(['manual', 'automatic']).default('manual'),
      incremental: z.boolean().default(true),
    })
    .default({
      mode: 'manual',
      incremental: true,
    }),
});

export const KnowledgeConfigSchema = z.object({
  approval: z
    .object({
      mode: z.enum(['manual', 'automatic']).default('manual'),
    })
    .default({
      mode: 'manual',
    }),
});

export const AnalysisConfigSchema = z.object({
  include: z.array(z.string()).default(['**/*']),
  exclude: z
    .array(z.string())
    .default([
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.git/**',
      '.repodoc/**',
    ]),
});

export const AIConfigSchema = z.object({
  provider: z.string().default('default'),
  model: z.string().default('default'),
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional(),
  options: z.record(z.unknown()).optional(),
});

export const IntegrationsConfigSchema = z.object({
  mcp: z
    .object({
      enabled: z.boolean().default(true),
      port: z.number().int().positive().optional(),
    })
    .default({
      enabled: true,
    }),
});

export const ProjectConfigSchema = z.object({
  version: z.number().int().default(1),
  project: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
  }),
  documentation: DocumentationConfigSchema.default({
    language: 'en',
    depth: 'detailed',
    destination: { type: 'local', path: './docs/repodoc' },
    update: { mode: 'manual', incremental: true },
  }),
  knowledge: KnowledgeConfigSchema.default({
    approval: { mode: 'manual' },
  }),
  analysis: AnalysisConfigSchema.default({
    include: ['**/*'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.git/**',
      '.repodoc/**',
    ],
  }),
  ai: AIConfigSchema.default({
    provider: 'default',
    model: 'default',
  }),
  integrations: IntegrationsConfigSchema.default({
    mcp: { enabled: true },
  }),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type DocumentationConfig = z.infer<typeof DocumentationConfigSchema>;
export type KnowledgeConfig = z.infer<typeof KnowledgeConfigSchema>;
export type AnalysisConfig = z.infer<typeof AnalysisConfigSchema>;
export type AIConfig = z.infer<typeof AIConfigSchema>;
export type IntegrationsConfig = z.infer<typeof IntegrationsConfigSchema>;
