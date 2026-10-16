/**
 * @sdd
 * [Objetivo]: Servicio administrativo para consulta, auditoria y resolucion con notas de alertas SOS (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta Repository<SosAlert> y Repository<User>. Expone getAlerts, createAlertFromTrigger y updateAlertStatus.
 * [Edge Cases]: Validacion de existencia de alerta (NotFoundException), orden cronologico descendente.
 */

// backend/src/modules/admin/services/admin-alerts.service.ts

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SosAlert, SosAlertStatus } from '../entities/sos-alert.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { UpdateSosAlertDto } from '../dto/update-sos-alert.dto.js';

/**
 * Datos para la creacion automatica de alertas desde eventos WebSocket.
 */
export interface CreateSosAlertTriggerData {
  /** UUID del usuario emisor */
  userId: string;
  /** Nombre completo */
  fullName: string;
  /** Latitud geografica */
  latitude: number;
  /** Longitud geografica */
  longitude: number;
  /** Altitud sobre el nivel del mar en metros */
  altitude?: number | null;
  /** Nivel de bateria */
  batteryLevel?: number | null;
  /** Mensaje de auxilio */
  message?: string;
  /** Marca de tiempo epoch */
  timestamp?: number;
}

/**
 * Representacion plana de una alerta SOS para transferencia de datos.
 */
export interface SosAlertResponseItem {
  /** UUID unico */
  id: string;
  /** UUID del usuario */
  userId: string;
  /** Nombre completo */
  userName: string;
  /** Correo electronico */
  userEmail: string | null;
  /** Telefono */
  userPhone: string | null;
  /** Latitud */
  latitude: number;
  /** Longitud */
  longitude: number;
  /** Altitud */
  altitude: number | null;
  /** Nivel de bateria */
  batteryLevel: number | null;
  /** Mensaje */
  message: string;
  /** Estado de atencion */
  status: SosAlertStatus;
  /** Fecha de creacion ISO */
  createdAt: string;
  /** Fecha de resolucion ISO */
  resolvedAt: string | null;
  /** ID del guia resolutor */
  resolvedById: string | null;
  /** Nombre del guia resolutor */
  resolvedByName: string | null;
  /** Nota explicativa */
  resolutionNote: string | null;
}

/**
 * Servicio encargado de la gestion y auditoria de incidentes de auxilio SOS.
 */
@Injectable()
export class AdminAlertsService {
  /**
   * Logger del servicio de administracion de alertas.
   */
  private readonly logger = new Logger(AdminAlertsService.name);

  /**
   * Constructor con inyeccion de repositorios de persistencia.
   * @param sosAlertRepository Repositorio TypeORM para alertas SOS.
   * @param userRepository Repositorio TypeORM para usuarios.
   */
  constructor(
    @InjectRepository(SosAlert)
    private readonly sosAlertRepository: Repository<SosAlert>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Obtiene la lista de alertas SOS registradas con filtro opcional de estado.
   * @param status Filtro opcional por estado.
   * @returns Lista de alertas en formato compatible con frontend.
   */
  async getAlerts(status?: SosAlertStatus): Promise<SosAlertResponseItem[]> {
    const query = this.sosAlertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.user', 'user')
      .orderBy('alert.createdAt', 'DESC');

    if (status) {
      query.where('alert.status = :status', { status });
    }

    const alerts = await query.getMany();
    return alerts.map((a) => this.mapToEntry(a));
  }

  /**
   * Registra una nueva alerta SOS en base de datos al ser disparada por WebSocket.
   * @param data Datos de la emergencia transmitidos por el usuario.
   * @returns Alerta persistida.
   */
  async createAlertFromTrigger(data: CreateSosAlertTriggerData): Promise<SosAlert> {
    const user = await this.userRepository.findOne({ where: { id: data.userId } });

    const alert = this.sosAlertRepository.create({
      userId: data.userId,
      userName: data.fullName || user?.fullName || 'Usuario',
      userEmail: user?.email || null,
      userPhone: user?.phone || null,
      location: {
        type: 'Point',
        coordinates: [data.longitude, data.latitude],
      },
      altitude: data.altitude ?? null,
      batteryLevel: data.batteryLevel ?? null,
      message: data.message || '¡ALERTA SOS! Usuario solicita asistencia inmediata en ruta.',
      status: SosAlertStatus.PENDING,
      createdAt: data.timestamp ? new Date(data.timestamp) : new Date(),
    });

    const saved = await this.sosAlertRepository.save(alert);
    this.logger.warn(`[SosAlert Registrada] ID: ${saved.id} de ${alert.userName} [${data.latitude}, ${data.longitude}]`);
    return saved;
  }

  /**
   * Actualiza el estado de una alerta y guarda la nota del suceso.
   * @param alertId Identificador de la alerta.
   * @param adminUser Usuario administrador o guia que atiende.
   * @param dto Nuevo estado y nota de resolucion.
   * @returns Alerta actualizada.
   */
  async updateAlertStatus(
    alertId: string,
    adminUser: User,
    dto: UpdateSosAlertDto,
  ): Promise<SosAlertResponseItem> {
    const alert = await this.sosAlertRepository.findOne({ where: { id: alertId } });
    if (!alert) {
      throw new NotFoundException(`Alerta SOS con ID ${alertId} no encontrada`);
    }

    alert.status = dto.status;
    alert.resolutionNote = dto.resolutionNote;
    alert.resolvedById = adminUser.id;
    alert.resolvedByName = adminUser.fullName;
    alert.resolvedAt = new Date();

    const updated = await this.sosAlertRepository.save(alert);
    this.logger.log(`Alerta ${alertId} marcada como ${dto.status} por ${adminUser.fullName}`);
    return this.mapToEntry(updated);
  }

  /**
   * Mapea la entidad TypeORM a la interfaz SosAlertResponseItem.
   * @param alert Entidad de base de datos.
   * @returns DTO plano serializable.
   */
  public mapToEntry(alert: SosAlert): SosAlertResponseItem {
    const coords = alert.location?.coordinates || [0, 0];
    return {
      id: alert.id,
      userId: alert.userId,
      userName: alert.userName,
      userEmail: alert.userEmail || alert.user?.email || null,
      userPhone: alert.userPhone || alert.user?.phone || null,
      latitude: coords[1],
      longitude: coords[0],
      altitude: alert.altitude,
      batteryLevel: alert.batteryLevel,
      message: alert.message,
      status: alert.status,
      createdAt: alert.createdAt ? alert.createdAt.toISOString() : new Date().toISOString(),
      resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
      resolvedById: alert.resolvedById,
      resolvedByName: alert.resolvedByName,
      resolutionNote: alert.resolutionNote,
    };
  }
}
