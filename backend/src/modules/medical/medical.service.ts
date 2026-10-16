/**
 * @sdd
 * [Objetivo]: Servicio de lógica de negocio para la gestión de fichas médicas y confirmación de asistencia (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta Repository<MedicalProfile>. Métodos getProfileByUserId(userId) y saveProfile(userId, dto).
 * [Edge Cases]: Operación de upsert idempotente según la existencia previa de la ficha médica para el usuario.
 */

// backend/src/modules/medical/medical.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicalProfile } from './entities/medical-profile.entity.js';
import { SaveMedicalProfileDto } from './dto/save-medical-profile.dto.js';
import { Route } from '../routes/entities/route.entity.js';
import { TelemetryGateway } from '../telemetry/gateways/telemetry.gateway.js';

/**
 * Servicio encargado de gestionar fichas medicas y confirmacion de asistencia de excursionistas.
 */
@Injectable()
export class MedicalService {
  /**
   * Instancia de registro para auditoría de fichas médicas y notificaciones.
   */
  private readonly logger = new Logger(MedicalService.name);

  /**
   * Repositorio TypeORM inyectado para fichas medicas, rutas y gateway de telemetría.
   * @param medicalProfileRepository Repositorio de la entidad MedicalProfile.
   * @param routeRepository Repositorio de rutas para consultar guías de la ruta activa.
   * @param telemetryGateway Gateway WebSocket para emisión en tiempo real.
   */
  constructor(
    @InjectRepository(MedicalProfile)
    private readonly medicalProfileRepository: Repository<MedicalProfile>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    private readonly telemetryGateway: TelemetryGateway,
  ) {}

  /**
   * Obtiene la ficha médica de un usuario por su identificador único.
   * @param userId Identificador UUID del usuario.
   * @returns Ficha médica encontrada o null si no se ha registrado.
   */
  async getProfileByUserId(userId: string): Promise<MedicalProfile | null> {
    return this.medicalProfileRepository.findOne({
      where: { userId },
    });
  }

  /**
   * Guarda o actualiza la ficha médica de un usuario de forma idempotente.
   * @param userId Identificador UUID del usuario.
   * @param dto Datos médicos y de asistencia validados.
   * @param userFullName Nombre completo opcional del excursionista para notificaciones.
   * @returns Ficha médica creada o actualizada.
   */
  async saveProfile(
    userId: string,
    dto: SaveMedicalProfileDto,
    userFullName?: string,
  ): Promise<MedicalProfile> {
    let profile = await this.medicalProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      profile = this.medicalProfileRepository.create({
        userId,
        ...dto,
      });
    } else {
      profile.attendanceConfirmed = dto.attendanceConfirmed;
      profile.medicalConditions = dto.medicalConditions ?? null;
      profile.allergies = dto.allergies ?? null;
      profile.medications = dto.medications ?? null;
      profile.dietType = dto.dietType;
      profile.emergencyContactName = dto.emergencyContactName ?? null;
      profile.emergencyContactPhone = dto.emergencyContactPhone ?? null;
      profile.bloodType = dto.bloodType ?? null;
      profile.notes = dto.notes ?? null;
      if (dto.photoUrl !== undefined) {
        profile.photoUrl = dto.photoUrl;
      }
    }

    const savedProfile = await this.medicalProfileRepository.save(profile);

    if (dto.attendanceConfirmed) {
      await this.notifyAssignedGuidesOfRegistration(userId, userFullName);
    }

    return savedProfile;
  }

  /**
   * Notifica a los guías asignados a la ruta activa sobre la confirmación de asistencia.
   * @param userId UUID del excursionista.
   * @param userFullName Nombre completo del excursionista.
   */
  private async notifyAssignedGuidesOfRegistration(userId: string, userFullName?: string): Promise<void> {
    try {
      const activeRoute = await this.routeRepository.findOne({
        where: { isActive: true },
        relations: { guides: true },
      });

      if (!activeRoute) {
        return;
      }

      const assignedGuideEmails = activeRoute.guides
        ? activeRoute.guides.map((guide) => guide.email.toLowerCase())
        : [];
      const assignedGuideUserIds = activeRoute.guides
        ? (activeRoute.guides.map((guide) => guide.userId).filter((id): id is string => Boolean(id)))
        : [];

      this.telemetryGateway.broadcastAttendanceConfirmed({
        routeId: activeRoute.id,
        routeName: activeRoute.name,
        userId,
        userFullName: userFullName || 'Excursionista',
        timestamp: Date.now(),
        assignedGuideEmails,
        assignedGuideUserIds,
      });

      this.logger.log(
        `[Notificación Guías] Asistencia confirmada por ${userFullName || userId} para ruta ${activeRoute.name}. Notificados ${assignedGuideEmails.length} guías.`,
      );
    } catch (error) {
      this.logger.error(`Error emitiendo notificación de asistencia a guías: ${(error as Error).message}`);
    }
  }
}
