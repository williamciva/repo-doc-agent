export interface DocLabels {
  overviewTitle: string;
  architectureTitle: string;
  componentsTitle: string;
  flowsAndRulesTitle: string;
  businessOverviewTitle: string;
  businessRulesTitle: string;
  projectSummary: string;
  repositoryType: string;
  monorepo: string;
  singleProject: string;
  totalFiles: string;
  totalSymbols: string;
  languagesDetected: string;
  architectureDiagram: string;
  modulesSection: string;
  externalDependencies: string;
  internalDependencies: string;
  decisionsSection: string;
  configurationsSection: string;
  componentsSection: string;
  functionsSection: string;
  flowsSection: string;
  technicalRulesSection: string;
  integrationsSection: string;
  conventionsSection: string;
  systemObjectives: string;
  functionalCapabilities: string;
  observationsAndQA: string;
  businessRulesSection: string;
  traceabilityTitle: string;
  sourceItemsLabel: string;
  referencedFilesLabel: string;
  generatedAtLabel: string;
  noDataAvailable: string;
  depthLabel: string;
  languageLabel: string;
}

const EN_LABELS: DocLabels = {
  overviewTitle: 'Project Overview',
  architectureTitle: 'System Architecture',
  componentsTitle: 'Components & API Reference',
  flowsAndRulesTitle: 'Execution Flows, Integrations & Technical Rules',
  businessOverviewTitle: 'Business & Functional Overview',
  businessRulesTitle: 'Business Rules & Domain Constraints',
  projectSummary: 'Summary',
  repositoryType: 'Repository Type',
  monorepo: 'Monorepo',
  singleProject: 'Single Project',
  totalFiles: 'Total Files',
  totalSymbols: 'Discovered Symbols',
  languagesDetected: 'Languages Detected',
  architectureDiagram: 'Architecture Diagram',
  modulesSection: 'Modules & Packages',
  externalDependencies: 'External Dependencies',
  internalDependencies: 'Internal Module Dependencies',
  decisionsSection: 'Architectural Decisions',
  configurationsSection: 'Configurations & Enums',
  componentsSection: 'Classes & Interfaces',
  functionsSection: 'Exported Functions & Methods',
  flowsSection: 'Execution Flows',
  technicalRulesSection: 'Technical Rules & Type Contracts',
  integrationsSection: 'Integrations',
  conventionsSection: 'Conventions',
  systemObjectives: 'System Objectives',
  functionalCapabilities: 'Functional Capabilities & Modules',
  observationsAndQA: 'Confirmed Observations & Q&A',
  businessRulesSection: 'Business Rules',
  traceabilityTitle: 'Traceability',
  sourceItemsLabel: 'Knowledge Item IDs',
  referencedFilesLabel: 'Referenced Source Files',
  generatedAtLabel: 'Generated at',
  noDataAvailable: 'No verified entries available for this section yet.',
  depthLabel: 'Depth',
  languageLabel: 'Language',
};

const PT_BR_LABELS: DocLabels = {
  overviewTitle: 'Visão Geral do Projeto',
  architectureTitle: 'Arquitetura do Sistema',
  componentsTitle: 'Referência de Componentes e APIs',
  flowsAndRulesTitle: 'Fluxos de Execução, Integrações e Regras Técnicas',
  businessOverviewTitle: 'Visão Geral Funcional e de Negócio',
  businessRulesTitle: 'Regras de Negócio e Restrições de Domínio',
  projectSummary: 'Resumo',
  repositoryType: 'Tipo de Repositório',
  monorepo: 'Monorepo',
  singleProject: 'Projeto Único',
  totalFiles: 'Total de Arquivos',
  totalSymbols: 'Símbolos Descobertos',
  languagesDetected: 'Linguagens Detectadas',
  architectureDiagram: 'Diagrama de Arquitetura',
  modulesSection: 'Módulos e Pacotes',
  externalDependencies: 'Dependências Externas',
  internalDependencies: 'Dependências Internas entre Módulos',
  decisionsSection: 'Decisões Arquiteturais',
  configurationsSection: 'Configurações e Enums',
  componentsSection: 'Classes e Interfaces',
  functionsSection: 'Funções e Métodos Exportados',
  flowsSection: 'Fluxos de Execução',
  technicalRulesSection: 'Regras Técnicas e Contratos de Tipo',
  integrationsSection: 'Integrações',
  conventionsSection: 'Convenções',
  systemObjectives: 'Objetivos do Sistema',
  functionalCapabilities: 'Capacidades Funcionais e Módulos',
  observationsAndQA: 'Observações Confirmadas e Q&A',
  businessRulesSection: 'Regras de Negócio',
  traceabilityTitle: 'Rastreabilidade',
  sourceItemsLabel: 'IDs de Itens de Conhecimento',
  referencedFilesLabel: 'Arquivos Fonte Referenciados',
  generatedAtLabel: 'Gerado em',
  noDataAvailable: 'Nenhum registro verificado disponível para esta seção até o momento.',
  depthLabel: 'Profundidade',
  languageLabel: 'Idioma',
};

const ES_LABELS: DocLabels = {
  ...EN_LABELS,
  overviewTitle: 'Descripción General del Proyecto',
  architectureTitle: 'Arquitectura del Sistema',
  componentsTitle: 'Referencia de Componentes y APIs',
  flowsAndRulesTitle: 'Flujos de Ejecución, Integraciones y Reglas Técnicas',
  businessOverviewTitle: 'Descripción Funcional y de Negocio',
  businessRulesTitle: 'Reglas de Negocio y Restricciones de Dominio',
  projectSummary: 'Resumen',
  repositoryType: 'Tipo de Repositorio',
  singleProject: 'Proyecto Único',
  totalFiles: 'Total de Archivos',
  totalSymbols: 'Símbolos Descubiertos',
  languagesDetected: 'Lenguajes Detectados',
  architectureDiagram: 'Diagrama de Arquitectura',
  modulesSection: 'Módulos y Paquetes',
  externalDependencies: 'Dependencias Externas',
  traceabilityTitle: 'Trazabilidad',
  noDataAvailable: 'No hay entradas verificadas disponibles para esta sección todavía.',
};

const LABEL_MAP: Record<string, DocLabels> = {
  en: EN_LABELS,
  'pt-br': PT_BR_LABELS,
  pt: PT_BR_LABELS,
  'pt-pt': PT_BR_LABELS,
  es: ES_LABELS,
};

export function getLabelsForLanguage(language: string): DocLabels {
  const normalized = language.trim().toLowerCase();
  if (LABEL_MAP[normalized]) {
    return LABEL_MAP[normalized];
  }
  const base = normalized.split('-')[0] ?? 'en';
  return LABEL_MAP[base] ?? EN_LABELS;
}
