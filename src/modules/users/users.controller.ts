import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersService } from './users.service';
import { IsIn, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}

export class UpdateUserRoleDto {
  @IsIn(['admin', 'user'])
  role: 'admin' | 'user';
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current authenticated user profile' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const fullUser = await this.usersService.findById(user.id);
    return fullUser.toJSON();
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.updateProfile(userId, dto);
    return updated.toJSON();
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all platform users (admin only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async listUsers(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const users = await this.usersService.findAll(limit, offset);
    return users.map((u) => u.toJSON());
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update system role of a user (admin only)' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    const updated = await this.usersService.updateRole(id, dto.role);
    return updated.toJSON();
  }
}
