/**
 * @sdd
 * [Objetivo]: Servicio frontend para interactuar con la API REST de ficha médica y registro de asistencia (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Consume HttpClient y environment.apiUrl. Expone métodos getMyProfile(), saveMyProfile(dto), getProfileByUserId(userId).
 * [Edge Cases]: Manejo de perfiles nulos o inexistentes, interoperabilidad tipada sin any.
 */

// frontend/src/app/core/services/medical.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, map, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

export enum DietType {
  REGULAR = 'REGULAR',
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  CELIAC = 'CELIAC',
  OTHER = 'OTHER',
}

export interface IMedicalProfile {
  id: string;
  userId: string;
  attendanceConfirmed: boolean;
  medicalConditions: string | null;
  allergies: string | null;
  medications: string | null;
  dietType: DietType;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bloodType?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SaveMedicalProfileDto {
  attendanceConfirmed: boolean;
  medicalConditions?: string | null;
  allergies?: string | null;
  medications?: string | null;
  dietType: DietType;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bloodType?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class MedicalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/medical-profile`;

  /**
   * Estado reactivo que almacena si el usuario confirmó asistencia en su ficha médica.
   */
  public readonly attendanceConfirmed = signal<boolean | null>(null);

  /**
   * Ficha médica completa en memoria.
   */
  public readonly profile = signal<IMedicalProfile | null>(null);

  /**
   * Obtiene la ficha médica del usuario actualmente autenticado.
   * @returns Observable con la ficha médica o null si aún no ha sido completada.
   */
  getMyProfile(): Observable<IMedicalProfile | null> {
    return this.http.get<IMedicalProfile | null>(this.baseUrl).pipe(
      tap((data) => {
        this.profile.set(data);
        this.attendanceConfirmed.set(data ? data.attendanceConfirmed : false);
      }),
      catchError(() => {
        this.attendanceConfirmed.set(false);
        return of(null);
      }),
    );
  }

  /**
   * Guarda o actualiza la ficha médica y confirmación de asistencia.
   * @param dto Datos médicos y de asistencia validados.
   * @returns Observable con la ficha médica persistida.
   */
  saveMyProfile(dto: SaveMedicalProfileDto): Observable<IMedicalProfile> {
    return this.http.post<IMedicalProfile>(this.baseUrl, dto).pipe(
      tap((data) => {
        this.profile.set(data);
        this.attendanceConfirmed.set(data.attendanceConfirmed);
      }),
    );
  }

  /**
   * Obtiene la ficha médica de un participante por su ID (exclusivo rol ADMIN/Guías).
   * @param userId UUID del usuario a consultar.
   * @returns Observable con la ficha médica del usuario.
   */
  getProfileByUserId(userId: string): Observable<IMedicalProfile> {
    return this.http.get<IMedicalProfile>(`${this.baseUrl}/${userId}`);
  }

  /**
   * Verifica si el usuario actual tiene confirmada su asistencia en su ficha médica.
   * Si ya se encuentra en cache en memoria, resuelve de inmediato sin golpear el backend.
   * @returns Observable con booleano indicando si la asistencia fue validada.
   */
  checkAttendance(): Observable<boolean> {
    const current = this.attendanceConfirmed();
    if (current !== null) {
      return of(current);
    }
    return this.getMyProfile().pipe(
      map((data) => (data ? data.attendanceConfirmed : false)),
      catchError(() => of(false)),
    );
  }
}
