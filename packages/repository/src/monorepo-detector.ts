import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import fg from 'fast-glob';
import { parse as parseYaml } from 'yaml';
import { MonorepoInfo, PackageInfo } from './types.js';

export class MonorepoDetector {
  public static async detect(projectRoot: string): Promise<MonorepoInfo> {
    // 1. Check pnpm-workspace.yaml
    const pnpmWorkspacePath = path.join(projectRoot, 'pnpm-workspace.yaml');
    if (await fileExists(pnpmWorkspacePath)) {
      const packages = await MonorepoDetector.resolvePnpmPackages(projectRoot, pnpmWorkspacePath);
      return {
        isMonorepo: true,
        type: 'pnpm',
        packages,
      };
    }

    // 2. Check root package.json for workspaces
    const rootPkgPath = path.join(projectRoot, 'package.json');
    if (await fileExists(rootPkgPath)) {
      try {
        const content = await fs.readFile(rootPkgPath, 'utf-8');
        const pkgJson = JSON.parse(content) as Record<string, unknown>;
        const workspaces = pkgJson['workspaces'];
        if (workspaces) {
          const patterns = Array.isArray(workspaces)
            ? (workspaces as string[])
            : (workspaces as { packages?: string[] })['packages'] ?? [];

          const packages = await MonorepoDetector.resolveGlobPackages(projectRoot, patterns);
          return {
            isMonorepo: true,
            type: 'npm',
            packages,
          };
        }
      } catch {
        // Continue fallback
      }
    }

    // 3. Check lerna.json
    const lernaPath = path.join(projectRoot, 'lerna.json');
    if (await fileExists(lernaPath)) {
      return {
        isMonorepo: true,
        type: 'lerna',
        packages: await MonorepoDetector.resolveGlobPackages(projectRoot, ['packages/*']),
      };
    }

    // 4. Check Cargo.toml workspace
    const cargoPath = path.join(projectRoot, 'Cargo.toml');
    if (await fileExists(cargoPath)) {
      const content = await fs.readFile(cargoPath, 'utf-8');
      if (content.includes('[workspace]')) {
        return {
          isMonorepo: true,
          type: 'cargo',
          packages: [],
        };
      }
    }

    return {
      isMonorepo: false,
      packages: [],
    };
  }

  private static async resolvePnpmPackages(
    root: string,
    workspaceFile: string
  ): Promise<PackageInfo[]> {
    try {
      const content = await fs.readFile(workspaceFile, 'utf-8');
      const parsed = parseYaml(content) as { packages?: string[] };
      const patterns = parsed.packages ?? ['packages/*'];
      return MonorepoDetector.resolveGlobPackages(root, patterns);
    } catch {
      return [];
    }
  }

  private static async resolveGlobPackages(
    root: string,
    patterns: string[]
  ): Promise<PackageInfo[]> {
    const packages: PackageInfo[] = [];

    for (const pattern of patterns) {
      const searchPattern = pattern.endsWith('/') ? pattern : `${pattern}/`;
      const pkgJsonPattern = `${searchPattern}package.json`;

      const matches = await fg(pkgJsonPattern, {
        cwd: root,
        absolute: true,
        onlyFiles: true,
        ignore: ['**/node_modules/**', '**/dist/**'],
      });

      for (const manifestPath of matches) {
        try {
          const dir = path.dirname(manifestPath);
          const relativePath = path.relative(root, dir).replace(/\\/g, '/');
          const content = await fs.readFile(manifestPath, 'utf-8');
          const json = JSON.parse(content) as { name?: string; version?: string };

          packages.push({
            name: json.name ?? path.basename(dir),
            path: dir,
            relativePath,
            version: json.version,
            manifestPath,
          });
        } catch {
          // ignore invalid package.json
        }
      }
    }

    return packages;
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
