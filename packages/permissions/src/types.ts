import { z } from 'zod';

export const MutationTypeSchema = z.enum([
  'file_create',
  'file_modify',
  'file_delete',
  'file_rename',
  'dir_create',
  'dir_delete',
  'git_mutate',
  'config_mutate',
  'docs_write',
]);

export type MutationType = z.infer<typeof MutationTypeSchema>;

export interface MutationAuthorization {
  id: string;
  operation: MutationType;
  targetPaths: string[];
  description: string;
  authorizedAt: string;
  authorizedBy: string;
  expiresAt?: string;
}

export interface PermissionCheckRequest {
  operation: MutationType;
  targetPath: string;
  context?: string;
}
