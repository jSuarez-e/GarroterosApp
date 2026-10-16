/**
 * @sdd
 * [Objetivo]: Controlador REST para la administración y CRUD de cuentas de usuario por parte de administradores (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Expone rutas bajo /admin/users (GET, POST, GET :id, PUT :id, PATCH :id/status, DELETE :id).
 * [Edge Cases]: Protegido estrictamente con JwtAuthGuard y RolesGuard(ADMIN), previene auto-eliminación.
 */

// backend/src/modules/admin/controllers/admin-users.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { User, UserRole } from '../../users/entities/user.entity.js';
import { AdminUsersService } from '../services/admin-users.service.js';
import {
  AdminCreateUserDto,
  AdminUpdateUserDto,
  AdminUserQueryDto,
} from '../dto/admin-user.dto.js';

/**
 *
 */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  /**
   *
   * @param adminUsersService
   */
  constructor(private readonly adminUsersService: AdminUsersService) {}

  /**
   *
   * @param query
   */
  @Get()
  async getUsers(@Query() query: AdminUserQueryDto): Promise<User[]> {
    return this.adminUsersService.getUsers(query);
  }

  /**
   *
   * @param dto
   */
  @Post()
  async createUser(@Body() dto: AdminCreateUserDto): Promise<User> {
    return this.adminUsersService.createUser(dto);
  }

  /**
   *
   * @param id
   */
  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<User> {
    return this.adminUsersService.getUserById(id);
  }

  /**
   *
   * @param id
   * @param dto
   */
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<User> {
    return this.adminUsersService.updateUser(id, dto);
  }

  /**
   *
   * @param id
   */
  @Patch(':id/status')
  async toggleUserStatus(@Param('id') id: string): Promise<User> {
    return this.adminUsersService.toggleUserStatus(id);
  }

  /**
   *
   * @param id
   * @param adminId
   */
  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<{ /**
   *
   */
  success: boolean; /**
   *
   */
  message: string }> {
    return this.adminUsersService.deleteUser(id, adminId);
  }
}
