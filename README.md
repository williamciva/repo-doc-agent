# RepoDocAgent

Plataforma agnóstica para análise de repositórios, gestão estruturada de conhecimento de software e geração/manutenção incremental de documentação técnica e de negócio.

## Visão Geral

O **RepoDocAgent** atua como uma camada persistente de inteligência sobre qualquer repositório de software, operando de forma independente de linguagem de programação, provedor de IA ou agente externo.

Principais capacidades:

- **Descoberta e Análise de Código (`@repodoc/repository`, `@repodoc/analyzer`):** detecção de linguagens e monorepos, leitura de estado Git e extração de símbolos, imports, exports e docstrings via AST (TypeScript Compiler API) e parser genérico para outras linguagens.
- **Gestão de Conhecimento (`@repodoc/knowledge`, `@repodoc/persistence`):** persistência local em SQLite com rastreabilidade, proveniência (`confirmed` vs. `inferred`), fluxo de aprovação (`manual` / `automatic`) e sessões de Q&A.
- **Geração de Documentação (`@repodoc/documentation`):** documentação técnica e funcional em Markdown com diagramas Mermaid, profundidade configurável (`overview`, `standard`, `detailed`, `comprehensive`), suporte multilíngue e modo `preview`.
- **Git Intelligence & Grafo de Dependências (`@repodoc/git-intelligence`, `@repodoc/dependency-graph`):** análise de impacto transitivo entre arquivos, símbolos, conhecimento e documentação, além de detecção de documentação desatualizada.
- **Indexação e RAG Opcional (`@repodoc/indexer`):** busca full-text com SQLite FTS5 (`bm25`), busca estrutural e abstrações opcionais para embeddings e reranking.
- **Camada de Provedores de IA (`@repodoc/ai-provider`):** contratos independentes com adapters para OpenAI/OpenAI-compatible (DeepSeek, SiliconFlow, OpenRouter), Anthropic, Google Gemini e Ollama, com *structured output* (Zod) e cadeia de *fallback*.
- **Segurança Centralizada (`@repodoc/permissions`):** nenhuma mutação física em disco ocorre sem autorização explícita e validação contra *path traversal*.

---

## Estrutura do Monorepo

```text
repo-doc-agent/
├── apps/
│   ├── cli/                # CLI nativa (`repodoc`)
│   └── mcp-server/         # Servidor MCP sobre stdio (`repodoc-mcp`)
├── packages/
│   ├── shared/             # Tipos base, logger e erros
│   ├── configuration/      # Schemas Zod e loader de `.repodoc/config.yaml`
│   ├── permissions/        # PermissionsEngine e proteção contra path traversal
│   ├── persistence/        # SQLite (`better-sqlite3`), migrações e repositórios
│   ├── repository/         # Descoberta de arquivos, linguagens e monorepos
│   ├── analyzer/           # Análise AST (TS/JS) e parser genérico
│   ├── knowledge/          # Ingestão de conhecimento, aprovação e Q&A
│   ├── documentation/      # Builders Markdown, Mermaid e rastreabilidade
│   ├── dependency-graph/   # Grafo direcionado e análise de impacto
│   ├── git-intelligence/   # Análise de diff Git e detecção de desatualização
│   ├── indexer/            # Indexação FTS5 e retrieval contextual (RAG)
│   ├── ai-provider/        # Contratos e adapters de provedores de IA
│   └── core/               # Orquestrador central (`RepoDocContext`)
├── docs/repodoc/           # Autodocumentação gerada pelo próprio RepoDocAgent
└── .repodoc/config.yaml    # Configuração do projeto
```

---

## Instalação e Build

**Pré-requisitos:** Node.js >= 20 (desenvolvido com v22.20.0) e `pnpm`.

```bash
pnpm install
pnpm run build
pnpm run test
```

---

## Uso da CLI (`repodoc`)

A CLI opera totalmente offline para análise estrutural, busca FTS5, grafo e geração determinística de documentação.

```bash
# Exibir ajuda
node apps/cli/dist/bin.js --help

# Analisar repositório, ingerir conhecimento e indexar
node apps/cli/dist/bin.js analyze

# Visualizar preview da documentação sem gravar arquivos
node apps/cli/dist/bin.js docs preview --depth detailed --language en

# Gerar documentação em disco (requer autorização explícita --yes)
node apps/cli/dist/bin.js docs generate --yes --depth detailed --language en

# Detectar documentação desatualizada com base em alterações Git
node apps/cli/dist/bin.js docs status

# Consultar conhecimento pendente ou aprovar item
node apps/cli/dist/bin.js knowledge pending
node apps/cli/dist/bin.js knowledge approve <item-id>

# Buscar símbolos, conhecimento e documentação
node apps/cli/dist/bin.js search "PermissionsEngine" --json

# Iniciar servidor MCP sobre stdio
node apps/cli/dist/bin.js mcp start
```

Todas as operações aceitam `--json` para saída estruturada e `--project <path>` para apontar para outro repositório.

---

## Integração MCP (Antigravity, Claude Code, Codex, OpenCode)

O servidor MCP expõe **14 tools**, **5 resources** (`repodoc://overview`, `repodoc://config`, `repodoc://knowledge`, `repodoc://graph`, `repodoc://docs/status`) e **5 prompts** sobre `stdio`.

Exemplo de configuração para clientes compatíveis com MCP:

```json
{
  "mcpServers": {
    "repodoc": {
      "command": "node",
      "args": [
        "/caminho/absoluto/para/repo-doc-agent/apps/mcp-server/dist/bin.js",
        "/caminho/absoluto/para/o/projeto-alvo"
      ]
    }
  }
}
```

- **Antigravity / Claude Code / Codex / OpenCode:** adicione a entrada acima no arquivo de configuração MCP do cliente correspondente.
- **Segurança no MCP:** chamadas a `generate_documentation` sem `authorized: true` são bloqueadas pelo `PermissionsEngine`.

---

## Configuração (`.repodoc/config.yaml`)

```yaml
version: 1

project:
  name: my-project
  description: "Project description"

documentation:
  language: en        # ex.: en, pt-BR, es
  depth: detailed     # overview | standard | detailed | comprehensive
  destination:
    type: local
    path: ./docs/repodoc
  update:
    mode: manual
    incremental: true

knowledge:
  approval:
    mode: manual      # manual | automatic

ai:
  provider: default   # default (offline) | openai | anthropic | google | deepseek | siliconflow | openrouter | ollama
  model: default
```

> **Nota de segurança:** nunca armazene chaves de API em arquivos versionados. Utilize variáveis de ambiente (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, etc.).

---

## Testes

```bash
pnpm run test
```

A suíte inclui testes unitários por pacote, testes de integração de persistência/FTS5/MCP/CLI, testes E2E multi-linguagem (TypeScript, Python, Go) e testes de limites de segurança (*path traversal*, autorização obrigatória e isolamento de dados não confiáveis).

Para detalhes sobre limitações atuais e roadmap de evolução, consulte [docs/LIMITATIONS_AND_ROADMAP.md](docs/LIMITATIONS_AND_ROADMAP.md).
