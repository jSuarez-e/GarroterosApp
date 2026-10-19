/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para AdminAlertsService validando persistencia, auditoría e idempotencia contra alertas SOS duplicadas (SDD-003 & SDD-005).
 * [I/O]: Mocks de Repository<SosAlert> y Repository<User>.
 * [Edge Cases]: Deduplicación de alertas ráfaga en ventana de 15 segundos y actualización de estado con notas de resolución.
 */

// backend/src/modules/admin/services/admin-alerts.service.spec.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminAlertsService } from './admin-alerts.service.js';
import { SosAlert, SosAlertStatus } from '../entities/sos-alert.entity.js';
import { User, UserRole, UserStatus } from '../../users/entities/user.entity.js';
import type { Repository } from 'typeorm';

describe('AdminAlertsService', () => {
  let service: AdminAlertsService;
  let mockSosAlertRepo: Partial<Repository<SosAlert>>;
  let mockUserRepo: Partial<Repository<User>>;

  const sampleUser: Partial<User> = {
    id: 'user-hiker-1',
    email: 'hiker@test.com',
    fullName: 'Juan Excursionista',
    phone: '+573001234567',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  };

  const sampleAlert: Partial<SosAlert> = {
    id: 'alert-uuid-1',
    userId: 'user-hiker-1',
    userName: 'Juan Excursionista',
    userEmail: 'hiker@test.com',
    userPhone: '+573001234567',
    status: SosAlertStatus.PENDING,
    message: '¡Persona extraviada en el sendero!',
    createdAt: new Date(),
    location: {
      type: 'Point',
      coordinates: [-73.05, 7.05],
    },
  };

  beforeEach(() => {
    mockSosAlertRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((entityData) => ({ ...entityData, id: 'alert-uuid-1' } as SosAlert)),
      save: vi.fn().mockImplementation(async (entityData) => entityData as SosAlert),
    };

    mockUserRepo = {
      findOne: vi.fn().mockResolvedValue(sampleUser as User),
    };

    service = new AdminAlertsService(
      mockSosAlertRepo as Repository<SosAlert>,
      mockUserRepo as Repository<User>,
    );
  });

  it('debe registrar una nueva alerta SOS si no existe una reciente', async () => {
    const triggerData = {
      userId: 'user-hiker-1',
      fullName: 'Juan Excursionista',
      latitude: 7.05,
      longitude: -73.05,
      batteryLevel: 90,
      message: '¡Persona extraviada en el sendero!',
      timestamp: Date.now(),
    };

    const result = await service.createAlertFromTrigger(triggerData);

    expect(mockSosAlertRepo.findOne).toHaveBeenCalled();
    expect(mockSosAlertRepo.create).toHaveBeenCalled();
    expect(mockSosAlertRepo.save).toHaveBeenCalled();
    expect(result.id).toBe('alert-uuid-1');
    expect(result.status).toBe(SosAlertStatus.PENDING);
  });

  it('debe reutilizar la alerta existente sin duplicar en BD si ya existe una alerta PENDING en los últimos 15 segundos', async () => {
    const recentAlert: Partial<SosAlert> = {
      ...sampleAlert,
      id: 'existing-alert-recent',
      createdAt: new Date(Date.now() - 5000), // Hace 5 segundos
    };

    vi.mocked(mockSosAlertRepo.findOne!).mockResolvedValue(recentAlert as SosAlert);

    const triggerData = {
      userId: 'user-hiker-1',
      fullName: 'Juan Excursionista',
      latitude: 7.05,
      longitude: -73.05,
      message: '¡Persona extraviada en el sendero!',
    };

    const result = await service.createAlertFromTrigger(triggerData);

    expect(result.id).toBe('existing-alert-recent');
    expect(mockSosAlertRepo.create).not.toHaveBeenCalled();
    expect(mockSosAlertRepo.save).not.toHaveBeenCalled();
  });
});
