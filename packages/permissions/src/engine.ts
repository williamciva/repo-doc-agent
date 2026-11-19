import { PermissionDeniedError, Logger, SilentLogger } from '@repodoc/shared';
import { MutationAuthorization, MutationType } from './types.js';
import { assertSafePath, isSubPath } from './path-safety.js';

export interface PermissionsEngineOptions {
  allowedRoot: string;
  logger?: Logger;
}

export class PermissionsEngine {
  private readonly allowedRoot: string;
  private readonly logger: Logger;
  private readonly authorizations = new Map<string, MutationAuthorization>();

  constructor(options: PermissionsEngineOptions) {
    this.allowedRoot = options.allowedRoot;
    this.logger = options.logger ?? new SilentLogger();
  }

  public grantAuthorization(auth: MutationAuthorization): void {
    // Validate that all target paths are inside allowed root
    for (const target of auth.targetPaths) {
      assertSafePath(target, this.allowedRoot);
    }

    this.authorizations.set(auth.id, auth);
    this.logger.info(`Granted authorization: ${auth.id} (${auth.operation})`, {
      id: auth.id,
      operation: auth.operation,
      paths: auth.targetPaths,
      by: auth.authorizedBy,
    });
  }

  public revokeAuthorization(id: string): boolean {
    const deleted = this.authorizations.delete(id);
    if (deleted) {
      this.logger.info(`Revoked authorization: ${id}`);
    }
    return deleted;
  }

  public isAuthorized(operation: MutationType, targetPath: string): boolean {
    try {
      const safeTarget = assertSafePath(targetPath, this.allowedRoot);

      for (const auth of this.authorizations.values()) {
        if (auth.operation !== operation) {
          continue;
        }

        if (auth.expiresAt && new Date(auth.expiresAt).getTime() < Date.now()) {
          continue;
        }

        // Check if safeTarget matches any of the authorized paths or subpaths
        const matches = auth.targetPaths.some((authPath) => {
          const safeAuthPath = assertSafePath(authPath, this.allowedRoot);
          return safeTarget === safeAuthPath || isSubPath(safeTarget, safeAuthPath);
        });

        if (matches) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  public assertAuthorized(operation: MutationType, targetPath: string): void {
    const safeTarget = assertSafePath(targetPath, this.allowedRoot);

    if (!this.isAuthorized(operation, safeTarget)) {
      throw new PermissionDeniedError(
        `Operation '${operation}' on '${targetPath}' is not authorized. Explicit user authorization is required.`,
        { operation, targetPath: safeTarget }
      );
    }
  }
}
