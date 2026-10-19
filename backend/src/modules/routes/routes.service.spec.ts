/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para RoutesService validando trazado de rutas, gestión de waypoints y campos de horario/fechas (startTime, startDate, endDate).
 * [I/O]: Repositorios mock de Waypoint, Route, Guide y RouteLogEntry.
 * [Edge Cases]: Rutas inexistentes, trazados vacíos, persistencia de fechas y horas programadas.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoutesService } from './routes.service.js';
import type { Repository } from 'typeorm';
import type { Waypoint } from './entities/waypoint.entity.js';
import type { Route } from './entities/route.entity.js';
import type { Guide } from '../guides/entities/guide.entity.js';
import type { RouteLogEntry } from '../admin/entities/route-log-entry.entity.js';
import type { CreateRouteDto, UpdateRouteDto } from './dto/create-route.dto.js';

describe('RoutesService', () => {
  let service: RoutesService;
  let mockWaypointRepo: Partial<Repository<Waypoint>>;
  let mockRouteRepo: Partial<Repository<Route>>;
  let mockGuideRepo: Partial<Repository<Guide>>;
  let mockLogRepo: Partial<Repository<RouteLogEntry>>;

  beforeEach(() => {
    mockWaypointRepo = {
      find: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn(),
      save: vi.fn(),
    };

    mockRouteRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockImplementation((entityData) => entityData as Route),
      save: vi.fn().mockImplementation((entityData) => Promise.resolve({ id: 'route-uuid-1', ...entityData } as Route)),
      update: vi.fn().mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] }),
      remove: vi.fn().mockResolvedValue({} as Route),
    };

    mockGuideRepo = {
      findBy: vi.fn().mockResolvedValue([]),
      find: vi.fn().mockResolvedValue([]),
    };

    mockLogRepo = {
      find: vi.fn().mockResolvedValue([]),
    };

    service = new RoutesService(
      mockWaypointRepo as Repository<Waypoint>,
      mockRouteRepo as Repository<Route>,
      mockGuideRepo as Repository<Guide>,
      mockLogRepo as Repository<RouteLogEntry>,
    );
  });

  describe('getRoutePath', () => {
    it('debe retornar fallback cuando no hay ruta activa ni coincidencia por routeId', async () => {
      mockRouteRepo.findOne = vi.fn().mockResolvedValue(null);

      const result = await service.getRoutePath();

      expect(result.id).toBe('');
      expect(result.name).toBe('Sin ruta activa');
      expect(result.startTime).toBeNull();
      expect(result.startDate).toBeNull();
      expect(result.endDate).toBeNull();
    });

    it('debe retornar la metadata y campos de fecha/hora de la ruta activa', async () => {
      const activeRoute: Partial<Route> = {
        id: 'active-route-id',
        name: 'Ruta Histórica de los Garroteros',
        municipality: 'Piedecuesta, Santander',
        description: 'Sendero colonial',
        totalDistanceKm: 2.5,
        estimatedDurationMinutes: 60,
        coordinates: [[-73.05, 6.98], [-73.04, 6.99]],
        isActive: true,
        startTime: '08:30 AM',
        startDate: '2026-10-19',
        endDate: '2026-10-19',
      };
      mockRouteRepo.findOne = vi.fn().mockResolvedValue(activeRoute);
      mockWaypointRepo.find = vi.fn().mockResolvedValue([
        {
          id: 'wp-1',
          location: { coordinates: [-73.05, 6.98] },
        },
        {
          id: 'wp-2',
          location: { coordinates: [-73.04, 6.99] },
        },
      ]);

      const result = await service.getRoutePath('active-route-id');

      expect(result.id).toBe('active-route-id');
      expect(result.name).toBe('Ruta Histórica de los Garroteros');
      expect(result.startTime).toBe('08:30 AM');
      expect(result.startDate).toBe('2026-10-19');
      expect(result.endDate).toBe('2026-10-19');
      expect(result.coordinates.length).toBe(2);
    });
  });

  describe('createRoute', () => {
    it('debe persistir los campos startTime, startDate y endDate al crear una ruta', async () => {
      const createDto: CreateRouteDto = {
        name: 'Nueva Ruta Panorámica',
        municipality: 'Piedecuesta, Santander',
        description: 'Recorrido por cerros tutelares',
        totalDistanceKm: 4.2,
        estimatedDurationMinutes: 90,
        startTime: '07:00 AM',
        startDate: '2026-11-01',
        endDate: '2026-11-02',
        isActive: true,
        guideIds: [],
      };

      const createdRoute = await service.createRoute(createDto);

      expect(createdRoute.name).toBe('Nueva Ruta Panorámica');
      expect(createdRoute.startTime).toBe('07:00 AM');
      expect(createdRoute.startDate).toBe('2026-11-01');
      expect(createdRoute.endDate).toBe('2026-11-02');
      expect(mockRouteRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateRoute', () => {
    it('debe actualizar los campos de fecha y hora cuando se envían en el DTO', async () => {
      const existingRoute: Partial<Route> = {
        id: 'route-uuid-update',
        name: 'Ruta Existente',
        municipality: 'Piedecuesta',
        description: 'Descripción previa',
        totalDistanceKm: 2,
        estimatedDurationMinutes: 45,
        isActive: false,
        startTime: '08:00 AM',
        startDate: '2026-10-10',
        endDate: '2026-10-10',
        guides: [],
      };
      mockRouteRepo.findOne = vi.fn().mockResolvedValue(existingRoute);

      const updateDto: UpdateRouteDto = {
        startTime: '09:15 AM',
        startDate: '2026-10-25',
        endDate: '2026-10-26',
      };

      const updatedRoute = await service.updateRoute('route-uuid-update', updateDto);

      expect(updatedRoute.startTime).toBe('09:15 AM');
      expect(updatedRoute.startDate).toBe('2026-10-25');
      expect(updatedRoute.endDate).toBe('2026-10-26');
      expect(mockRouteRepo.save).toHaveBeenCalled();
    });
  });

  describe('extractGoogleDriveId', () => {
    it('debe extraer el ID desde un enlace /file/d/', () => {
      const driveUrl = 'https://drive.google.com/file/d/1WkvoRKw0sA0MESL9RUlS-KdnLKhENx27/view';
      expect(service.extractGoogleDriveId(driveUrl)).toBe('1WkvoRKw0sA0MESL9RUlS-KdnLKhENx27');
    });

    it('debe extraer el ID desde un enlace con parámetro ?id=', () => {
      const driveUrl = 'https://drive.google.com/uc?export=download&id=1WkvoRKw0sA0MESL9RUlS-KdnLKhENx27';
      expect(service.extractGoogleDriveId(driveUrl)).toBe('1WkvoRKw0sA0MESL9RUlS-KdnLKhENx27');
    });

    it('debe aceptar identificadores alfanuméricos directos', () => {
      const rawId = '1WkvoRKw0sA0MESL9RUlS-KdnLKhENx27';
      expect(service.extractGoogleDriveId(rawId)).toBe(rawId);
    });

    it('debe retornar null para enlaces inválidos o vacíos', () => {
      expect(service.extractGoogleDriveId(null)).toBeNull();
      expect(service.extractGoogleDriveId('')).toBeNull();
      expect(service.extractGoogleDriveId('https://example.com/audio.ogg')).toBeNull();
    });
  });

  describe('normalizeGoogleDriveUrl', () => {
    it('debe transformar enlaces de visualización de Google Drive en endpoint de streaming optimizado', () => {
      const driveUrl = 'https://drive.google.com/file/d/1WkvoRKw0sA0MESL9RUlS-KdnLKhENx27/view?usp=sharing';
      const expected = '/api/v1/routes/audio-stream?driveId=1WkvoRKw0sA0MESL9RUlS-KdnLKhENx27';

      expect(service.normalizeGoogleDriveUrl(driveUrl)).toBe(expected);
    });

    it('debe mantener intactas URLs de audio que no pertenezcan a Google Drive', () => {
      const standardUrl = 'https://example.com/audios/guia.ogg';
      expect(service.normalizeGoogleDriveUrl(standardUrl)).toBe(standardUrl);
    });

    it('debe retornar null cuando la URL es vacía o nula', () => {
      expect(service.normalizeGoogleDriveUrl(null)).toBeNull();
      expect(service.normalizeGoogleDriveUrl('')).toBeNull();
    });
  });

  describe('streamAudio', () => {
    it('debe lanzar BadRequestException si el identificador es inválido', async () => {
      const mockResponse = {
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as import('express').Response;

      await expect(service.streamAudio('short-id', undefined, mockResponse)).rejects.toThrow();
    });
  });
});
