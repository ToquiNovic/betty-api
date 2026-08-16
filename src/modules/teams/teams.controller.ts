import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateTeamDto,
  InviteMemberDto,
  JoinByCodeDto,
  UpdateTeamDto,
} from './application/dtos/team.dto';
import { TeamsService } from './teams.service';

@ApiTags('Teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({ status: 201, description: 'Team created successfully' })
  async createTeam(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.createTeam(userId, dto);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get list of available roles and permissions' })
  async getRoles() {
    return this.teamsService.getRoles();
  }

  @Get()
  @ApiOperation({ summary: 'Get list of teams user belongs to' })
  async getUserTeams(@CurrentUser('id') userId: string) {
    return this.teamsService.getUserTeams(userId);
  }

  @Post('join/code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join team using 8-character invite code' })
  async joinByCode(
    @CurrentUser('id') userId: string,
    @Body() dto: JoinByCodeDto,
  ) {
    return this.teamsService.joinByCode(userId, dto);
  }

  @Post('join/token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join team using invite link token' })
  async joinByToken(
    @CurrentUser('id') userId: string,
    @Query('token') token: string,
  ) {
    return this.teamsService.joinByInviteToken(userId, token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team details and members' })
  async getTeamById(
    @Param('id') teamId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.teamsService.getTeamById(teamId, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team name or description' })
  async updateTeam(
    @Param('id') teamId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.updateTeam(teamId, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team (owner only)' })
  async deleteTeam(
    @Param('id') teamId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.teamsService.deleteTeam(teamId, userId);
  }

  @Post(':id/invitations/link')
  @ApiOperation({ summary: 'Generate shareable invite link (owner/admin only)' })
  async generateInviteLink(
    @Param('id') teamId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.teamsService.generateInviteLink(teamId, userId);
  }

  @Post(':id/invitations/email')
  @ApiOperation({ summary: 'Send email invitation to team member' })
  async inviteByEmail(
    @Param('id') teamId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.teamsService.inviteByEmail(teamId, userId, dto);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from team (owner/admin only)' })
  async removeMember(
    @Param('id') teamId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.teamsService.removeMember(teamId, memberId, userId);
  }
}
