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
  AdminAssignUserRouteDto,
  type IGuideRouteRoster,
} from '../dto/admin-user.dto.js';

/**
 * Controlador administrativo para el ciclo de vida y asignación de usuarios y rutas.
 */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  /**
   * Inicializa el controlador con el servicio administrativo de usuarios.
   * @param adminUsersService Servicio de administración de usuarios.
   */
  constructor(private readonly adminUsersService: AdminUsersService) {}

  /**
   * Obtiene la lista filtrada de usuarios.
   * @param query Criterios de búsqueda y filtrado.
   * @returns Lista de usuarios coincidentes.
   */
  @Get()
  async getUsers(@Query() query: AdminUserQueryDto): Promise<User[]> {
    return this.adminUsersService.getUsers(query);
  }

  /**
   * Registra manualmente un nuevo usuario en la plataforma.
   * @param dto Carga útil de creación de usuario.
   * @returns Usuario recién persistido.
   */
  @Post()
  async createUser(@Body() dto: AdminCreateUserDto): Promise<User> {
    return this.adminUsersService.createUser(dto);
  }

  /**
   * Obtiene la lista de rutas activas con los usuarios asignados para control de asistencia.
   * @param currentUser Usuario administrador o guía en sesión.
   * @returns Lista de rutas con participantes y estado de asistencia.
   */
  @Get('routes-roster')
  async getGuideRouteRoster(
    @CurrentUser() currentUser: User,
  ): Promise<IGuideRouteRoster[]> {
    return this.adminUsersService.getGuideRouteRoster(currentUser);
  }

  /**
   * Consulta el detalle de un usuario por su identificador único.
   * @param id Identificador UUID del usuario.
   * @returns Datos del usuario.
   */
  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<User> {
    return this.adminUsersService.getUserById(id);
  }

  /**
   * Actualiza los datos de un usuario existente.
   * @param id Identificador UUID del usuario.
   * @param dto Carga útil de modificación.
   * @returns Usuario con las modificaciones aplicadas.
   */
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<User> {
    return this.adminUsersService.updateUser(id, dto);
  }

  /**
   * Alterna el estado activo/inactivo de una cuenta.
   * @param id Identificador UUID del usuario.
   * @returns Usuario con el nuevo estado.
   */
  @Patch(':id/status')
  async toggleUserStatus(@Param('id') id: string): Promise<User> {
    return this.adminUsersService.toggleUserStatus(id);
  }

  /**
   * Configura o actualiza la ruta asignada a un usuario.
   * @param id UUID del usuario a actualizar.
   * @param dto Payload con el identificador de la ruta turística o null.
   * @returns Usuario con la ruta actualizada.
   */
  @Patch(':id/route')
  async assignUserRoute(
    @Param('id') id: string,
    @Body() dto: AdminAssignUserRouteDto,
  ): Promise<User> {
    return this.adminUsersService.assignUserRoute(id, dto.routeId ?? null);
  }

  /**
   * Elimina permanentemente una cuenta de usuario.
   * @param id Identificador UUID del usuario a eliminar.
   * @param adminId Identificador del administrador en sesión.
   * @returns Objeto de confirmación con bandera success y mensaje descriptivo.
   */
  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<{
    /** Indicador de éxito */
    success: boolean;
    /** Mensaje de confirmación */
    message: string;
  }> {
    return this.adminUsersService.deleteUser(id, adminId);
  }
}
