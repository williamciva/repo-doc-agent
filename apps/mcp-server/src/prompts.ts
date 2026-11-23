export interface McpPromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{ name: string; description: string; required?: boolean }>;
  render: (args: Record<string, string>) => Array<{ role: 'user'; content: { type: 'text'; text: string } }>;
}

export function createMcpPrompts(): McpPromptDefinition[] {
  return [
    {
      name: 'analyze-repository',
      description: 'Run repository analysis and summarize architecture, modules, and key components.',
      render: () => [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Use `analyze_repository` and `get_project_overview` to inspect this repository and summarize its architecture, modules, and dependencies.',
          },
        },
      ],
    },
    {
      name: 'understand-architecture',
      description: 'Explore architectural decisions, module boundaries, and dependency graph.',
      render: () => [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Read `repodoc://overview` and `repodoc://graph`, then explain the system architecture and module dependencies.',
          },
        },
      ],
    },
    {
      name: 'investigate-business-rule',
      description: 'Investigate business rules and domain constraints in the knowledge base.',
      arguments: [{ name: 'topic', description: 'Business rule or domain topic', required: false }],
      render: (args) => [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Use \`search_knowledge\` with category "business_rules"${args['topic'] ? ` and searchText "${args['topic']}"` : ''} to explain the relevant business rules and their source files.`,
          },
        },
      ],
    },
    {
      name: 'identify-change-impacts',
      description: 'Analyze git changes and identify impacted symbols, knowledge, and documentation.',
      render: () => [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Use `analyze_git_changes` and `get_documentation_status` to identify which knowledge items and docs are impacted by recent changes.',
          },
        },
      ],
    },
    {
      name: 'update-documentation',
      description: 'Preview documentation updates and request explicit authorization before writing.',
      render: () => [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'First call `preview_documentation_changes` to inspect the proposed documentation. Present the preview to the user and only call `generate_documentation` with `authorized: true` after explicit approval.',
          },
        },
      ],
    },
  ];
}
