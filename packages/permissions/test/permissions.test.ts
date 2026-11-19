import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { PermissionsEngine } from '../src/engine.js';
import { assertSafePath } from '../src/path-safety.js';
import { PermissionDeniedError } from '@repodoc/shared';

describe('Permissions Engine', () => {
  const root = path.resolve('/mock/workspace');
  const engine = new PermissionsEngine({ allowedRoot: root });

  it('should deny unauthorized mutation', () => {
    const target = path.join(root, 'docs/readme.md');
    expect(engine.isAuthorized('file_create', target)).toBe(false);
    expect(() => engine.assertAuthorized('file_create', target)).toThrow(PermissionDeniedError);
  });

  it('should allow explicitly granted mutation within path scope', () => {
    const targetDir = path.join(root, 'docs');
    const targetFile = path.join(targetDir, 'architecture.md');

    engine.grantAuthorization({
      id: 'auth-1',
      operation: 'docs_write',
      targetPaths: [targetDir],
      description: 'Authorized documentation update',
      authorizedAt: new Date().toISOString(),
      authorizedBy: 'user',
    });

    expect(engine.isAuthorized('docs_write', targetFile)).toBe(true);
    expect(() => engine.assertAuthorized('docs_write', targetFile)).not.toThrow();

    // But should deny different operation
    expect(engine.isAuthorized('file_delete', targetFile)).toBe(false);
  });

  it('should detect and prevent path traversal', () => {
    const evilPath = path.join(root, '../../etc/passwd');
    expect(() => assertSafePath(evilPath, root)).toThrow(PermissionDeniedError);
  });
});
