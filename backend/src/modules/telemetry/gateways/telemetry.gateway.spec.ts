/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para TelemetryGateway validando enriquecimiento de alertas SOS y difusión a guías (SDD-003).
 * [I/O]: Mocks de JwtService, ConfigService, TelemetryService, AdminAlertsService, Repository<Route> y Server de Socket.io.
 * [Edge Cases]: Verificación de sanitización de mensajes SOS y extracción segura de correos de guías activos.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelemetryGateway } from './telemetry.gateway.js';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { TelemetryService } from '../telemetry.service.js';
import type { AdminAlertsService } from '../../admin/services/admin-alerts.service.js';
import type { Repository } from 'typeorm';
import type { Route } from '../../routes/entities/route.entity.js';
import type { Server, Socket } from 'socket.io';
import type { Guide } from '../../guides/entities/guide.entity.js';

describe('TelemetryGateway', () => {
  let gateway: TelemetryGateway;
  let mockJwtService: Partial<JwtService>;
  let mockConfigService: Partial<ConfigService>;
  let mockTelemetryService: Partial<TelemetryService>;
  let mockAdminAlertsService: Partial<AdminAlertsService>;
  let mockRouteRepo: Partial<Repository<Route>>;
  let mockServer: Partial<Server>;

  beforeEach(() => {
    mockJwtService = {
      verify: vi.fn(),
    };
    mockConfigService = {
      get: vi.fn(),
    };
    mockTelemetryService = {
      getLiveSnapshot: vi.fn(),
      processLocationUpdate: vi.fn(),
    };
    mockAdminAlertsService = {
      createAlertFromTrigger: vi.fn().mockResolvedValue({ id: 'alert-db-uuid-1' }),
    };
    mockRouteRepo = {
      findOne: vi.fn(),
    };
    mockServer = {
      emit: vi.fn(),
    };

    gateway = new TelemetryGateway(
      mockJwtService as JwtService,
      mockConfigService as ConfigService,
      mockTelemetryService as TelemetryService,
      mockAdminAlertsService as AdminAlertsService,
      mockRouteRepo as Repository<Route>,
    );

    gateway.server = mockServer as Server;
  });

  it('debe emitir attendance_confirmed_broadcast correctamente a través del servidor Socket.io', () => {
    const payload = {
      routeId: 'route-active-1',
      routeName: 'Sendero La Judía',
      userId: 'user-hiker-1',
      userFullName: 'María López',
      timestamp: 1700000000000,
      assignedGuideEmails: ['guia@garroteros.com'],
      assignedGuideUserIds: ['user-guide-99'],
    };

    gateway.broadcastAttendanceConfirmed(payload);

    expect(mockServer.emit).toHaveBeenCalledWith('attendance_confirmed_broadcast', payload);
  });

  it('debe procesar alerta SOS, incluir guías asignados de la ruta activa y difundir por sos_broadcast', async () => {
    const mockGuides = [
      { id: 'g-1', email: 'julio@garroterosapp.com', userId: 'user-julio' } as Guide,
      { id: 'g-2', email: 'mayerly@garroterosapp.com', userId: 'user-mayerly' } as Guide,
    ];

    const mockActiveRoute = {
      id: 'route-active-1',
      name: 'Ruta Garroteros',
      isActive: true,
      guides: mockGuides,
    } as Route;

    vi.mocked(mockRouteRepo.findOne!).mockResolvedValue(mockActiveRoute);

    const mockSocket = {
      data: {
        user: {
          sub: 'hiker-user-uuid',
          email: 'hiker@test.com',
          role: 'USER',
          fullName: 'Pedro Excursionista',
        },
      },
      broadcast: {
        emit: vi.fn(),
      },
    } as unknown as Socket;

    const sosTriggerDto = {
      latitude: 7.05,
      longitude: -73.05,
      batteryLevel: 80,
      message: '¡Caída con lesión en tobillo!',
      timestamp: 1700000000000,
    };

    await gateway.handleSosTrigger(mockSocket, sosTriggerDto);

    expect(mockAdminAlertsService.createAlertFromTrigger).toHaveBeenCalledWith({
      userId: 'hiker-user-uuid',
      fullName: 'Pedro Excursionista',
      latitude: 7.05,
      longitude: -73.05,
      batteryLevel: 80,
      message: '¡Caída con lesión en tobillo!',
      timestamp: 1700000000000,
    });

    expect(mockServer.emit).toHaveBeenCalledWith('sos_broadcast', {
      userId: 'hiker-user-uuid',
      fullName: 'Pedro Excursionista',
      role: 'USER',
      latitude: 7.05,
      longitude: -73.05,
      batteryLevel: 80,
      isSos: true,
      sosMessage: '¡Caída con lesión en tobillo!',
      timestamp: 1700000000000,
      id: 'alert-db-uuid-1',
      message: '¡Caída con lesión en tobillo!',
      assignedGuideEmails: ['julio@garroterosapp.com', 'mayerly@garroterosapp.com'],
      assignedGuideUserIds: ['user-julio', 'user-mayerly'],
    });
  });

  it('debe difundir broadcastSosAlert enriqueciendo el payload con guías asignados a la ruta', async () => {
    const mockGuides = [
      { id: 'g-3', email: 'daniel@garroterosapp.com', userId: 'user-daniel' } as Guide,
    ];

    const mockActiveRoute = {
      id: 'route-active-2',
      name: 'Ruta Piedecuesta Alta',
      isActive: true,
      guides: mockGuides,
    } as Route;

    vi.mocked(mockRouteRepo.findOne!).mockResolvedValue(mockActiveRoute);

    const payload = {
      userId: 'user-sender-1',
      fullName: 'Carlos Hiker',
      role: 'USER',
      latitude: 6.99,
      longitude: -73.04,
      isSos: true,
      sosMessage: 'Ayuda inmediata',
      timestamp: 1700000000000,
    };

    await gateway.broadcastSosAlert(payload, 'alert-test-id-99', 'Ayuda inmediata');

    expect(mockServer.emit).toHaveBeenCalledWith('sos_broadcast', {
      ...payload,
      id: 'alert-test-id-99',
      message: 'Ayuda inmediata',
      assignedGuideEmails: ['daniel@garroterosapp.com'],
      assignedGuideUserIds: ['user-daniel'],
    });
  });
});
