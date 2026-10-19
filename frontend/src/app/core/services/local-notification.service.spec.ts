/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para LocalNotificationService validando el filtrado de guías y despacho de notificaciones (SDD-003 & SDD-005).
 * [I/O]: Mocks de SocketService, AuthService, Router y @capacitor/local-notifications.
 * [Edge Cases]: Validación de roles ADMIN vs Guía asignado vs Excursionista regular.
 */

// frontend/src/app/core/services/local-notification.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    createChannel: vi.fn().mockResolvedValue(undefined),
    schedule: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn(),
  },
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: {
    Heavy: 'HEAVY',
  },
}));

import {
  LocalNotificationService,
  LOCAL_NOTIFICATIONS_TOKEN,
  EMERGENCY_CHANNEL_ID,
  ATTENDANCE_CHANNEL_ID,
} from './local-notification.service';
import { SocketService } from './socket.service';
import { AuthService, UserRole, UserStatus } from './auth.service';

describe('LocalNotificationService', () => {
  let service: LocalNotificationService;
  let mockAuthService: {
    currentUser: ReturnType<typeof vi.fn>;
    isAdmin: ReturnType<typeof vi.fn>;
  };
  let mockSocketService: {
    on: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };
  let mockLocalNotifications: {
    checkPermissions: ReturnType<typeof vi.fn>;
    requestPermissions: ReturnType<typeof vi.fn>;
    createChannel: ReturnType<typeof vi.fn>;
    schedule: ReturnType<typeof vi.fn>;
    addListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockLocalNotifications = {
      checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
      requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
      createChannel: vi.fn().mockResolvedValue(undefined),
      schedule: vi.fn().mockResolvedValue(undefined),
      addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    };

    mockAuthService = {
      currentUser: vi.fn().mockReturnValue(null),
      isAdmin: vi.fn().mockReturnValue(false),
    };

    mockSocketService = {
      on: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        LocalNotificationService,
        { provide: LOCAL_NOTIFICATIONS_TOKEN, useValue: mockLocalNotifications },
        { provide: AuthService, useValue: mockAuthService },
        { provide: SocketService, useValue: mockSocketService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    service = TestBed.inject(LocalNotificationService);
  });

  it('debe crear el servicio correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('shouldUserReceiveGuideAlert', () => {
    it('debe retornar false si no hay usuario autenticado', () => {
      mockAuthService.currentUser.mockReturnValue(null);
      const result = service.shouldUserReceiveGuideAlert(['guia@garroteros.com']);
      expect(result).toBe(false);
    });

    it('debe retornar true si el usuario es ADMIN independientemente de la lista', () => {
      mockAuthService.currentUser.mockReturnValue({
        id: 'admin-id',
        email: 'admin@garroteros.com',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        fullName: 'Admin General',
      });
      mockAuthService.isAdmin.mockReturnValue(true);

      const result = service.shouldUserReceiveGuideAlert(['otro@garroteros.com']);
      expect(result).toBe(true);
    });

    it('debe retornar true si el email del usuario está en los guías asignados', () => {
      mockAuthService.currentUser.mockReturnValue({
        id: 'guide-id-1',
        email: 'julio@garroterosapp.com',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        fullName: 'Julio Guía',
      });
      mockAuthService.isAdmin.mockReturnValue(false);

      const result = service.shouldUserReceiveGuideAlert([
        'julio@garroterosapp.com',
        'mayerly@garroterosapp.com',
      ]);
      expect(result).toBe(true);
    });

    it('debe retornar false si el usuario es un excursionista no asignado', () => {
      mockAuthService.currentUser.mockReturnValue({
        id: 'hiker-id-99',
        email: 'hiker@gmail.com',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        fullName: 'Carlos Excursionista',
      });
      mockAuthService.isAdmin.mockReturnValue(false);

      const result = service.shouldUserReceiveGuideAlert([
        'julio@garroterosapp.com',
        'mayerly@garroterosapp.com',
      ]);
      expect(result).toBe(false);
    });
  });

  describe('scheduleEmergencySosNotification', () => {
    it('debe programar la notificación SOS en el canal de emergencia', async () => {
      const alertPayload = {
        userId: 'user-alert-1',
        fullName: 'Ana María',
        role: 'USER',
        latitude: 7.001,
        longitude: -73.001,
        message: '¡Auxilio, persona desmayada!',
        timestamp: 1700000000000,
      };

      await service.scheduleEmergencySosNotification(alertPayload);

      expect(mockLocalNotifications.schedule).toHaveBeenCalledWith({
        notifications: [
          expect.objectContaining({
            channelId: EMERGENCY_CHANNEL_ID,
            title: '🚨 ¡ALERTA SOS EN RUTA!',
            body: 'Ana María solicita auxilio: ¡Auxilio, persona desmayada!',
          }),
        ],
      });
    });
  });

  describe('scheduleAttendanceNotification', () => {
    it('debe programar la notificación de asistencia en el canal de registro', async () => {
      const attendancePayload = {
        routeId: 'route-active-10',
        routeName: 'Sendero Histórico',
        userId: 'hiker-uuid-55',
        userFullName: 'Pedro Pérez',
        timestamp: 1700000000000,
        assignedGuideEmails: ['guia@garroteros.com'],
      };

      await service.scheduleAttendanceNotification(attendancePayload);

      expect(mockLocalNotifications.schedule).toHaveBeenCalledWith({
        notifications: [
          expect.objectContaining({
            channelId: ATTENDANCE_CHANNEL_ID,
            title: '🎒 Nuevo Excursionista Confirmado',
            body: 'Pedro Pérez confirmó asistencia en "Sendero Histórico"',
          }),
        ],
      });
    });
  });

  describe('Deduplicación de alertas SOS recibidas por WebSocket', () => {
    it('debe despachar únicamente una notificación si llegan eventos duplicados con el mismo ID', async () => {
      let sosBroadcastHandler: ((payload: unknown) => Promise<void>) | undefined;
      mockSocketService.on.mockImplementation((event: string, handler: (payload: unknown) => Promise<void>) => {
        if (event === 'sos_broadcast') {
          sosBroadcastHandler = handler;
        }
      });

      mockAuthService.isAdmin.mockReturnValue(true);
      mockAuthService.currentUser.mockReturnValue({
        id: 'admin-id',
        email: 'admin@garroteros.com',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        fullName: 'Admin General',
      });

      await service.init();
      expect(sosBroadcastHandler).toBeDefined();

      const alertPayload = {
        id: 'alert-unique-dedup-1',
        userId: 'user-alert-99',
        fullName: 'Carlos Hiker',
        role: 'USER',
        latitude: 7.05,
        longitude: -73.05,
        message: '¡Emergencia en sendero!',
        timestamp: 1700000000000,
      };

      // Disparar dos veces el mismo evento
      await sosBroadcastHandler!(alertPayload);
      await sosBroadcastHandler!(alertPayload);

      // Debe haberse llamado a LocalNotifications.schedule exactamente 1 vez
      expect(mockLocalNotifications.schedule).toHaveBeenCalledTimes(1);
    });
  });
});
