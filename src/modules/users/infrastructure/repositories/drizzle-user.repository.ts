import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../../../../database/drizzle.provider';
import { roles } from '../../../../database/schema/roles.schema';
import { users } from '../../../../database/schema/users.schema';
import { UserEntity } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/ports/user.repository.port';

@Injectable()
export class DrizzleUserRepository implements IUserRepository {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: DrizzleDb,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (rows.length === 0) return null;
    return new UserEntity(rows[0]);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (rows.length === 0) return null;
    return new UserEntity(rows[0]);
  }

  async findByGoogleId(googleId: string): Promise<UserEntity | null> {
    const rows = await this.db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    if (rows.length === 0) return null;
    return new UserEntity(rows[0]);
  }

  async findAll(limit = 50, offset = 0): Promise<UserEntity[]> {
    const rows = await this.db.select().from(users).limit(limit).offset(offset);
    return rows.map((r) => new UserEntity(r));
  }

  async create(userData: Partial<UserEntity>): Promise<UserEntity> {
    let roleId = userData.roleId;
    if (!roleId) {
      const [userRole] = await this.db
        .select()
        .from(roles)
        .where(eq(roles.slug, userData.role || 'user'))
        .limit(1);
      roleId = userRole?.id || null;
    }

    const [inserted] = await this.db
      .insert(users)
      .values({
        email: userData.email!.toLowerCase().trim(),
        name: userData.name || 'User',
        passwordHash: userData.passwordHash || null,
        avatarUrl: userData.avatarUrl || null,
        authProvider: userData.authProvider || 'email',
        roleId,
        role: userData.role || 'user',
        googleId: userData.googleId || null,
        emailVerified: userData.emailVerified || false,
      })
      .returning();
    return new UserEntity(inserted);
  }

  async update(id: string, userData: Partial<UserEntity>): Promise<UserEntity> {
    const updateValues: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (userData.name !== undefined) updateValues.name = userData.name;
    if (userData.passwordHash !== undefined) updateValues.passwordHash = userData.passwordHash;
    if (userData.avatarUrl !== undefined) updateValues.avatarUrl = userData.avatarUrl;
    if (userData.role !== undefined) {
      updateValues.role = userData.role;
      const [newRole] = await this.db
        .select()
        .from(roles)
        .where(eq(roles.slug, userData.role))
        .limit(1);
      if (newRole) {
        updateValues.roleId = newRole.id;
      }
    }
    if (userData.roleId !== undefined) updateValues.roleId = userData.roleId;
    if (userData.googleId !== undefined) updateValues.googleId = userData.googleId;
    if (userData.emailVerified !== undefined) updateValues.emailVerified = userData.emailVerified;

    const [updated] = await this.db
      .update(users)
      .set(updateValues)
      .where(eq(users.id, id))
      .returning();
    return new UserEntity(updated);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.db.delete(users).where(eq(users.id, id)).returning();
    return res.length > 0;
  }
}
