/**
 * @sdd
 * [Objetivo]: Contratos e interfaces para los paneles administrativos del rol ADMIN (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Exporta DTOs de CRUD de usuarios, Bitacora/Log de itinerario, Notas colaborativas y administracion de POIs.
 * [Edge Cases]: Tipado estricto sin any, enum ItineraryStatus, enum EventNoteSeverity.
 */

import { UserRole, UserStatus } from '../auth/auth.contract.js';

// --- Usuarios CRUD ---
/** DTO para la creacion manual de usuarios desde panel admin */
export interface AdminCreateUserDto {
  /** Correo electronico */
  email: string;
  /** Contraseña en texto plano a ser hasheada */
  password: string;
  /** Nombre completo */
  fullName: string;
  /** Rol asignado */
  role: UserRole;
  /** Telefono opcional */
  phone?: string | null;
  /** Avatar opcional */
  avatarUrl?: string | null;
  /** Identificador UUID de la ruta turística asignada */
  routeId?: string | null;
}

/** DTO para actualizar datos de un usuario */
export interface AdminUpdateUserDto {
  /** Nombre completo */
  fullName?: string;
  /** Telefono */
  phone?: string | null;
  /** Rol asignado */
  role?: UserRole;
  /** Estado de la cuenta */
  status?: UserStatus;
  /** Avatar */
  avatarUrl?: string | null;
  /** Identificador UUID de la ruta turística asignada */
  routeId?: string | null;
}

/** Criterios de busqueda para usuarios */
export interface AdminUserQueryDto {
  /** Texto de busqueda */
  search?: string;
  /** Filtro por rol */
  role?: UserRole;
  /** Filtro por estado */
  status?: UserStatus;
  /** Filtro por ruta turística asignada */
  routeId?: string;
}

// --- Itinerario / Bitacora de Ruta ---
/** Estados operativos de un hito en el itinerario */
export enum ItineraryStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
}

/** Representacion de un hito en la bitacora de itinerario */
export interface IRouteLogEntry {
  /** Identificador unico */
  id: string;
  /** Identificador de la ruta asociada */
  routeId?: string | null;
  /** Titulo del hito */
  title: string;
  /** Identificador de waypoint vinculado */
  waypointId?: string | null;
  /** Orden secuencial */
  orderIndex: number;
  /** Hora planificada HH:mm */
  plannedTime: string;
  /** Hora real de ejecucion */
  actualTime?: string | null;
  /** Estado de cumplimiento */
  status: ItineraryStatus;
  /** Notas operativas */
  notes?: string | null;
  /** Fecha de creacion */
  createdAt?: string | Date;
  /** Fecha de actualizacion */
  updatedAt?: string | Date;
}

/** DTO para registrar un nuevo hito */
export interface CreateRouteLogEntryDto {
  /** Identificador de la ruta asociada */
  routeId?: string | null;
  /** Titulo */
  title: string;
  /** Orden secuencial */
  orderIndex: number;
  /** Hora planificada */
  plannedTime: string;
  /** Waypoint vinculado */
  waypointId?: string | null;
  /** Notas */
  notes?: string | null;
}

/** DTO para actualizar un hito */
export interface UpdateRouteLogEntryDto {
  /** Identificador de la ruta asociada */
  routeId?: string | null;
  /** Titulo */
  title?: string;
  /** Orden */
  orderIndex?: number;
  /** Hora planificada */
  plannedTime?: string;
  /** Hora real */
  actualTime?: string | null;
  /** Estado */
  status?: ItineraryStatus;
  /** Notas */
  notes?: string | null;
}

// --- Notas Colaborativas de Eventos ---
/** Severidad de una nota de evento */
export enum EventNoteSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

/** Nota u observacion colaborativa de los guias */
export interface IEventNote {
  /** Identificador unico */
  id: string;
  /** Identificador de la ruta asociada */
  routeId?: string | null;
  /** ID del autor */
  authorId: string;
  /** Nombre del autor */
  authorName: string;
  /** Titulo de la novedad */
  title: string;
  /** Contenido descriptivo */
  content: string;
  /** Severidad */
  severity: EventNoteSeverity;
  /** Fecha y hora */
  createdAt: string | Date;
}

/** DTO para crear una nota de evento */
export interface CreateEventNoteDto {
  /** Identificador de la ruta asociada */
  routeId?: string | null;
  /** Titulo */
  title: string;
  /** Contenido */
  content: string;
  /** Severidad */
  severity: EventNoteSeverity;
}

// --- Gestion Administrativa de POIs ---
/** DTO para crear y georreferenciar un POI */
export interface AdminCreatePoiDto {
  /** Identificador de la ruta asociada */
  routeId?: string | null;
  /** Titulo */
  title: string;
  /** Descripcion */
  description: string;
  /** Indice de orden */
  orderIndex: number;
  /** Coordenada de longitud PostGIS */
  longitude: number;
  /** Coordenada de latitud PostGIS */
  latitude: number;
  /** URL de audioguia */
  audioUrl?: string | null;
  /** URLs de fotografias */
  photoUrls?: string[] | null;
}

/** DTO para actualizar un POI */
export interface AdminUpdatePoiDto {
  /** Identificador de la ruta asociada */
  routeId?: string | null;
  /** Titulo */
  title?: string;
  /** Descripcion */
  description?: string;
  /** Orden */
  orderIndex?: number;
  /** Longitud */
  longitude?: number;
  /** Latitud */
  latitude?: number;
  /** Audioguia */
  audioUrl?: string | null;
  /** Fotografias */
  photoUrls?: string[] | null;
}

// --- Gestion Administrativa de Alertas y Emergencias SOS ---
/** Estados del ciclo de vida de una alerta SOS */
export enum SosAlertStatus {
  PENDING = 'PENDING',
  ATTENDED = 'ATTENDED',
  CANCELLED = 'CANCELLED',
  RESOLVED = 'RESOLVED',
}

/** Entidad / Registro de una alerta SOS para administracion y guias */
export interface ISosAlertEntry {
  /** Identificador unico del incidente */
  id: string;
  /** Identificador del usuario que disparo la alerta */
  userId: string;
  /** Nombre completo del usuario */
  userName: string;
  /** Correo electronico */
  userEmail?: string | null;
  /** Telefono de contacto del usuario */
  userPhone?: string | null;
  /** Latitud geografica */
  latitude: number;
  /** Longitud geografica */
  longitude: number;
  /** Altitud en metros */
  altitude?: number | null;
  /** Nivel de bateria (0-100) */
  batteryLevel?: number | null;
  /** Mensaje de auxilio emitido */
  message: string;
  /** Estado de atencion */
  status: SosAlertStatus;
  /** Fecha y hora de solicitud (ISO) */
  createdAt: string;
  /** Fecha y hora de atencion o cancelacion */
  resolvedAt?: string | null;
  /** Identificador del guia o admin que gestiono la notificacion */
  resolvedById?: string | null;
  /** Nombre del guia o admin que gestiono la notificacion */
  resolvedByName?: string | null;
  /** Nota de resolucion o bitacora del suceso */
  resolutionNote?: string | null;
}

/** DTO para actualizar el estado de una alerta y guardar nota de suceso */
export interface UpdateSosAlertStatusDto {
  /** Nuevo estado a asignar */
  status: SosAlertStatus;
  /** Nota u observacion del suceso (obligatorio) */
  resolutionNote: string;
}

/** DTO para la emision de una alerta de emergencia SOS via REST o WebSocket */
export interface CreateSosTriggerDto {
  /** Latitud del incidente */
  latitude: number;
  /** Longitud del incidente */
  longitude: number;
  /** Altitud opcional en metros */
  altitude?: number | null;
  /** Nivel de bateria (0-100) */
  batteryLevel?: number | null;
  /** Mensaje de auxilio emitido */
  message?: string;
  /** Timestamp epoch en milisegundos */
  timestamp?: number;
}

// --- Rutas y Usuarios (Control de Asistencia y Ficha Médica para Guías) ---

/** Resumen de información médica de emergencia para el guía en campo */
export interface IRouteParticipantMedicalSummary {
  /** Tipo de sangre del usuario (ej: O+, A-, etc.) */
  bloodType: string | null;
  /** Alergias conocidas */
  allergies: string | null;
  /** Tipo de dieta (REGULAR, VEGETARIAN, etc.) */
  dietType: string | null;
  /** Nombre del contacto de emergencia */
  emergencyContactName: string | null;
  /** Teléfono del contacto de emergencia */
  emergencyContactPhone: string | null;
  /** Condiciones médicas o patologías previas */
  medicalConditions: string | null;
  /** Medicamentos suministrados actualmente */
  medications: string | null;
  /** Observaciones o notas adicionales */
  notes: string | null;
}

/** Información del participante/usuario asignado a una ruta para control de asistencia */
export interface IRouteRosterParticipant {
  /** Identificador único del usuario */
  userId: string;
  /** Nombre completo */
  fullName: string;
  /** Correo electrónico */
  email: string;
  /** Teléfono de contacto */
  phone: string | null;
  /** Avatar de perfil de usuario */
  avatarUrl: string | null;
  /** Fotografía subida por el usuario en ficha médica */
  photoUrl: string | null;
  /** Si el usuario ya aceptó la ruta y confirmó asistencia */
  attendanceConfirmed: boolean;
  /** Si el usuario ya completó el diligenciamiento de la ficha médica */
  hasMedicalProfile: boolean;
  /** Fecha de última actualización médica (ISO) */
  medicalUpdatedAt?: string | null;
  /** Resumen médico de emergencia */
  medicalSummary: IRouteParticipantMedicalSummary | null;
}

/** Guía asignado a una ruta */
export interface IRouteAssignedGuide {
  /** Identificador único del guía */
  id: string;
  /** Nombre completo del guía */
  fullName: string;
  /** Teléfono de contacto */
  phone: string | null;
  /** Avatar del guía */
  avatarUrl: string | null;
}

/** Modelo de ruta activa con sus participantes asignados para el guía */
export interface IGuideRouteRoster {
  /** Identificador UUID de la ruta */
  routeId: string;
  /** Nombre de la ruta turística */
  routeName: string;
  /** Municipio o ubicación */
  municipality: string;
  /** Distancia total en kilómetros */
  totalDistanceKm: number;
  /** Duración estimada en minutos */
  estimatedDurationMinutes: number;
  /** Indica si es la ruta oficial activa en el sistema */
  isActive: boolean;
  /** Guías asignados a este recorrido */
  guides: IRouteAssignedGuide[];
  /** Total de usuarios asignados */
  totalParticipants: number;
  /** Total de usuarios con asistencia confirmada */
  confirmedParticipants: number;
  /** Porcentaje de asistencia confirmada (0 - 100) */
  attendanceRatePercentage: number;
  /** Lista de participantes asignados a esta ruta */
  participants: IRouteRosterParticipant[];
}

