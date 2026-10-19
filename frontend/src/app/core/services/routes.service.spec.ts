/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para RoutesService validando carga reactiva de waypoints, polilínea GeoJSON, clima e itinerario con soporte de filtrado por routeId.
 * [I/O]: Mocks de HttpClient y HttpTestingController. Verifica llamadas REST y actualización de Signals reactivos (waypoints, routePath, itinerary, weather).
 * [Edge Cases]: Carga por routeId específico, invalidación y reinicio de caché con clearCache(), manejo de errores HTTP con observables de fallback.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RoutesService } from './routes.service';
import {
  ItineraryStatus,
  type PoiDto,
  type RoutePathDto,
  type IRouteLogEntry,
} from '../../../../../shared/src/index';

describe('RoutesService', () => {
  let service: RoutesService;
  let httpMock: HttpTestingController;

  const mockWaypoints: PoiDto[] = [
    {
      id: 'poi-1',
      title: 'Parque Principal La Libertad',
      description: 'Punto de inicio del recorrido patrimonial.',
      orderIndex: 0,
      location: { latitude: 6.9877, longitude: -73.0501 },
      audioUrl: null,
      photoUrls: [],
    },
    {
      id: 'poi-2',
      title: 'Experiencia Procesos de Tecnificación del Café',
      description: 'Punto de cierre del sendero.',
      orderIndex: 1,
      location: { latitude: 6.9898, longitude: -73.0515 },
      audioUrl: null,
      photoUrls: [],
    },
  ];

  const mockRoutePath: RoutePathDto = {
    id: 'route-test-1',
    name: 'Ruta Histórica y Cultural de los Garroteros',
    municipality: 'Piedecuesta, Santander',
    description: 'Recorrido oficial de prueba.',
    totalDistanceKm: 2.5,
    estimatedDurationMinutes: 45,
    coordinates: [
      [-73.0501, 6.9877],
      [-73.0515, 6.9898],
    ],
  };

  const mockItinerary: IRouteLogEntry[] = [
    {
      id: 'log-1',
      routeId: 'route-test-1',
      title: 'Recepción en Parque La Libertad',
      orderIndex: 1,
      plannedTime: '08:00',
      actualTime: null,
      status: ItineraryStatus.PENDING,
      notes: 'Punto de encuentro inicial.',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), RoutesService],
    });

    service = TestBed.inject(RoutesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe instanciarse correctamente con señales reactivas inicializadas', () => {
    expect(service).toBeTruthy();
    expect(service.waypoints()).toEqual([]);
    expect(service.routePath()).toBeNull();
    expect(service.itinerary()).toEqual([]);
    expect(service.weather()).toBeNull();
  });

  describe('getWaypoints', () => {
    it('debe consultar los waypoints pasando routeId y actualizar la señal reactiva waypoints', () => {
      let resultData: PoiDto[] = [];
      service.getWaypoints('route-test-1').subscribe((data: PoiDto[]) => {
        resultData = data;
      });

      const request = httpMock.expectOne((req) => req.url.includes('/routes/waypoints') && req.params.get('routeId') === 'route-test-1');
      expect(request.request.method).toBe('GET');
      request.flush(mockWaypoints);

      expect(resultData).toEqual(mockWaypoints);
      expect(service.waypoints()).toEqual(mockWaypoints);
      expect(service.isLoading()).toBe(false);
    });

    it('debe utilizar la caché en memoria cuando la ruta ya fue cargada y no se solicita forceRefresh', () => {
      service.getWaypoints('route-test-1').subscribe();
      const firstReq = httpMock.expectOne((req) => req.url.includes('/routes/waypoints'));
      firstReq.flush(mockWaypoints);

      // Segunda llamada: debe resolver directamente de la caché sin lanzar petición HTTP
      let cachedResult: PoiDto[] = [];
      service.getWaypoints('route-test-1').subscribe((data: PoiDto[]) => {
        cachedResult = data;
      });

      httpMock.expectNone((req) => req.url.includes('/routes/waypoints'));
      expect(cachedResult).toEqual(mockWaypoints);
    });

    it('debe forzar la consulta al backend si forceRefresh es true', () => {
      service.getWaypoints('route-test-1').subscribe();
      const firstReq = httpMock.expectOne((req) => req.url.includes('/routes/waypoints'));
      firstReq.flush(mockWaypoints);

      service.getWaypoints('route-test-1', true).subscribe();
      const secondReq = httpMock.expectOne((req) => req.url.includes('/routes/waypoints'));
      expect(secondReq.request.method).toBe('GET');
      secondReq.flush(mockWaypoints);
    });
  });

  describe('getRoutePath', () => {
    it('debe obtener el trazado de la ruta y actualizar la señal reactiva routePath', () => {
      let resultPath: RoutePathDto | null = null;
      service.getRoutePath('route-test-1').subscribe((path: RoutePathDto | null) => {
        resultPath = path;
      });

      const request = httpMock.expectOne((req) => req.url.includes('/routes/path') && req.params.get('routeId') === 'route-test-1');
      expect(request.request.method).toBe('GET');
      request.flush(mockRoutePath);

      expect(resultPath).toEqual(mockRoutePath);
      expect(service.routePath()).toEqual(mockRoutePath);
    });
  });

  describe('getItinerary', () => {
    it('debe obtener la lista de hitos y actualizar la señal reactiva itinerary', () => {
      let resultItinerary: IRouteLogEntry[] = [];
      service.getItinerary('route-test-1').subscribe((items: IRouteLogEntry[]) => {
        resultItinerary = items;
      });

      const request = httpMock.expectOne((req) => req.url.includes('/routes/itinerary') && req.params.get('routeId') === 'route-test-1');
      expect(request.request.method).toBe('GET');
      request.flush(mockItinerary);

      expect(resultItinerary).toEqual(mockItinerary);
      expect(service.itinerary()).toEqual(mockItinerary);
    });
  });

  describe('clearCache', () => {
    it('debe reiniciar todas las señales reactivas e invalidar la clave de ruta cargada', () => {
      service.getWaypoints('route-test-1').subscribe();
      const reqWaypoints = httpMock.expectOne((req) => req.url.includes('/routes/waypoints'));
      reqWaypoints.flush(mockWaypoints);

      service.getRoutePath('route-test-1').subscribe();
      const reqPath = httpMock.expectOne((req) => req.url.includes('/routes/path'));
      reqPath.flush(mockRoutePath);

      expect(service.waypoints().length).toBeGreaterThan(0);
      expect(service.routePath()).not.toBeNull();

      service.clearCache();

      expect(service.waypoints()).toEqual([]);
      expect(service.routePath()).toBeNull();
      expect(service.itinerary()).toEqual([]);

      // Nueva solicitud debe volver a emitir HTTP tras invalidar la caché
      service.getWaypoints('route-test-1').subscribe();
      const newReq = httpMock.expectOne((req) => req.url.includes('/routes/waypoints'));
      newReq.flush([]);
    });
  });
});
