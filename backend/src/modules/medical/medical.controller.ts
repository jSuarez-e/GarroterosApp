/**
 * @sdd
 * [Objetivo]: Controlador REST para la gestión de fichas médicas de excursionistas y confirmación de asistencia (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Expone endpoints GET y POST bajo /medical-profile. Consume MedicalService y extrae usuario con @CurrentUser.
 * [Edge Cases]: Validación con JwtAuthGuard para usuarios y RolesGuard(ADMIN) para inspección por parte de guías.
 */

// backend/src/modules/medical/medical.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { MedicalService } from './medical.service.js';
import { SaveMedicalProfileDto } from './dto/save-medical-profile.dto.js';
import { MedicalProfile } from './entities/medical-profile.entity.js';

/**
 *
 */
@Controller('medical-profile')
@UseGuards(JwtAuthGuard)
export class MedicalController {
  /**
   * Controlador para operaciones de fichas médicas.
   * @param medicalService Servicio de fichas médicas inyectado.
   */
  constructor(private readonly medicalService: MedicalService) {}

  /**
   * Obtiene la ficha médica del usuario actualmente autenticado.
   * @param user Usuario extraído del token JWT.
   * @returns Ficha médica del usuario o null si no existe.
   */
  @Get()
  async getMyProfile(@CurrentUser() user: User): Promise<MedicalProfile | null> {
    return this.medicalService.getProfileByUserId(user.id);
  }

  /**
   * Registra o actualiza la ficha médica y confirmación de asistencia del usuario autenticado.
   * @param user Usuario autenticado.
   * @param dto Datos médicos y de asistencia validados.
   * @returns Ficha médica persistida.
   */
  @Post()
  async saveMyProfile(
    @CurrentUser() user: User,
    @Body() dto: SaveMedicalProfileDto,
  ): Promise<MedicalProfile> {
    return this.medicalService.saveProfile(user.id, dto, user.fullName);
  }

  /**
   * Permite a los guías y administradores consultar la ficha médica de un excursionista específico.
   * @param userId UUID del usuario a consultar.
   * @returns Ficha médica encontrada.
   * @throws NotFoundException si el usuario no tiene ficha médica registrada.
   */
  @Get(':userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getProfileByUserId(@Param('userId') userId: string): Promise<MedicalProfile> {
    const profile = await this.medicalService.getProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException(`Ficha médica para el usuario ${userId} no encontrada.`);
    }
    return profile;
  }
}
