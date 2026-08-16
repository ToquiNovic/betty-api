import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RolesService } from './roles.service';

@ApiTags('Roles & Permissions')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles (system and team roles with permissions)' })
  @ApiQuery({ name: 'scope', enum: ['system', 'team'], required: false })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async findAll(@Query('scope') scope?: 'system' | 'team') {
    return this.rolesService.findAll(scope);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role details and granular permissions by ID' })
  @ApiResponse({ status: 200, description: 'Role details' })
  async findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }
}
