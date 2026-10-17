/**
 * @sdd
 * [Objetivo]: Servicio frontend centralizado para la administración de usuarios, bitácora de ruta, notas y POIs (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Consume HttpClient contra endpoints /api/v1/admin/*. Expone métodos CRUD para usuarios, itinerario, notas de guías y POIs.
 * [Edge Cases]: Tipado estricto sin any, consumo de enums compartidos y manejo resiliente de errores HTTP.
 */

// frontend/src/app/core/services/admin.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserRole, UserStatus, IUser } from './auth.service';
import {
  SosAlertStatus,
  type ISosAlertEntry,
  type UpdateSosAlertStatusDto,
  type IGuideRouteRoster,
  type IRouteRosterParticipant,
  type IRouteParticipantMedicalSummary,
} from '../../../../../shared/src/index';

export interface AdminCreateUserDto {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
  routeId?: string | null;
}

export interface AdminUpdateUserDto {
  fullName?: string;
  phone?: string | null;
  role?: UserRole;
  status?: UserStatus;
  avatarUrl?: string | null;
  routeId?: string | null;
}

export interface AdminUserQueryDto {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  routeId?: string;
}

export enum ItineraryStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
}

export interface IRouteLogEntry {
  id: string;
  routeId?: string | null;
  title: string;
  waypointId?: string | null;
  orderIndex: number;
  plannedTime: string;
  actualTime?: string | null;
  status: ItineraryStatus;
  notes?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateRouteLogEntryDto {
  routeId?: string | null;
  title: string;
  orderIndex: number;
  plannedTime: string;
  waypointId?: string | null;
  notes?: string | null;
}

export interface UpdateRouteLogEntryDto {
  routeId?: string | null;
  title?: string;
  orderIndex?: number;
  plannedTime?: string;
  actualTime?: string | null;
  status?: ItineraryStatus;
  notes?: string | null;
}

export enum EventNoteSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface IEventNote {
  id: string;
  routeId?: string | null;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  severity: EventNoteSeverity;
  createdAt: string | Date;
}

export interface CreateEventNoteDto {
  routeId?: string | null;
  title: string;
  content: string;
  severity: EventNoteSeverity;
}

export interface AdminPoi {
  id: string;
  routeId?: string | null;
  routeName?: string;
  title: string;
  description: string;
  orderIndex: number;
  latitude: number;
  longitude: number;
  audioUrl?: string | null;
  photoUrls?: string[];
}

export interface AdminCreatePoiDto {
  routeId?: string | null;
  title: string;
  description: string;
  orderIndex: number;
  latitude: number;
  longitude: number;
  audioUrl?: string | null;
  photoUrls?: string[];
}

export interface AdminUpdatePoiDto {
  routeId?: string | null;
  title?: string;
  description?: string;
  orderIndex?: number;
  latitude?: number;
  longitude?: number;
  audioUrl?: string | null;
  photoUrls?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseAdminUrl = `${environment.apiUrl}/admin`;

  // === USUARIOS ===

  /**
   * Obtiene la lista de usuarios según los filtros especificados.
   * @param query Filtros de búsqueda, rol y estado.
   * @returns Observable con la lista de usuarios.
   */
  getUsers(query?: AdminUserQueryDto): Observable<IUser[]> {
    let params = new HttpParams();
    if (query?.search) params = params.set('search', query.search.trim());
    if (query?.role) params = params.set('role', query.role);
    if (query?.status) params = params.set('status', query.status);
    if (query?.routeId) params = params.set('routeId', query.routeId);

    return this.http.get<IUser[]>(`${this.baseAdminUrl}/users`, { params });
  }

  /**
   * Crea un usuario de forma manual con credenciales asignadas.
   * @param dto Datos del usuario a crear.
   * @returns Observable con el usuario creado.
   */
  createUser(dto: AdminCreateUserDto): Observable<IUser> {
    return this.http.post<IUser>(`${this.baseAdminUrl}/users`, dto);
  }

  /**
   * Obtiene los datos detallados de un usuario.
   * @param id UUID del usuario.
   * @returns Observable con el usuario.
   */
  getUser(id: string): Observable<IUser> {
    return this.http.get<IUser>(`${this.baseAdminUrl}/users/${id}`);
  }

  /**
   * Actualiza los datos de un usuario.
   * @param id UUID del usuario.
   * @param dto Datos a modificar.
   * @returns Observable con el usuario actualizado.
   */
  updateUser(id: string, dto: AdminUpdateUserDto): Observable<IUser> {
    return this.http.put<IUser>(`${this.baseAdminUrl}/users/${id}`, dto);
  }

  /**
   * Alterna el estado activo/inactivo de una cuenta.
   * @param id UUID del usuario.
   * @returns Observable con el usuario actualizado.
   */
  toggleUserStatus(id: string): Observable<IUser> {
    return this.http.patch<IUser>(`${this.baseAdminUrl}/users/${id}/status`, {});
  }

  /**
   * Configura o actualiza la ruta turística asignada a un usuario.
   * @param id UUID del usuario.
   * @param routeId UUID de la ruta turística o null para desasignar.
   * @returns Observable con el usuario actualizado.
   */
  assignUserRoute(id: string, routeId: string | null): Observable<IUser> {
    return this.http.patch<IUser>(`${this.baseAdminUrl}/users/${id}/route`, { routeId });
  }

  /**
   * Elimina un usuario del sistema.
   * @param id UUID del usuario.
   * @returns Observable con el resultado de la operación.
   */
  deleteUser(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseAdminUrl}/users/${id}`);
  }

  // === ITINERARIO / BITÁCORA DE RUTA ===

  /**
   * Obtiene la secuencia cronológica de hitos del itinerario, opcionalmente filtrada por ruta.
   * @param routeId Identificador opcional de la ruta.
   * @returns Observable con los hitos de la ruta.
   */
  getLogEntries(routeId?: string): Observable<IRouteLogEntry[]> {
    let params = new HttpParams();
    if (routeId) params = params.set('routeId', routeId);
    return this.http.get<IRouteLogEntry[]>(`${this.baseAdminUrl}/log`, { params });
  }

  /**
   * Registra un nuevo hito de itinerario.
   * @param dto Datos del hito.
   * @returns Observable con el hito creado.
   */
  createLogEntry(dto: CreateRouteLogEntryDto): Observable<IRouteLogEntry> {
    return this.http.post<IRouteLogEntry>(`${this.baseAdminUrl}/log`, dto);
  }

  /**
   * Actualiza el progreso o anotaciones de un hito.
   * @param id UUID del hito.
   * @param dto Datos a actualizar.
   * @returns Observable con el hito actualizado.
   */
  updateLogEntry(id: string, dto: UpdateRouteLogEntryDto): Observable<IRouteLogEntry> {
    return this.http.put<IRouteLogEntry>(`${this.baseAdminUrl}/log/${id}`, dto);
  }

  /**
   * Elimina un hito del itinerario.
   * @param id UUID del hito a eliminar.
   * @returns Observable con la confirmación.
   */
  deleteLogEntry(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseAdminUrl}/log/${id}`);
  }

  // === NOTAS COLABORATIVAS ===

  /**
   * Obtiene la bitácora interna de notas de eventos de los guías, opcionalmente filtrada por ruta.
   * @param routeId Identificador opcional de la ruta.
   * @returns Observable con la lista de notas cronológicas.
   */
  getNotes(routeId?: string): Observable<IEventNote[]> {
    let params = new HttpParams();
    if (routeId) params = params.set('routeId', routeId);
    return this.http.get<IEventNote[]>(`${this.baseAdminUrl}/notes`, { params });
  }

  /**
   * Crea una nueva nota de incidencia o evento en ruta.
   * @param dto Datos de la nota.
   * @returns Observable con la nota creada.
   */
  createNote(dto: CreateEventNoteDto): Observable<IEventNote> {
    return this.http.post<IEventNote>(`${this.baseAdminUrl}/notes`, dto);
  }

  /**
   * Elimina una nota de evento.
   * @param id UUID de la nota.
   * @returns Observable con la confirmación.
   */
  deleteNote(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseAdminUrl}/notes/${id}`);
  }

  // === GESTIÓN DE POIs ===

  /**
   * Obtiene todos los puntos de interés administrables, opcionalmente filtrados por ruta.
   * @param routeId Identificador opcional de la ruta.
   * @returns Observable con la lista de POIs.
   */
  getPois(routeId?: string): Observable<AdminPoi[]> {
    let params = new HttpParams();
    if (routeId) params = params.set('routeId', routeId);
    return this.http.get<AdminPoi[]>(`${this.baseAdminUrl}/pois`, { params });
  }

  /**
   * Obtiene un POI específico por su ID.
   * @param id UUID del punto de interés.
   * @returns Observable con los datos del POI.
   */
  getPoi(id: string): Observable<AdminPoi> {
    return this.http.get<AdminPoi>(`${this.baseAdminUrl}/pois/${id}`);
  }

  /**
   * Crea y georreferencia un nuevo punto de interés.
   * @param dto Datos del POI incluyendo coordenadas.
   * @returns Observable con el POI creado.
   */
  createPoi(dto: AdminCreatePoiDto): Observable<AdminPoi> {
    return this.http.post<AdminPoi>(`${this.baseAdminUrl}/pois`, dto);
  }

  /**
   * Actualiza los datos o georreferenciación de un POI.
   * @param id UUID del POI.
   * @param dto Datos modificados.
   * @returns Observable con el POI actualizado.
   */
  updatePoi(id: string, dto: AdminUpdatePoiDto): Observable<AdminPoi> {
    return this.http.put<AdminPoi>(`${this.baseAdminUrl}/pois/${id}`, dto);
  }

  /**
   * Elimina un POI de la ruta.
   * @param id UUID del POI a eliminar.
   * @returns Observable con la confirmación.
   */
  deletePoi(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseAdminUrl}/pois/${id}`);
  }

  // === GESTIÓN DE ALERTAS Y EMERGENCIAS SOS ===

  /**
   * Obtiene la lista de alertas SOS registradas con filtro opcional de estado.
   * @param status Filtro opcional (PENDING, ATTENDED, CANCELLED, RESOLVED).
   * @returns Observable con la lista de alertas SOS.
   */
  getSosAlerts(status?: SosAlertStatus): Observable<ISosAlertEntry[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<ISosAlertEntry[]>(`${this.baseAdminUrl}/alerts`, { params });
  }

  /**
   * Actualiza el estado de una alerta SOS y registra la nota de resolución o bitácora de suceso.
   * @param alertId UUID de la alerta.
   * @param dto Nuevo estado y nota explicativa obligatoria.
   * @returns Observable con la alerta actualizada.
   */
  updateSosAlertStatus(alertId: string, dto: UpdateSosAlertStatusDto): Observable<ISosAlertEntry> {
    return this.http.patch<ISosAlertEntry>(`${this.baseAdminUrl}/alerts/${alertId}/status`, dto);
  }

  // === GESTIÓN DE RUTAS Y USUARIOS (ROSTER Y CONTROL DE ASISTENCIA PARA GUÍAS) ===

  /**
   * Obtiene la lista de rutas activas con los usuarios asignados para el control y verificación de asistencia por parte del guía.
   * @returns Observable con el listado estructurado de rutas y participantes.
   */
  getGuideRouteRoster(): Observable<IGuideRouteRoster[]> {
    return this.http.get<IGuideRouteRoster[]>(`${this.baseAdminUrl}/routes-users`);
  }
}

export type {
  IGuideRouteRoster,
  IRouteRosterParticipant,
  IRouteParticipantMedicalSummary,
};

