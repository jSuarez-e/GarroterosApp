/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para AdminService validando operaciones CRUD de administración e invalidación de caché reactiva en RoutesService.
 * [I/O]: Mocks de HttpClient y RoutesService. Verifica endpoints REST y ejecución de clearCache().
 * [Edge Cases]: Validación de mutación de POIs e hitos de itinerario sin efectos colaterales.
 */

// frontend/src/app/core/services/admin.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AdminService,
  AdminCreatePoiDto,
  AdminUpdatePoiDto,
  CreateRouteLogEntryDto,
  UpdateRouteLogEntryDto,
  ItineraryStatus,
} from './admin.service';
import { RoutesService } from './routes.service';

describe('AdminService', () => {
  let service: AdminService;
  let mockHttpClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };
  let mockRoutesService: {
    clearCache: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    };

    mockRoutesService = {
      clearCache: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminService,
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: RoutesService, useValue: mockRoutesService },
      ],
    });

    service = TestBed.inject(AdminService);
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Gestión de POIs e invalidación de caché', () => {
    it('debe actualizar un POI e invalidar la caché de RoutesService al tener éxito', () => {
      const poiId = 'poi-123';
      const dto: AdminUpdatePoiDto = {
        title: 'Ermita Actualizada',
        latitude: 6.991234,
        longitude: -73.055678,
      };
      const responsePayload = { id: poiId, ...dto, orderIndex: 1, description: 'Desc' };
      mockHttpClient.put.mockReturnValue(of(responsePayload));

      let resultPoi: unknown;
      service.updatePoi(poiId, dto).subscribe((res) => {
        resultPoi = res;
      });

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        expect.stringContaining(`/admin/pois/${poiId}`),
        dto,
      );
      expect(mockRoutesService.clearCache).toHaveBeenCalledTimes(1);
      expect(resultPoi).toEqual(responsePayload);
    });

    it('debe crear un POI e invalidar la caché de RoutesService al tener éxito', () => {
      const dto: AdminCreatePoiDto = {
        title: 'Nuevo POI',
        description: 'Punto turístico',
        orderIndex: 2,
        latitude: 6.9888,
        longitude: -73.0511,
      };
      const responsePayload = { id: 'poi-new', ...dto };
      mockHttpClient.post.mockReturnValue(of(responsePayload));

      service.createPoi(dto).subscribe();

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/admin/pois'),
        dto,
      );
      expect(mockRoutesService.clearCache).toHaveBeenCalledTimes(1);
    });

    it('debe eliminar un POI e invalidar la caché de RoutesService al tener éxito', () => {
      const poiId = 'poi-delete';
      mockHttpClient.delete.mockReturnValue(of({ success: true }));

      service.deletePoi(poiId).subscribe();

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        expect.stringContaining(`/admin/pois/${poiId}`),
      );
      expect(mockRoutesService.clearCache).toHaveBeenCalledTimes(1);
    });

    it('no debe invalidar la caché al consultar getPois', () => {
      mockHttpClient.get.mockReturnValue(of([]));

      service.getPois('route-1').subscribe();

      expect(mockHttpClient.get).toHaveBeenCalled();
      expect(mockRoutesService.clearCache).not.toHaveBeenCalled();
    });
  });

  describe('Gestión de Bitácora e Itinerario', () => {
    it('debe invalidar la caché de RoutesService al registrar un nuevo hito', () => {
      const dto: CreateRouteLogEntryDto = {
        title: 'Llegada al Mirador',
        orderIndex: 1,
        plannedTime: '08:30',
      };
      mockHttpClient.post.mockReturnValue(of({ id: 'log-1', ...dto, status: ItineraryStatus.PENDING }));

      service.createLogEntry(dto).subscribe();

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/admin/log'),
        dto,
      );
      expect(mockRoutesService.clearCache).toHaveBeenCalledTimes(1);
    });

    it('debe invalidar la caché de RoutesService al actualizar un hito de itinerario', () => {
      const logId = 'log-1';
      const dto: UpdateRouteLogEntryDto = {
        status: ItineraryStatus.COMPLETED,
        actualTime: '08:35',
      };
      mockHttpClient.put.mockReturnValue(of({ id: logId, ...dto }));

      service.updateLogEntry(logId, dto).subscribe();

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        expect.stringContaining(`/admin/log/${logId}`),
        dto,
      );
      expect(mockRoutesService.clearCache).toHaveBeenCalledTimes(1);
    });

    it('debe invalidar la caché de RoutesService al eliminar un hito', () => {
      const logId = 'log-1';
      mockHttpClient.delete.mockReturnValue(of({ success: true }));

      service.deleteLogEntry(logId).subscribe();

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        expect.stringContaining(`/admin/log/${logId}`),
      );
      expect(mockRoutesService.clearCache).toHaveBeenCalledTimes(1);
    });
  });
});
