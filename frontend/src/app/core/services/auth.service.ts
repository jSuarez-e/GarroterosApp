/**
 * @sdd
 * [Objetivo]: Servicio de autenticacion reactivo con Angular Signals y persistencia local (SDD-002-AUTH-RBAC).
 * [I/O]: Expone senales currentUser, isAuthenticated, isAdmin; metodos login(credentials) y logout().
 * [Edge Cases]: Limpieza de storage ante token corrupto, inicializacion segura de estado reactivo.
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface IUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  phone?: string | null;
  avatarUrl?: string | null;
  routeId?: string | null;
  route?: {
    id: string;
    name: string;
  } | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: IUser;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenKey = 'guianza_access_token';
  private readonly refreshTokenKey = 'guianza_refresh_token';
  private readonly userKey = 'guianza_user';

  // Reactividad moderna basada en Signals
  public currentUser = signal<IUser | null>(null);
  public token = signal<string | null>(null);
  public refreshTokenSignal = signal<string | null>(null);

  public isAuthenticated = computed(() => !!this.currentUser());
  public isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);

  constructor() {
    this.restoreSession();
  }

  /**
   * Envia peticion de login al backend y almacena credenciales stateless.
   * @param credentials Email y contraseña validados.
   * @returns Observable con respuesta del backend.
   */
  public login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          this.persistSession(response.accessToken, response.refreshToken, response.user);
        }),
      );
  }

  /**
   * Solicita la renovacion silenciosa de credenciales mediante el refresh token.
   * @returns Observable con la respuesta conteniendo el nuevo access token.
   */
  public refreshToken(): Observable<AuthResponse> {
    const currentRefreshToken = this.refreshTokenSignal() || localStorage.getItem(this.refreshTokenKey);
    if (!currentRefreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, {
        refreshToken: currentRefreshToken,
      })
      .pipe(
        tap((response) => {
          this.persistSession(
            response.accessToken,
            response.refreshToken || currentRefreshToken,
            response.user || this.currentUser()!,
          );
        }),
        catchError((err) => {
          this.logout();
          return throwError(() => err);
        }),
      );
  }

  /**
   * Cierra la sesion activa limpiando estado reactivo y almacenamiento local.
   */
  public logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
    this.token.set(null);
    this.refreshTokenSignal.set(null);
    void this.router.navigate(['/login']);
  }

  /**
   * Actualiza el perfil del usuario autenticado consultando el backend.
   * @returns Observable con el perfil actualizado.
   */
  public refreshProfile(): Observable<IUser> {
    return this.http.get<IUser>(`${environment.apiUrl}/auth/profile`).pipe(
      tap((user) => {
        localStorage.setItem(this.userKey, JSON.stringify(user));
        this.currentUser.set(user);
      }),
    );
  }

  /**
   * Restaura la sesion guardada si existe en el almacenamiento local.
   */
  private restoreSession(): void {
    try {
      const savedToken = localStorage.getItem(this.tokenKey);
      const savedRefreshToken = localStorage.getItem(this.refreshTokenKey);
      const savedUserStr = localStorage.getItem(this.userKey);

      if (savedToken && savedUserStr) {
        const user = JSON.parse(savedUserStr) as IUser;
        this.token.set(savedToken);
        this.refreshTokenSignal.set(savedRefreshToken);
        this.currentUser.set(user);
      }
    } catch {
      this.logout();
    }
  }

  /**
   * Persiste la sesion en localStorage y actualiza las señales de estado.
   * @param token JWT emitido por el backend.
   * @param refreshToken Token de renovacion de larga duracion.
   * @param user Perfil del usuario autenticado.
   */
  private persistSession(token: string, refreshToken: string | undefined, user: IUser): void {
    localStorage.setItem(this.tokenKey, token);
    if (refreshToken) {
      localStorage.setItem(this.refreshTokenKey, refreshToken);
      this.refreshTokenSignal.set(refreshToken);
    }
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.token.set(token);
    this.currentUser.set(user);
  }
}
