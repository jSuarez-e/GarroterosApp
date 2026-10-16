/**
 * @sdd
 * [Objetivo]: Servicio frontend de diagnóstico y gestión de permisos nativos del dispositivo (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Expone señales reactivas gpsStatus, notificationStatus, networkStatus y métodos de solicitud de permisos.
 * [Edge Cases]: Fallback resiliente en navegadores sin soporte o modo PWA, detección automática de eventos online/offline.
 */

// frontend/src/app/core/services/permissions.service.ts

import { Injectable, signal } from '@angular/core';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';
export type NetworkState = 'online' | 'offline';

@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  public readonly gpsStatus = signal<PermissionState>('unknown');
  public readonly notificationStatus = signal<PermissionState>('unknown');
  public readonly networkStatus = signal<NetworkState>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
  );

  constructor() {
    this.initNetworkListeners();
    this.checkInitialPermissions();
  }

  /**
   * Consulta el estado inicial de permisos de geolocalización y notificaciones.
   */
  async checkInitialPermissions(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        const geoPermission = await navigator.permissions.query({ name: 'geolocation' });
        this.gpsStatus.set(geoPermission.state as PermissionState);
        geoPermission.onchange = () => {
          this.gpsStatus.set(geoPermission.state as PermissionState);
        };
      } catch {
        this.gpsStatus.set('unknown');
      }

      try {
        const notifPermission = await navigator.permissions.query({ name: 'notifications' });
        this.notificationStatus.set(notifPermission.state as PermissionState);
        notifPermission.onchange = () => {
          this.notificationStatus.set(notifPermission.state as PermissionState);
        };
      } catch {
        if (typeof Notification !== 'undefined') {
          this.notificationStatus.set(
            Notification.permission === 'default' ? 'prompt' : (Notification.permission as PermissionState),
          );
        }
      }
    }
  }

  /**
   * Solicita explícitamente el permiso de geolocalización GPS al usuario.
   * @returns Promesa con el estado resultante del permiso.
   */
  async requestGpsPermission(): Promise<PermissionState> {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      this.gpsStatus.set('denied');
      return 'denied';
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          this.gpsStatus.set('granted');
          resolve('granted');
        },
        () => {
          this.gpsStatus.set('denied');
          resolve('denied');
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });
  }

  /**
   * Solicita el permiso para envío de notificaciones push de emergencia y ruta.
   * @returns Promesa con el estado del permiso.
   */
  async requestNotificationPermission(): Promise<PermissionState> {
    if (typeof Notification === 'undefined') {
      this.notificationStatus.set('denied');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      const state = result === 'default' ? 'prompt' : (result as PermissionState);
      this.notificationStatus.set(state);
      return state;
    } catch {
      this.notificationStatus.set('denied');
      return 'denied';
    }
  }

  /**
   * Inicializa la escucha pasiva del estado de red del dispositivo.
   */
  private initNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.networkStatus.set('online'));
      window.addEventListener('offline', () => this.networkStatus.set('offline'));
    }
  }
}
