import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../../database/drizzle.provider';
import { roles, Role } from '../../database/schema/roles.schema';

@Injectable()
export class RolesService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: DrizzleDb,
  ) {}

  async findAll(scope?: 'system' | 'team'): Promise<Role[]> {
    if (scope) {
      return this.db.select().from(roles).where(eq(roles.scope, scope));
    }
    return this.db.select().from(roles);
  }

  async findById(id: string): Promise<Role> {
    const [role] = await this.db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async findBySlug(slug: string): Promise<Role | null> {
    const [role] = await this.db.select().from(roles).where(eq(roles.slug, slug)).limit(1);
    return role || null;
  }
}
