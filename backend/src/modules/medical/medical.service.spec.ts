/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para MedicalService validando persistencia y difusión de confirmación de asistencia a guías (SDD-005).
 * [I/O]: Mocks de Repository<MedicalProfile>, Repository<Route> y TelemetryGateway.
 * [Edge Cases]: Verificación de omisión de notificación si no hay ruta activa o si attendanceConfirmed es false.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MedicalService } from './medical.service.js';
import { DietType } from './entities/medical-profile.entity.js';
import type { Repository } from 'typeorm';
import type { MedicalProfile } from './entities/medical-profile.entity.js';
import type { Route } from '../routes/entities/route.entity.js';
import type { User } from '../users/entities/user.entity.js';
import type { TelemetryGateway } from '../telemetry/gateways/telemetry.gateway.js';
import type { SaveMedicalProfileDto } from './dto/save-medical-profile.dto.js';
import type { Guide } from '../guides/entities/guide.entity.js';

describe('MedicalService', () => {
  let service: MedicalService;
  let mockProfileRepo: Partial<Repository<MedicalProfile>>;
  let mockRouteRepo: Partial<Repository<Route>>;
  let mockUserRepo: Partial<Repository<User>>;
  let mockTelemetryGateway: Partial<TelemetryGateway>;

  beforeEach(() => {
    mockProfileRepo = {
      findOne: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    };

    mockRouteRepo = {
      findOne: vi.fn(),
    };

    mockUserRepo = {
      findOne: vi.fn(),
    };

    mockTelemetryGateway = {
      broadcastAttendanceConfirmed: vi.fn(),
    };

    service = new MedicalService(
      mockProfileRepo as Repository<MedicalProfile>,
      mockRouteRepo as Repository<Route>,
      mockUserRepo as Repository<User>,
      mockTelemetryGateway as TelemetryGateway,
    );
  });

  it('debe obtener la ficha médica por userId correctamente', async () => {
    const mockProfile = {
      id: 'profile-uuid',
      userId: 'user-uuid-1',
      attendanceConfirmed: true,
      dietType: DietType.REGULAR,
    } as MedicalProfile;

    vi.mocked(mockProfileRepo.findOne!).mockResolvedValue(mockProfile);

    const result = await service.getProfileByUserId('user-uuid-1');

    expect(result).toEqual(mockProfile);
    expect(mockProfileRepo.findOne).toHaveBeenCalledWith({
      where: { userId: 'user-uuid-1' },
      relations: { route: true },
    });
  });

  it('debe guardar ficha médica y difundir a guías asignados si attendanceConfirmed es true', async () => {
    const dto: SaveMedicalProfileDto = {
      attendanceConfirmed: true,
      dietType: DietType.REGULAR,
      medicalConditions: 'Ninguna',
      allergies: 'Polen',
      emergencyContactName: 'Familiar',
      emergencyContactPhone: '+573001234567',
    };

    const savedProfile = {
      id: 'profile-1',
      userId: 'user-1',
      ...dto,
    } as MedicalProfile;

    const mockGuides = [
      { id: 'guide-1', email: 'guia1@garroteros.com', userId: 'user-guide-1' } as Guide,
      { id: 'guide-2', email: 'guia2@garroteros.com', userId: null } as Guide,
    ];

    const mockActiveRoute = {
      id: 'route-active-1',
      name: 'Ruta de los Garroteros',
      isActive: true,
      guides: mockGuides,
    } as Route;

    vi.mocked(mockProfileRepo.findOne!)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(savedProfile);
    vi.mocked(mockProfileRepo.create!).mockReturnValue(savedProfile);
    vi.mocked(mockProfileRepo.save!).mockResolvedValue(savedProfile);
    vi.mocked(mockRouteRepo.findOne!).mockResolvedValue(mockActiveRoute);

    const result = await service.saveProfile('user-1', dto, 'Juan Pérez');

    expect(result).toEqual(savedProfile);
    expect(mockTelemetryGateway.broadcastAttendanceConfirmed).toHaveBeenCalledWith({
      routeId: 'route-active-1',
      routeName: 'Ruta de los Garroteros',
      userId: 'user-1',
      userFullName: 'Juan Pérez',
      timestamp: expect.any(Number),
      assignedGuideEmails: ['guia1@garroteros.com', 'guia2@garroteros.com'],
      assignedGuideUserIds: ['user-guide-1'],
    });
  });

  it('no debe emitir broadcast si attendanceConfirmed es false', async () => {
    const dto: SaveMedicalProfileDto = {
      attendanceConfirmed: false,
      dietType: DietType.VEGETARIAN,
    };

    const savedProfile = {
      id: 'profile-2',
      userId: 'user-2',
      ...dto,
    } as MedicalProfile;

    vi.mocked(mockProfileRepo.findOne!)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(savedProfile);
    vi.mocked(mockProfileRepo.create!).mockReturnValue(savedProfile);
    vi.mocked(mockProfileRepo.save!).mockResolvedValue(savedProfile);

    const result = await service.saveProfile('user-2', dto, 'Carlos Gómez');

    expect(result).toEqual(savedProfile);
    expect(mockTelemetryGateway.broadcastAttendanceConfirmed).not.toHaveBeenCalled();
    expect(mockRouteRepo.findOne).not.toHaveBeenCalled();
  });
});
