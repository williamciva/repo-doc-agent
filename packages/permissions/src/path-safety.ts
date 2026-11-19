import * as path from 'node:path';
import { PermissionDeniedError } from '@repodoc/shared';

export function assertSafePath(targetPath: string, allowedRoot: string): string {
  const normalizedTarget = path.resolve(targetPath);
  const normalizedRoot = path.resolve(allowedRoot);

  const relative = path.relative(normalizedRoot, normalizedTarget);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new PermissionDeniedError(
      `Path traversal attempt detected. Path '${targetPath}' resolves outside allowed root '${allowedRoot}'.`,
      { targetPath, allowedRoot }
    );
  }

  return normalizedTarget;
}

export function isSubPath(child: string, parent: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}
