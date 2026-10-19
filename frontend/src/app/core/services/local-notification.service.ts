/**
 * @sdd
 * [Objetivo]: Servicio singleton para gestión de notificaciones push locales nativas y filtrado de alertas para guías (SDD-003 & SDD-005).
 * [I/O]: Inyecta SocketService, AuthService y Router. Expone método init() y emisión de alertas SOS y asistencia confirmada.
 * [Edge Cases]: Filtrado estricto para notificar únicamente a los guías de la ruta activa o administradores; fallback resiliente en web/PWA.
 */

// frontend/src/app/core/services/local-notification.service.ts

import { Injectable, inject, InjectionToken } from '@angular/core';
import { Router } from '@angular/router';
import { LocalNotifications, ActionPerformed } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { SocketService } from './socket.service';
import { AuthService } from './auth.service';
import { AppLogger } from '../utils/logger';
import type { SosAlertPayload, AttendanceConfirmedBroadcastPayload } from '../../../../../shared/src/index';

export const EMERGENCY_CHANNEL_ID = 'emergency_channel';
export const ATTENDANCE_CHANNEL_ID = 'attendance_channel';

/**
 * Token de inyección para el plugin LocalNotifications de Capacitor.
 */
export const LOCAL_NOTIFICATIONS_TOKEN = new InjectionToken<typeof LocalNotifications>(
  'LOCAL_NOTIFICATIONS_TOKEN',
  {
    providedIn: 'root',
    factory: () => LocalNotifications,
  },
);

/**
 * Servicio encargado de inicializar canales nativos y despachar notificaciones locales prioritarias.
 */
@Injectable({
  providedIn: 'root',
})
export class LocalNotificationService {
  private readonly socketService = inject(SocketService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly localNotifications = inject(LOCAL_NOTIFICATIONS_TOKEN);

  private isInitialized = false;
  private readonly notifiedSosAlertIds = new Set<string>();

  /**
   * Inicializa canales de notificación Android y registra la escucha de eventos WebSocket.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    await this.setupChannelsAndPermissions();
    this.setupSocketListeners();
    this.setupNotificationActionListeners();
  }

  /**
   * Configura los permisos y canales de notificación en dispositivos Android.
   */
  private async setupChannelsAndPermissions(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        const permissionStatus = await this.localNotifications.checkPermissions();
        if (permissionStatus.display !== 'granted') {
          await this.localNotifications.requestPermissions();
        }

        // Crear canal de emergencia con máxima prioridad y vibración
        await this.localNotifications.createChannel({
          id: EMERGENCY_CHANNEL_ID,
          name: 'Alertas SOS y Emergencias',
          description: 'Canal prioritario con sonido y vibración máxima para emergencias en ruta',
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: '#FF0000',
        });

        // Crear canal para confirmación de asistencia de excursionistas
        await this.localNotifications.createChannel({
          id: ATTENDANCE_CHANNEL_ID,
          name: 'Registro de Excursionistas',
          description: 'Notificaciones cuando excursionistas confirman su asistencia a la ruta activa',
          importance: 4,
          visibility: 1,
          vibration: true,
        });

        AppLogger.log('[LocalNotifications] Canales nativos configurados exitosamente.');
      }
    } catch (error) {
      AppLogger.warn('[LocalNotifications] Fallo al configurar canales nativos:', (error as Error).message);
    }
  }

  /**
   * Registra los escuchadores de WebSocket para alertas SOS y confirmaciones de asistencia.
   */
  private setupSocketListeners(): void {
    // Escucha de alertas SOS de emergencia
    this.socketService.on<SosAlertPayload>('sos_broadcast', async (alertPayload) => {
      // Deduplicación en cliente: evitar despachar múltiples notificaciones push locales por el mismo incidente
      const alertId = alertPayload.id || `${alertPayload.userId}_${alertPayload.timestamp}`;
      if (this.notifiedSosAlertIds.has(alertId)) {
        return;
      }
      this.notifiedSosAlertIds.add(alertId);

      // Limitar el tamaño del Set para prevenir fugas de memoria
      if (this.notifiedSosAlertIds.size > 100) {
        const oldestEntry = this.notifiedSosAlertIds.values().next().value;
        if (oldestEntry) {
          this.notifiedSosAlertIds.delete(oldestEntry);
        }
      }

      if (!this.shouldUserReceiveGuideAlert(alertPayload.assignedGuideEmails, alertPayload.assignedGuideUserIds)) {
        return;
      }

      await this.scheduleEmergencySosNotification(alertPayload);
    });

    // Escucha de nuevas confirmaciones de asistencia a la ruta activa
    this.socketService.on<AttendanceConfirmedBroadcastPayload>(
      'attendance_confirmed_broadcast',
      async (attendancePayload) => {
        if (!this.shouldUserReceiveGuideAlert(attendancePayload.assignedGuideEmails, attendancePayload.assignedGuideUserIds)) {
          return;
        }

        await this.scheduleAttendanceNotification(attendancePayload);
      },
    );
  }

  /**
   * Determina si el usuario autenticado actual debe recibir la notificación dirigida a guías de la ruta activa.
   * @param assignedGuideEmails Lista de correos de guías asignados a la ruta activa.
   * @param assignedGuideUserIds Lista opcional de identificadores UUID de guías asignados.
   * @returns true si el usuario es guía de la ruta activa o administrador.
   */
  public shouldUserReceiveGuideAlert(
    assignedGuideEmails?: string[],
    assignedGuideUserIds?: string[],
  ): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      return false;
    }

    // Administradores y coordinadores generales siempre reciben las alertas
    if (this.authService.isAdmin()) {
      return true;
    }

    const currentEmail = currentUser.email.toLowerCase().trim();
    if (assignedGuideEmails && assignedGuideEmails.some((email) => email.toLowerCase().trim() === currentEmail)) {
      return true;
    }

    if (assignedGuideUserIds && assignedGuideUserIds.includes(currentUser.id)) {
      return true;
    }

    return false;
  }

  /**
   * Programa y despacha una notificación nativa local de emergencia SOS.
   * @param alertPayload Datos de la alerta emitida por el excursionista.
   */
  public async scheduleEmergencySosNotification(alertPayload: SosAlertPayload): Promise<void> {
    const notificationId = Math.floor(Math.random() * 800000) + 100000;
    const notificationTitle = '🚨 ¡ALERTA SOS EN RUTA!';
    const notificationBody = `${alertPayload.fullName} solicita auxilio: ${alertPayload.message}`;

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      // Sin vibración táctil
    }

    try {
      await this.localNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: notificationTitle,
            body: notificationBody,
            channelId: EMERGENCY_CHANNEL_ID,
            smallIcon: 'ic_launcher_round',
            extra: {
              type: 'SOS',
              userId: alertPayload.userId,
              latitude: alertPayload.latitude,
              longitude: alertPayload.longitude,
            },
          },
        ],
      });
      AppLogger.log(`[LocalNotifications] Notificación SOS programada: ID ${notificationId}`);
    } catch (error) {
      AppLogger.warn('[LocalNotifications] Fallback de notificación SOS en navegador:', (error as Error).message);
      this.displayWebNotificationFallback(notificationTitle, notificationBody);
    }
  }

  /**
   * Programa y despacha una notificación local al registrarse un excursionista en la ruta activa.
   * @param attendancePayload Datos de confirmación de asistencia y ruta activa.
   */
  public async scheduleAttendanceNotification(
    attendancePayload: AttendanceConfirmedBroadcastPayload,
  ): Promise<void> {
    const notificationId = Math.floor(Math.random() * 800000) + 100000;
    const notificationTitle = '🎒 Nuevo Excursionista Confirmado';
    const notificationBody = `${attendancePayload.userFullName} confirmó asistencia en "${attendancePayload.routeName}"`;

    try {
      await this.localNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: notificationTitle,
            body: notificationBody,
            channelId: ATTENDANCE_CHANNEL_ID,
            smallIcon: 'ic_launcher_round',
            extra: {
              type: 'ATTENDANCE',
              routeId: attendancePayload.routeId,
              userId: attendancePayload.userId,
            },
          },
        ],
      });
      AppLogger.log(`[LocalNotifications] Notificación de asistencia programada: ID ${notificationId}`);
    } catch (error) {
      AppLogger.warn('[LocalNotifications] Fallback de notificación de asistencia en navegador:', (error as Error).message);
      this.displayWebNotificationFallback(notificationTitle, notificationBody);
    }
  }

  /**
   * Registra el manejador de clics en las notificaciones para navegar a la pantalla correspondiente.
   */
  private setupNotificationActionListeners(): void {
    try {
      void this.localNotifications.addListener(
        'localNotificationActionPerformed',
        (actionEvent: ActionPerformed) => {
          const extraData = actionEvent.notification.extra as { type?: string } | undefined;
          if (extraData?.type === 'SOS') {
            void this.router.navigate(['/admin/alerts']);
          } else if (extraData?.type === 'ATTENDANCE') {
            void this.router.navigate(['/admin/users']);
          }
        },
      );
    } catch {
      // Entorno no nativo
    }
  }

  /**
   * Fallback visual con Web Notification API si se ejecuta en navegador de escritorio.
   * @param title Título de la notificación.
   * @param body Contenido del mensaje.
   */
  private displayWebNotificationFallback(title: string, body: string): void {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch {
        // Ignorar si el navegador bloquea la creación de notificaciones
      }
    }
  }
}
