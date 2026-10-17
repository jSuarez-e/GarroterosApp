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
import { User } from '../users/entities/user.entity.js';
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
   * Repositorio TypeORM inyectado para fichas medicas, rutas, usuarios y gateway de telemetría.
   * @param medicalProfileRepository Repositorio de la entidad MedicalProfile.
   * @param routeRepository Repositorio de rutas para consultar guías de la ruta activa.
   * @param userRepository Repositorio de usuarios para resolver la ruta asignada al excursionista.
   * @param telemetryGateway Gateway WebSocket para emisión en tiempo real.
   */
  constructor(
    @InjectRepository(MedicalProfile)
    private readonly medicalProfileRepository: Repository<MedicalProfile>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly telemetryGateway: TelemetryGateway,
  ) {}

  /**
   * Obtiene la ficha médica de un usuario por su identificador único cargando la ruta vinculada.
   * @param userId Identificador UUID del usuario.
   * @returns Ficha médica encontrada o null si no se ha registrado.
   */
  async getProfileByUserId(userId: string): Promise<MedicalProfile | null> {
    return this.medicalProfileRepository.findOne({
      where: { userId },
      relations: { route: true },
    });
  }

  /**
   * Guarda o actualiza la ficha médica de un usuario de forma idempotente asociando la ruta asignada.
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

    let targetRouteId: string | null = null;
    if (dto.routeId !== undefined) {
      targetRouteId = dto.routeId;
    } else {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      targetRouteId = user?.routeId ?? null;
    }

    if (!profile) {
      profile = this.medicalProfileRepository.create({
        userId,
        routeId: targetRouteId,
        ...dto,
      });
    } else {
      profile.attendanceConfirmed = dto.attendanceConfirmed;
      profile.routeId = targetRouteId;
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

    await this.medicalProfileRepository.save(profile);

    // Sincronizar fotografía con la entidad User para disponibilidad transversal
    if (dto.photoUrl !== undefined) {
      const userEntity = await this.userRepository.findOne({ where: { id: userId } });
      if (userEntity && userEntity.avatarUrl !== dto.photoUrl) {
        userEntity.avatarUrl = dto.photoUrl ?? null;
        await this.userRepository.save(userEntity);
      }
    }

    if (dto.attendanceConfirmed) {
      await this.notifyAssignedGuidesOfRegistration(userId, userFullName, targetRouteId);
    }

    const reloadedProfile = await this.getProfileByUserId(userId);
    return reloadedProfile || profile;
  }

  /**
   * Notifica a los guías asignados a la ruta del excursionista sobre la confirmación de asistencia.
   * @param userId UUID del excursionista.
   * @param userFullName Nombre completo del excursionista.
   * @param routeId Identificador UUID opcional de la ruta asignada.
   */
  private async notifyAssignedGuidesOfRegistration(
    userId: string,
    userFullName?: string,
    routeId?: string | null,
  ): Promise<void> {
    try {
      let targetRoute: Route | null = null;
      if (routeId) {
        targetRoute = await this.routeRepository.findOne({
          where: { id: routeId },
          relations: { guides: true },
        });
      }

      if (!targetRoute) {
        targetRoute = await this.routeRepository.findOne({
          where: { isActive: true },
          relations: { guides: true },
        });
      }

      if (!targetRoute) {
        return;
      }

      const assignedGuideEmails = targetRoute.guides
        ? targetRoute.guides.map((guide) => guide.email.toLowerCase())
        : [];
      const assignedGuideUserIds = targetRoute.guides
        ? targetRoute.guides.map((guide) => guide.userId).filter((id): id is string => Boolean(id))
        : [];

      this.telemetryGateway.broadcastAttendanceConfirmed({
        routeId: targetRoute.id,
        routeName: targetRoute.name,
        userId,
        userFullName: userFullName || 'Excursionista',
        timestamp: Date.now(),
        assignedGuideEmails,
        assignedGuideUserIds,
      });

      this.logger.log(
        `[Notificación Guías] Asistencia confirmada por ${userFullName || userId} para ruta ${targetRoute.name}. Notificados ${assignedGuideEmails.length} guías.`,
      );
    } catch (error) {
      this.logger.error(`Error emitiendo notificación de asistencia a guías: ${(error as Error).message}`);
    }
  }
}
