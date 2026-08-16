import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { DRIZZLE_ORM, DrizzleDb } from '../../database/drizzle.provider';
import { roles } from '../../database/schema/roles.schema';
import { teamInvitations, teamMembers, teams } from '../../database/schema/teams.schema';
import { users } from '../../database/schema/users.schema';
import { EmailService } from '../email/email.service';
import { CreateTeamDto, InviteMemberDto, JoinByCodeDto, UpdateTeamDto } from './application/dtos/team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: DrizzleDb,
    private readonly emailService: EmailService,
  ) {}

  async getRoles() {
    return this.db.select().from(roles);
  }

  async createTeam(userId: string, dto: CreateTeamDto) {
    let inviteCode = CryptoUtil.generateTeamCode();
    let isUnique = false;

    // Ensure inviteCode uniqueness
    while (!isUnique) {
      const existing = await this.db.select().from(teams).where(eq(teams.inviteCode, inviteCode)).limit(1);
      if (existing.length === 0) {
        isUnique = true;
      } else {
        inviteCode = CryptoUtil.generateTeamCode();
      }
    }

    const [newTeam] = await this.db
      .insert(teams)
      .values({
        name: dto.name,
        description: dto.description,
        inviteCode,
        ownerId: userId,
      })
      .returning();

    const [ownerRole] = await this.db.select().from(roles).where(eq(roles.slug, 'owner')).limit(1);

    // Automatically add creator as owner member
    await this.db.insert(teamMembers).values({
      teamId: newTeam.id,
      userId,
      roleId: ownerRole?.id || null,
      role: 'owner',
    });

    return newTeam;
  }

  async getUserTeams(userId: string) {
    const memberships = await this.db
      .select({
        teamId: teamMembers.teamId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        teamName: teams.name,
        teamDescription: teams.description,
        inviteCode: teams.inviteCode,
        ownerId: teams.ownerId,
        createdAt: teams.createdAt,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));

    return memberships;
  }

  async getTeamById(teamId: string, userId: string) {
    await this.verifyMembership(teamId, userId);

    const [team] = await this.db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) {
      throw new NotFoundException('teams.not_found');
    }

    const members = await this.db
      .select({
        id: teamMembers.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    return {
      ...team,
      members,
    };
  }

  async joinByCode(userId: string, dto: JoinByCodeDto) {
    const [team] = await this.db
      .select()
      .from(teams)
      .where(eq(teams.inviteCode, dto.code.trim().toUpperCase()))
      .limit(1);

    if (!team) {
      throw new NotFoundException('teams.invalid_invite');
    }

    // Check if already a member
    const existing = await this.db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('teams.member_exists');
    }

    const [memberRole] = await this.db.select().from(roles).where(eq(roles.slug, 'member')).limit(1);

    const [newMember] = await this.db
      .insert(teamMembers)
      .values({
        teamId: team.id,
        userId,
        roleId: memberRole?.id || null,
        role: 'member',
      })
      .returning();

    return {
      message: 'teams.joined',
      team,
      membership: newMember,
    };
  }

  async generateInviteLink(teamId: string, userId: string) {
    await this.verifyRole(teamId, userId, ['owner', 'admin']);

    const inviteToken = CryptoUtil.generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invitation] = await this.db
      .insert(teamInvitations)
      .values({
        teamId,
        inviteToken,
        expiresAt,
        isUsed: false,
      })
      .returning();

    return {
      inviteToken: invitation.inviteToken,
      expiresAt: invitation.expiresAt,
    };
  }

  async joinByInviteToken(userId: string, token: string) {
    const [invitation] = await this.db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.inviteToken, token))
      .limit(1);

    if (!invitation || invitation.isUsed || new Date() > invitation.expiresAt) {
      throw new BadRequestException('teams.invalid_invite');
    }

    const [team] = await this.db
      .select()
      .from(teams)
      .where(eq(teams.id, invitation.teamId))
      .limit(1);

    if (!team) {
      throw new NotFoundException('teams.not_found');
    }

    // Check if already member
    const existing = await this.db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('teams.member_exists');
    }

    const [memberRole] = await this.db.select().from(roles).where(eq(roles.slug, 'member')).limit(1);

    const [newMember] = await this.db
      .insert(teamMembers)
      .values({
        teamId: team.id,
        userId,
        roleId: memberRole?.id || null,
        role: 'member',
      })
      .returning();

    return {
      message: 'teams.joined',
      team,
      membership: newMember,
    };
  }

  async inviteByEmail(teamId: string, userId: string, dto: InviteMemberDto) {
    await this.verifyRole(teamId, userId, ['owner', 'admin']);

    const [team] = await this.db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    const [inviter] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);

    const { inviteToken } = await this.generateInviteLink(teamId, userId);
    await this.emailService.sendTeamInvitationEmail(dto.email, team.name, inviter.name, inviteToken);

    return { message: 'common.success', email: dto.email };
  }

  async removeMember(teamId: string, targetUserId: string, requesterId: string) {
    const requesterRole = await this.verifyRole(teamId, requesterId, ['owner', 'admin']);

    const [targetMembership] = await this.db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)))
      .limit(1);

    if (!targetMembership) {
      throw new NotFoundException('teams.not_found');
    }

    if (targetMembership.role === 'owner') {
      throw new BadRequestException('teams.cannot_remove_owner');
    }

    if (requesterRole === 'admin' && targetMembership.role === 'admin') {
      throw new ForbiddenException('teams.forbidden');
    }

    await this.db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)));

    return { message: 'common.success' };
  }

  async updateTeam(teamId: string, userId: string, dto: UpdateTeamDto) {
    await this.verifyRole(teamId, userId, ['owner', 'admin']);

    const [updated] = await this.db
      .update(teams)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId))
      .returning();

    return updated;
  }

  async deleteTeam(teamId: string, userId: string) {
    await this.verifyRole(teamId, userId, ['owner']);
    await this.db.delete(teams).where(eq(teams.id, teamId));
    return { message: 'common.success' };
  }

  // Helpers
  async verifyMembership(teamId: string, userId: string) {
    const [membership] = await this.db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .limit(1);

    if (!membership) {
      throw new ForbiddenException('teams.forbidden');
    }
    return membership;
  }

  async verifyRole(teamId: string, userId: string, allowedRoles: string[]) {
    const membership = await this.verifyMembership(teamId, userId);
    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('teams.forbidden');
    }
    return membership.role;
  }
}
