import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { ConfigurationError } from '@repodoc/shared';
import { ProjectConfig, ProjectConfigSchema } from './schemas/project.js';

export async function findProjectRoot(startDir: string): Promise<string | null> {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    const agentsPath = path.join(current, 'AGENTS.md');
    const specPath = path.join(current, 'MASTER_SPECIFICATION.md');
    const repodocDir = path.join(current, '.repodoc');

    const [hasAgents, hasSpec, hasRepodoc] = await Promise.all([
      fileExists(agentsPath),
      fileExists(specPath),
      directoryExists(repodocDir),
    ]);

    if ((hasAgents && hasSpec) || hasRepodoc) {
      return current;
    }

    current = path.dirname(current);
  }

  return null;
}

export async function loadProjectConfig(projectRoot: string): Promise<ProjectConfig> {
  const repodocDir = path.join(projectRoot, '.repodoc');
  const yamlPath = path.join(repodocDir, 'config.yaml');
  const ymlPath = path.join(repodocDir, 'config.yml');
  const jsonPath = path.join(repodocDir, 'config.json');

  let rawContent: string | null = null;
  let isJson = false;

  if (await fileExists(yamlPath)) {
    rawContent = await fs.readFile(yamlPath, 'utf-8');
  } else if (await fileExists(ymlPath)) {
    rawContent = await fs.readFile(ymlPath, 'utf-8');
  } else if (await fileExists(jsonPath)) {
    rawContent = await fs.readFile(jsonPath, 'utf-8');
    isJson = true;
  }

  if (rawContent === null) {
    // Return default valid config using the project directory name
    return ProjectConfigSchema.parse({
      project: {
        name: path.basename(projectRoot),
      },
    });
  }

  try {
    const parsedData = isJson ? JSON.parse(rawContent) : parseYaml(rawContent);
    return ProjectConfigSchema.parse(parsedData);
  } catch (error) {
    throw new ConfigurationError(
      `Failed to parse project configuration: ${error instanceof Error ? error.message : String(error)}`,
      { projectRoot, error }
    );
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}
