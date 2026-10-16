/**
 * @sdd
 * [Objetivo]: Servicio de comunicacion REST para waypoints, trazado oficial y clima en vivo (SDD-004-MAP-MULTIMEDIA-WEATHER).
 * [I/O]: Consume endpoints /api/v1/routes/*. Expone senales reactivas con cache en memoria (waypoints, routePath, weather).
 * [Edge Cases]: Manejo resiliente de errores HTTP, tipos estrictos sin 'any', conversion automatica a senales.
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  PoiDto,
  RoutePathDto,
  WeatherReportDto,
  RouteEntityDto,
  CreateRouteDto,
  UpdateRouteDto,
  IRouteLogEntry,
} from '../../../../../shared/src/index';

/**
 * Servicio encargado de gestionar los datos cartograficos y meteorologicos del recorrido en el cliente.
 */
@Injectable({
  providedIn: 'root',
})
export class RoutesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl || 'http://localhost:3000/api/v1'}/routes`;

  public waypoints = signal<PoiDto[]>([]);
  public routePath = signal<RoutePathDto | null>(null);
  public weather = signal<WeatherReportDto | null>(null);
  public itinerary = signal<IRouteLogEntry[]>([]);
  public isLoading = signal<boolean>(false);

  /**
   * Carga la lista de Puntos de Interes de la ruta desde el backend o cache, opcionalmente filtrada por routeId.
   * @param routeId Identificador UUID opcional de la ruta.
   * @param forceRefresh Indica si se debe omitir la cache en memoria.
   * @returns Observable con la lista de POIs.
   */
  public getWaypoints(routeId?: string, forceRefresh = false): Observable<PoiDto[]> {
    if (!forceRefresh && !routeId && this.waypoints().length > 0) {
      return of(this.waypoints());
    }

    this.isLoading.set(true);
    let params = new HttpParams();
    if (routeId) params = params.set('routeId', routeId);

    return this.http.get<PoiDto[]>(`${this.apiUrl}/waypoints`, { params }).pipe(
      tap((data) => {
        if (!routeId) {
          this.waypoints.set(data);
        }
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of([]);
      }),
    );
  }

  /**
   * Carga la polilinea oficial del recorrido en formato GeoJSON.
   * @param forceRefresh Indica si se debe omitir la cache en memoria.
   */
  public getRoutePath(forceRefresh = false): Observable<RoutePathDto | null> {
    if (!forceRefresh && this.routePath()) {
      return of(this.routePath());
    }

    return this.http.get<RoutePathDto>(`${this.apiUrl}/path`).pipe(
      tap((data) => this.routePath.set(data)),
      catchError((error) => of(null)),
    );
  }

  /**
   * Carga el reporte del clima en tiempo real y pronostico por horas.
   * @param forceRefresh Indica si se debe omitir la cache en memoria.
   */
  public getWeather(forceRefresh = false): Observable<WeatherReportDto | null> {
    if (!forceRefresh && this.weather()) {
      return of(this.weather());
    }

    return this.http.get<WeatherReportDto>(`${this.apiUrl}/weather`).pipe(
      tap((data) => this.weather.set(data)),
      catchError((error) => of(null)),
    );
  }

  /**
   * Carga la secuencia cronológica de hitos del itinerario de la ruta activa desde el backend.
   * @param routeId UUID opcional de la ruta.
   * @param forceRefresh Indica si se debe omitir la caché en memoria.
   * @returns Observable con la lista de hitos.
   */
  public getItinerary(routeId?: string, forceRefresh = false): Observable<IRouteLogEntry[]> {
    if (!forceRefresh && !routeId && this.itinerary().length > 0) {
      return of(this.itinerary());
    }

    let params = new HttpParams();
    if (routeId) params = params.set('routeId', routeId);

    return this.http.get<IRouteLogEntry[]>(`${this.apiUrl}/itinerary`, { params }).pipe(
      tap((data) => {
        if (!routeId) this.itinerary.set(data);
      }),
      catchError(() => of([])),
    );
  }

  /**
   * Obtiene la colección completa de rutas turísticas registradas con sus guías oficiales asociados.
   * @returns Observable con la lista de rutas.
   */
  public getAllRoutes(): Observable<RouteEntityDto[]> {
    return this.http.get<RouteEntityDto[]>(this.apiUrl);
  }

  /**
   * Obtiene una ruta por su identificador UUID.
   * @param id UUID de la ruta.
   * @returns Observable con los detalles de la ruta.
   */
  public getRouteById(id: string): Observable<RouteEntityDto> {
    return this.http.get<RouteEntityDto>(`${this.apiUrl}/${id}`);
  }

  /**
   * Invalida y reinicia la caché en memoria de waypoints y trazado de ruta.
   */
  public clearCache(): void {
    this.waypoints.set([]);
    this.routePath.set(null);
  }

  /**
   * Crea una nueva ruta turística con asignación de guías.
   * @param dto Payload con datos de la ruta y arreglo de IDs de guías.
   * @returns Observable con la ruta creada.
   */
  public createRoute(dto: CreateRouteDto): Observable<RouteEntityDto> {
    return this.http.post<RouteEntityDto>(this.apiUrl, dto).pipe(
      tap(() => this.clearCache()),
    );
  }

  /**
   * Actualiza los datos de una ruta y sincroniza sus guías asignados.
   * @param id UUID de la ruta a modificar.
   * @param dto Campos a actualizar.
   * @returns Observable con la ruta actualizada.
   */
  public updateRoute(id: string, dto: UpdateRouteDto): Observable<RouteEntityDto> {
    return this.http.put<RouteEntityDto>(`${this.apiUrl}/${id}`, dto).pipe(
      tap(() => this.clearCache()),
    );
  }

  /**
   * Elimina una ruta turística del sistema.
   * @param id UUID de la ruta a eliminar.
   * @returns Observable con la confirmación de eliminación.
   */
  public deleteRoute(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.clearCache()),
    );
  }

  /**
   * Establece una ruta como la ruta oficial activa de la aplicación.
   * @param id UUID de la ruta a activar.
   * @returns Observable con la ruta activada.
   */
  public setActiveRoute(id: string): Observable<RouteEntityDto> {
    return this.http.post<RouteEntityDto>(`${this.apiUrl}/${id}/activate`, {}).pipe(
      tap(() => this.clearCache()),
    );
  }
}
