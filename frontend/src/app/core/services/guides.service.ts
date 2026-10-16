/**
 * @sdd
 * [Objetivo]: Servicio frontend para consultar el directorio de guías turísticos y su administración (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Consume endpoints /api/v1/guides/*. Expone operaciones getGuides, getAllGuides, createGuide, updateGuide y deleteGuide.
 * [Edge Cases]: Tipado estricto IGuideProfile sin any, soporte para filtrado reactivo por ruta y término de búsqueda.
 */

// frontend/src/app/core/services/guides.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  IGuideProfile,
  CreateGuideDto,
  UpdateGuideDto,
} from '../../../../../shared/src/index';

export type { IGuideProfile };

@Injectable({
  providedIn: 'root',
})
export class GuidesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/guides`;

  /**
   * Obtiene la lista de guías oficiales asignados al recorrido oficial activo o filtrados por ruta / búsqueda.
   * @param search Texto para buscar por nombre o correo.
   * @param routeId Identificador de ruta específica para consultar sus guías asignados.
   * @returns Observable con la lista de perfiles de guías.
   */
  getGuides(search?: string, routeId?: string): Observable<IGuideProfile[]> {
    let params = new HttpParams();
    if (search && search.trim().length > 0) {
      params = params.set('search', search.trim());
    }
    if (routeId) {
      params = params.set('routeId', routeId);
    }
    return this.http.get<IGuideProfile[]>(this.baseUrl, { params });
  }

  /**
   * Obtiene la totalidad de guías registrados en el catálogo para el panel de selección de rutas.
   * @returns Observable con todos los guías turísticos.
   */
  getAllGuides(): Observable<IGuideProfile[]> {
    return this.http.get<IGuideProfile[]>(`${this.baseUrl}/all`);
  }

  /**
   * Registra un nuevo guía en la base de datos (rol administrador).
   * @param dto Datos del nuevo guía.
   * @returns Observable con el guía creado.
   */
  createGuide(dto: CreateGuideDto): Observable<IGuideProfile> {
    return this.http.post<IGuideProfile>(this.baseUrl, dto);
  }

  /**
   * Actualiza los datos profesionales de un guía (rol administrador).
   * @param id UUID del guía.
   * @param dto Datos a actualizar.
   * @returns Observable con el guía actualizado.
   */
  updateGuide(id: string, dto: UpdateGuideDto): Observable<IGuideProfile> {
    return this.http.put<IGuideProfile>(`${this.baseUrl}/${id}`, dto);
  }

  /**
   * Elimina un guía del sistema (rol administrador).
   * @param id UUID del guía a eliminar.
   * @returns Observable con confirmación de eliminación.
   */
  deleteGuide(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
