/**
 * @sdd
 * [Objetivo]: Controlador REST para la consulta de rutas y lista de usuarios asignados con control de asistencia para guías turísticos y administradores (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Expone GET /admin/routes-users. Inyecta AdminUsersService y extrae CurrentUser en sesión. Retorna IGuideRouteRoster[].
 * [Edge Cases]: Protegido estrictamente con JwtAuthGuard y RolesGuard(ADMIN), maneja guías sin rutas asignadas o rutas sin usuarios.
 */

// backend/src/modules/admin/controllers/admin-routes-users.controller.ts

import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { User, UserRole } from '../../users/entities/user.entity.js';
import { AdminUsersService } from '../services/admin-users.service.js';
import type { IGuideRouteRoster } from '../dto/admin-user.dto.js';

/**
 * Controlador administrativo enfocado en la verificación de asistencia y ficha médica por ruta para el guía.
 */
@Controller('admin/routes-users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminRoutesUsersController {
  /**
   * Inicializa el controlador inyectando el servicio de usuarios y control de asistencia.
   * @param adminUsersService Servicio administrativo de usuarios y rutas.
   */
  constructor(private readonly adminUsersService: AdminUsersService) {}

  /**
   * Obtiene las rutas activas para el guía en sesión con sus participantes asignados y estados de asistencia.
   * @param currentUser Usuario autenticado (Guía o Administrador).
   * @returns Lista de rutas con participantes, badges de asistencia y resúmenes médicos.
   */
  @Get()
  async getRoster(
    @CurrentUser() currentUser: User,
  ): Promise<IGuideRouteRoster[]> {
    return this.adminUsersService.getGuideRouteRoster(currentUser);
  }
}
