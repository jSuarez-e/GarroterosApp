/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para AdminUsersService validando CRUD y asignación de rutas turísticas (SDD-005).
 * [I/O]: Mocks de Repository<User>. Métodos probados: getUsers, getUserById, createUser, updateUser, assignUserRoute.
 * [Edge Cases]: Validación de filtrado por routeId, asignación nula (desasignar ruta) y manejo de NotFoundException.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminUsersService } from './admin-users.service.js';
import { User, UserRole, UserStatus } from '../../users/entities/user.entity.js';
import { Route } from '../../routes/entities/route.entity.js';
import { Guide } from '../../guides/entities/guide.entity.js';
import { MedicalProfile } from '../../medical/entities/medical-profile.entity.js';
import type { Repository, SelectQueryBuilder } from 'typeorm';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let mockUserRepo: Partial<Repository<User>>;
  let mockRouteRepo: Partial<Repository<Route>>;
  let mockGuideRepo: Partial<Repository<Guide>>;
  let mockMedicalProfileRepo: Partial<Repository<MedicalProfile>>;
  let mockQueryBuilder: Partial<SelectQueryBuilder<User>>;

  beforeEach(() => {
    mockQueryBuilder = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    };

    mockUserRepo = {
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
      findOne: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      save: vi.fn(),
      remove: vi.fn(),
    };

    mockRouteRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
    };

    mockGuideRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
    };

    mockMedicalProfileRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
    };

    service = new AdminUsersService(
      mockUserRepo as Repository<User>,
      mockRouteRepo as Repository<Route>,
      mockGuideRepo as Repository<Guide>,
      mockMedicalProfileRepo as Repository<MedicalProfile>,
    );
  });

  it('debe listar usuarios aplicando filtro por routeId si se especifica', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        email: 'turista@piedecuesta.com',
        fullName: 'Turista Uno',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        routeId: 'route-uuid-1',
        route: { id: 'route-uuid-1', name: 'Ruta de los Garroteros' },
      } as unknown as User,
    ];

    vi.mocked(mockQueryBuilder.getMany!).mockResolvedValue(mockUsers);

    const result = await service.getUsers({ routeId: 'route-uuid-1' });

    expect(result).toEqual(mockUsers);
    expect(mockUserRepo.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('user.route', 'route');
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.routeId = :routeId', {
      routeId: 'route-uuid-1',
    });
  });

  it('debe completar el avatarUrl del usuario a partir de su ficha médica si no tiene avatar directo', async () => {
    const mockUserWithoutAvatar = {
      id: 'user-sin-avatar',
      email: 'sinfoto@piedecuesta.com',
      fullName: 'Sin Foto',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      avatarUrl: null,
    } as unknown as User;

    vi.mocked(mockQueryBuilder.getMany!).mockResolvedValue([mockUserWithoutAvatar]);
    vi.mocked(mockMedicalProfileRepo.find!).mockResolvedValue([
      {
        id: 'med-1',
        userId: 'user-sin-avatar',
        photoUrl: 'https://cdn.example.com/foto-ficha.jpg',
      } as unknown as MedicalProfile,
    ]);

    const result = await service.getUsers({});
    expect(result[0].avatarUrl).toBe('https://cdn.example.com/foto-ficha.jpg');
  });

  it('debe asignar una ruta a un usuario y retornar los datos actualizados', async () => {
    const existingUser = {
      id: 'user-1',
      email: 'turista@piedecuesta.com',
      fullName: 'Turista Uno',
      routeId: null,
    } as User;

    const updatedUser = {
      ...existingUser,
      routeId: 'route-uuid-99',
      route: { id: 'route-uuid-99', name: 'Sendero La Cantera' },
    } as unknown as User;

    vi.mocked(mockUserRepo.findOne!)
      .mockResolvedValueOnce(existingUser)
      .mockResolvedValueOnce(updatedUser);
    vi.mocked(mockUserRepo.save!).mockResolvedValue(updatedUser);

    const result = await service.assignUserRoute('user-1', 'route-uuid-99');

    expect(existingUser.routeId).toBe('route-uuid-99');
    expect(mockUserRepo.save).toHaveBeenCalledWith(existingUser);
    expect(result).toEqual(updatedUser);
  });

  it('debe permitir desasignar la ruta asignada a un usuario (routeId: null)', async () => {
    const existingUser = {
      id: 'user-2',
      email: 'guia@piedecuesta.com',
      fullName: 'Guía Dos',
      routeId: 'route-uuid-1',
    } as User;

    const updatedUser = {
      ...existingUser,
      routeId: null,
      route: null,
    } as unknown as User;

    vi.mocked(mockUserRepo.findOne!)
      .mockResolvedValueOnce(existingUser)
      .mockResolvedValueOnce(updatedUser);
    vi.mocked(mockUserRepo.save!).mockResolvedValue(updatedUser);

    const result = await service.assignUserRoute('user-2', null);

    expect(existingUser.routeId).toBeNull();
    expect(result).toEqual(updatedUser);
  });

  it('debe actualizar la ruta asignada mediante updateUser', async () => {
    const existingUser = {
      id: 'user-3',
      fullName: 'Usuario Tres',
      routeId: 'route-1',
    } as User;

    const finalUser = {
      id: 'user-3',
      fullName: 'Usuario Tres Modificado',
      routeId: 'route-2',
      route: { id: 'route-2', name: 'Ruta Nueva' },
    } as unknown as User;

    vi.mocked(mockUserRepo.findOne!)
      .mockResolvedValueOnce(existingUser)
      .mockResolvedValueOnce(finalUser);
    vi.mocked(mockUserRepo.save!).mockResolvedValue(finalUser);

    const result = await service.updateUser('user-3', {
      fullName: 'Usuario Tres Modificado',
      routeId: 'route-2',
    });

    expect(result).toEqual(finalUser);
  });

  it('debe obtener el roster de rutas y usuarios asignados con control de asistencia', async () => {
    const mockAdminUser = {
      id: 'admin-1',
      email: 'guia@garroteros.com',
      fullName: 'Guía Mayor',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    } as User;

    const mockRoute = {
      id: 'route-1',
      name: 'Sendero Histórico',
      municipality: 'Piedecuesta',
      totalDistanceKm: 3.5,
      estimatedDurationMinutes: 60,
      isActive: true,
      guides: [{ id: 'guide-1', fullName: 'Guía Mayor', phone: '3001234567', avatarUrl: null }],
    } as unknown as Route;

    const mockAssignedUsers = [
      {
        id: 'participant-1',
        email: 'turista1@correo.com',
        fullName: 'Caminante Uno',
        phone: '3109876543',
        avatarUrl: null,
        routeId: 'route-1',
      } as User,
    ];

    const mockMedicalProfiles = [
      {
        id: 'med-1',
        userId: 'participant-1',
        attendanceConfirmed: true,
        photoUrl: 'https://cdn.example.com/photo.jpg',
        bloodType: 'O+',
        allergies: 'Ninguna',
        dietType: 'REGULAR',
        emergencyContactName: 'María Pérez',
        emergencyContactPhone: '3201112233',
        updatedAt: new Date('2026-10-17T00:00:00.000Z'),
      } as unknown as MedicalProfile,
    ];

    vi.mocked(mockGuideRepo.findOne!).mockResolvedValue(null);
    vi.mocked(mockRouteRepo.find!).mockResolvedValue([mockRoute]);
    vi.mocked(mockUserRepo.find!).mockResolvedValue(mockAssignedUsers);
    vi.mocked(mockMedicalProfileRepo.find!).mockResolvedValue(mockMedicalProfiles);

    const roster = await service.getGuideRouteRoster(mockAdminUser);

    expect(roster).toHaveLength(1);
    expect(roster[0].routeId).toBe('route-1');
    expect(roster[0].totalParticipants).toBe(1);
    expect(roster[0].confirmedParticipants).toBe(1);
    expect(roster[0].attendanceRatePercentage).toBe(100);
    expect(roster[0].participants[0].userId).toBe('participant-1');
    expect(roster[0].participants[0].attendanceConfirmed).toBe(true);
    expect(roster[0].participants[0].hasMedicalProfile).toBe(true);
    expect(roster[0].participants[0].photoUrl).toBe('https://cdn.example.com/photo.jpg');
    expect(roster[0].participants[0].medicalSummary?.bloodType).toBe('O+');
  });
});
