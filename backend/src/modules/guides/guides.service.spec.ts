/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para GuidesService validando orquestación 1:1 con la cuenta User (SDD-005).
 * [I/O]: Mocks de Repository<Guide>, Repository<Route>, Repository<User>.
 * [Edge Cases]: Creación atómica de cuenta de acceso, sincronización de estado y vinculación automática al inicio.
 */

// backend/src/modules/guides/guides.service.spec.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GuidesService } from './guides.service.js';
import { Guide } from './entities/guide.entity.js';
import { Route } from '../routes/entities/route.entity.js';
import { User, UserRole, UserStatus } from '../users/entities/user.entity.js';
import type { Repository } from 'typeorm';

describe('GuidesService', () => {
  let service: GuidesService;
  let mockGuideRepo: Partial<Repository<Guide>>;
  let mockRouteRepo: Partial<Repository<Route>>;
  let mockUserRepo: Partial<Repository<User>>;

  const sampleRoute: Partial<Route> = {
    id: 'route-1',
    name: 'Ruta de los Garroteros',
  };

  const sampleUser: Partial<User> = {
    id: 'user-guide-1',
    email: 'carlos@guianza.com',
    fullName: 'Carlos Mendoza',
    role: UserRole.GUIDE,
    status: UserStatus.ACTIVE,
    phone: '+573001112233',
  };

  const sampleGuide: Partial<Guide> = {
    id: 'guide-1',
    fullName: 'Carlos Mendoza',
    email: 'carlos@guianza.com',
    phone: '+573001112233',
    status: 'ACTIVE',
    userId: 'user-guide-1',
    routes: [sampleRoute as Route],
  };

  beforeEach(() => {
    mockGuideRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
      findBy: vi.fn().mockResolvedValue([sampleRoute as Route]),
      create: vi.fn().mockImplementation((entityData) => ({ ...entityData, id: 'guide-1' } as Guide)),
      save: vi.fn().mockImplementation(async (entityData) => entityData as Guide),
      remove: vi.fn().mockResolvedValue(undefined as unknown as Guide),
      count: vi.fn().mockResolvedValue(3),
    };

    mockRouteRepo = {
      findOne: vi.fn().mockResolvedValue(sampleRoute as Route),
      find: vi.fn().mockResolvedValue([sampleRoute as Route]),
      findBy: vi.fn().mockResolvedValue([sampleRoute as Route]),
    };

    mockUserRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((userData) => ({ ...userData, id: 'user-guide-1' } as User)),
      save: vi.fn().mockImplementation(async (userData) => userData as User),
      remove: vi.fn().mockResolvedValue(undefined as unknown as User),
    };

    service = new GuidesService(
      mockGuideRepo as Repository<Guide>,
      mockRouteRepo as Repository<Route>,
      mockUserRepo as Repository<User>,
    );
  });

  it('debe crearse correctamente la instancia del servicio', () => {
    expect(service).toBeDefined();
  });

  it('debe crear un guía y generar automáticamente su cuenta User asociada con rol GUIDE', async () => {
    const created = await service.createGuide({
      fullName: 'Carlos Mendoza',
      email: 'carlos@guianza.com',
      phone: '+573001112233',
      initialPassword: 'PasswordSegura2026*',
      routeIds: ['route-1'],
    });

    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'carlos@guianza.com',
        role: UserRole.GUIDE,
        status: UserStatus.ACTIVE,
      }),
    );
    expect(mockUserRepo.save).toHaveBeenCalled();
    expect(mockGuideRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Carlos Mendoza',
        userId: 'user-guide-1',
      }),
    );
    expect(created.userId).toBe('user-guide-1');
  });

  it('debe actualizar un guía y sincronizar campos relevantes en su cuenta User asociada', async () => {
    mockGuideRepo.findOne = vi.fn().mockResolvedValue({
      ...sampleGuide,
      userId: 'user-guide-1',
    } as Guide);
    mockUserRepo.findOne = vi.fn().mockResolvedValue({
      ...sampleUser,
    } as User);

    await service.updateGuide('guide-1', {
      fullName: 'Carlos Mendoza Modificado',
      phone: '+573009998877',
      status: 'INACTIVE',
    });

    expect(mockUserRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Carlos Mendoza Modificado',
        phone: '+573009998877',
        status: UserStatus.INACTIVE,
      }),
    );
  });

  it('debe eliminar el guía y su cuenta de usuario vinculada con rol GUIDE', async () => {
    mockGuideRepo.findOne = vi.fn().mockResolvedValue({
      ...sampleGuide,
      userId: 'user-guide-1',
    } as Guide);
    mockUserRepo.findOne = vi.fn().mockResolvedValue({
      ...sampleUser,
      role: UserRole.GUIDE,
    } as User);

    await service.deleteGuide('guide-1');

    expect(mockUserRepo.remove).toHaveBeenCalled();
    expect(mockGuideRepo.remove).toHaveBeenCalled();
  });
});
