/**
 * @sdd
 * [Objetivo]: Contratos, interfaces y tipos compartidos para Autenticacion y RBAC (SDD-002-AUTH-RBAC).
 * [I/O]: Exporta enums UserRole, UserStatus, interfaces JwtPayload, LoginRequest, AuthResponse, IUser e IMenuItem.
 * [Edge Cases]: Tipado estricto sin any, definicion inmutable de roles para frontend y backend.
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 *
 */
export interface JwtPayload {
  /**
   *
   */
  sub: string;
  /**
   *
   */
  email: string;
  /**
   *
   */
  role: UserRole;
  /**
   *
   */
  fullName: string;
  /**
   *
   */
  iat?: number;
  /**
   *
   */
  exp?: number;
}

/**
 *
 */
export interface LoginRequest {
  /**
   *
   */
  email: string;
  /**
   *
   */
  password: string;
}

/**
 * Resumen de ruta asignada para un usuario.
 */
export interface IAssignedRouteSummary {
  /**
   * Identificador UUID de la ruta.
   */
  id: string;
  /**
   * Nombre del sendero o recorrido.
   */
  name: string;
}

/**
 *
 */
export interface IUser {
  /**
   *
   */
  id: string;
  /**
   *
   */
  email: string;
  /**
   *
   */
  fullName: string;
  /**
   *
   */
  role: UserRole;
  /**
   *
   */
  status: UserStatus;
  /**
   *
   */
  phone?: string | null;
  /**
   *
   */
  avatarUrl?: string | null;
  /**
   * Identificador UUID de la ruta turística asignada al usuario.
   */
  routeId?: string | null;
  /**
   * Resumen de la ruta turística asignada.
   */
  route?: IAssignedRouteSummary | null;
  /**
   *
   */
  createdAt?: string | Date;
  /**
   *
   */
  updatedAt?: string | Date;
}

/**
 *
 */
export interface AuthResponse {
  /**
   * Token de acceso JWT de corta duracion (Bearer).
   */
  accessToken: string;
  /**
   * Token de renovacion de larga duracion (Silent Refresh).
   */
  refreshToken?: string;
  /**
   * Datos del usuario autenticado.
   */
  user: IUser;
}

/**
 * Payload para solicitud de renovacion de credenciales JWT.
 */
export interface RefreshTokenRequest {
  /**
   * Token de renovacion JWT activo.
   */
  refreshToken: string;
}

/**
 *
 */
export interface IMenuItem {
  /**
   *
   */
  title: string;
  /**
   *
   */
  url: string;
  /**
   *
   */
  icon: string;
  /**
   *
   */
  roles: UserRole[];
}
