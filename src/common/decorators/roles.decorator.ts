import { SetMetadata } from '@nestjs/common';

export type SystemRole = 'admin' | 'user';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles);
