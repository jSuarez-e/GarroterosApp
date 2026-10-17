/**
 * @sdd
 * [Objetivo]: Servicio de gestion de rutas, POIs, calculo de trazado e integracion meteorologica en vivo (SDD-004-MAP-MULTIMEDIA-WEATHER).
 * [I/O]: Expone getWaypoints, getRoutePath y getWeather. Consume Open-Meteo API con cache en memoria (15 min TTL).
 * [Edge Cases]: Seeding idempotente en onModuleInit, fallback resiliente ante fallos de red en Open-Meteo, tipos estrictos sin 'any'.
 */

import { Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Waypoint } from './entities/waypoint.entity.js';
import { Route } from './entities/route.entity.js';
import { Guide } from '../guides/entities/guide.entity.js';
import { RouteLogEntry } from '../admin/entities/route-log-entry.entity.js';
import type { CreateRouteDto, UpdateRouteDto } from './dto/create-route.dto.js';
import type {
  PoiDto,
  RoutePathDto,
  WeatherReportDto,
  CurrentWeatherDto,
  HourlyForecastDto,
} from './dto/route.dto.js';

/**
 *
 */
interface OpenMeteoResponse {
  /**
   *
   */
  latitude: number;
  /**
   *
   */
  longitude: number;
  /**
   *
   */
  current: {
    /**
     *
     */
    time: string;
    /**
     *
     */
    temperature_2m: number;
    /**
     *
     */
    relative_humidity_2m: number;
    /**
     *
     */
    precipitation_probability: number;
    /**
     *
     */
    weather_code: number;
    /**
     *
     */
    wind_speed_10m: number;
  };
  /**
   *
   */
  hourly: {
    /**
     *
     */
    time: string[];
    /**
     *
     */
    temperature_2m: number[];
    /**
     *
     */
    precipitation_probability: number[];
    /**
     *
     */
    weather_code: number[];
  };
}

/**
 * Servicio encargado de la logica cartografica, puntos de interes y meteorologia de Piedecuesta.
 */
@Injectable()
export class RoutesService implements OnModuleInit {
  /**
   *
   */
  private readonly logger = new Logger(RoutesService.name);

  // Cache en memoria para Open-Meteo (15 minutos)
  /**
   *
   */
  private weatherCache: WeatherReportDto | null = null;
  /**
   *
   */
  private weatherCacheTimestamp = 0;
  /**
   *
   */
  private readonly CACHE_TTL_MS = 15 * 60 * 1000;

  // Coordenadas base de Piedecuesta, Santander
  /**
   *
   */
  private readonly PIEDECUESTA_LAT = 6.9877;
  /**
   *
   */
  private readonly PIEDECUESTA_LNG = -73.0501;

  /**
   * Inicializa el servicio de rutas inyectando repositorios de waypoints, rutas, guías y bitácora.
   * @param waypointRepository Repositorio de waypoints.
   * @param routeRepository Repositorio de rutas turísticas.
   * @param guideRepository Repositorio de guías oficiales.
   * @param logRepository Repositorio de bitácora e itinerario.
   */
  constructor(
    @InjectRepository(Waypoint)
    private readonly waypointRepository: Repository<Waypoint>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(Guide)
    private readonly guideRepository: Repository<Guide>,
    @InjectRepository(RouteLogEntry)
    private readonly logRepository: Repository<RouteLogEntry>,
  ) {}

  /**
   * Inicializa datos predeterminados de la ruta si la tabla de waypoints o routes esta vacia.
   */
  async onModuleInit(): Promise<void> {
    await this.seedInitialRouteIfEmpty();
    await this.seedInitialWaypointsIfEmpty();
    await this.linkUnassociatedWaypointsIfAny();
  }

  /**
   * Obtiene la lista completa de Puntos de Interes (POIs) ordenados por su indice secuencial, opcionalmente filtrados por ruta.
   * @param routeId Identificador UUID opcional de la ruta para filtrar los POIs.
   * @returns Lista de POIs tipados para el cliente.
   */
  async getWaypoints(routeId?: string): Promise<PoiDto[]> {
    let targetRouteId = routeId;
    if (!targetRouteId) {
      const activeRoute = await this.routeRepository.findOne({ where: { isActive: true } });
      if (activeRoute) {
        targetRouteId = activeRoute.id;
      }
    }

    if (!targetRouteId) {
      return [];
    }

    const waypoints = await this.waypointRepository.find({
      where: { routeId: targetRouteId },
      relations: { route: true },
      order: { orderIndex: 'ASC' },
    });

    return waypoints.map((wp) => ({
      id: wp.id,
      routeId: wp.routeId,
      routeName: wp.route?.name,
      title: wp.title,
      description: wp.description,
      orderIndex: wp.orderIndex,
      location: {
        latitude: wp.location.coordinates[1],
        longitude: wp.location.coordinates[0],
      },
      audioUrl: wp.audioUrl,
      photoUrls: wp.photoUrls || [],
    }));
  }

  /**
   * Asocia waypoints huérfanos que no posean route_id a la ruta oficial activa.
   */
  private async linkUnassociatedWaypointsIfAny(): Promise<void> {
    const activeRoute = await this.routeRepository.findOne({ where: { isActive: true } });
    if (activeRoute) {
      const unlinked = await this.waypointRepository.find({
        where: { routeId: IsNull() },
      });
      if (unlinked.length > 0) {
        for (const wp of unlinked) {
          wp.routeId = activeRoute.id;
          await this.waypointRepository.save(wp);
        }
        this.logger.log(`Asociados ${unlinked.length} waypoints huérfanos a la ruta activa ${activeRoute.name}.`);
      }
    }
  }

  /**
   * Retorna la polilinea oficial del recorrido en formato GeoJSON coordinates [longitud, latitud].
   * Consulta la ruta activa o la ruta especificada por routeId en la base de datos con fallback resiliente.
   * @param routeId UUID opcional de la ruta a consultar.
   * @returns Metadata de la ruta y trazado del camino.
   */
  async getRoutePath(routeId?: string): Promise<RoutePathDto> {
    let targetRoute: Route | null = null;
    if (routeId) {
      targetRoute = await this.routeRepository.findOne({
        where: { id: routeId },
      });
    } else {
      targetRoute = await this.routeRepository.findOne({
        where: { isActive: true },
      });
    }

    if (targetRoute) {
      const waypoints = await this.waypointRepository.find({
        where: { routeId: targetRoute.id },
        order: { orderIndex: 'ASC' },
      });

      // Si la ruta no cuenta con puntos de interés (POIs) registrados, no se dibuja polilínea en el mapa
      if (waypoints.length === 0) {
        return {
          id: targetRoute.id,
          name: targetRoute.name,
          municipality: targetRoute.municipality,
          description: targetRoute.description,
          totalDistanceKm: Number(targetRoute.totalDistanceKm) || 0,
          estimatedDurationMinutes: targetRoute.estimatedDurationMinutes || 0,
          coordinates: [],
        };
      }

      const waypointCoordinates: [number, number][] = waypoints.map(
        (wp) => [wp.location.coordinates[0], wp.location.coordinates[1]] as [number, number],
      );

      // Si la ruta posee un trazado detallado manual personalizado (que no sea el mock inicial con cruces),
      // se utiliza; de lo contrario, se genera la secuencia lineal conectando los waypoints en orden (orderIndex ASC).
      let coordinates: [number, number][];
      if (
        targetRoute.coordinates &&
        targetRoute.coordinates.length > waypoints.length &&
        !this.isLegacyMockCoordinates(targetRoute.coordinates)
      ) {
        coordinates = targetRoute.coordinates;
      } else {
        coordinates = waypointCoordinates.length >= 2 ? waypointCoordinates : [];
      }

      return {
        id: targetRoute.id,
        name: targetRoute.name,
        municipality: targetRoute.municipality,
        description: targetRoute.description,
        totalDistanceKm: Number(targetRoute.totalDistanceKm) || 0,
        estimatedDurationMinutes: targetRoute.estimatedDurationMinutes || 0,
        coordinates,
      };
    }

    return {
      id: '',
      name: 'Sin ruta activa',
      municipality: 'Piedecuesta, Santander',
      description: 'No hay un recorrido oficial activo en el sistema.',
      totalDistanceKm: 0,
      estimatedDurationMinutes: 0,
      coordinates: [],
    };
  }

  /**
   * Retorna la secuencia de hitos del itinerario para la ruta activa o una ruta especifica.
   * @param routeId UUID opcional de la ruta.
   * @returns Lista de hitos ordenados cronológicamente por orderIndex.
   */
  async getItinerary(routeId?: string): Promise<RouteLogEntry[]> {
    let targetRouteId = routeId;
    if (!targetRouteId) {
      const activeRoute = await this.routeRepository.findOne({ where: { isActive: true } });
      targetRouteId = activeRoute?.id;
    }
    if (!targetRouteId) return [];

    return this.logRepository.find({
      where: { routeId: targetRouteId },
      order: { orderIndex: 'ASC' },
    });
  }

  /**
   * Retorna la lista completa de rutas turísticas registradas con sus guías asignados.
   * @returns Colección de rutas ordenadas por fecha de creación descendente.
   */
  async getAllRoutes(): Promise<Route[]> {
    return this.routeRepository.find({
      relations: { guides: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtiene una ruta por su identificador UUID incluyendo sus guías oficiales asociados.
   * @param id Identificador UUID de la ruta.
   * @returns Entidad Route encontrada.
   * @throws NotFoundException Si la ruta no existe.
   */
  async getRouteById(id: string): Promise<Route> {
    const route = await this.routeRepository.findOne({
      where: { id },
      relations: { guides: true },
    });

    if (!route) {
      throw new NotFoundException(`Ruta con ID ${id} no encontrada`);
    }

    return route;
  }

  /**
   * Crea una nueva ruta turística y le asocia los guías seleccionados por el administrador.
   * @param dto Datos de la ruta y arreglo de IDs de guías.
   * @returns Ruta persistida con su relación de guías.
   */
  async createRoute(dto: CreateRouteDto): Promise<Route> {
    if (dto.isActive) {
      await this.routeRepository.update({ isActive: true }, { isActive: false });
    }

    let assignedGuides: Guide[] = [];
    if (dto.guideIds && dto.guideIds.length > 0) {
      assignedGuides = await this.guideRepository.findBy({
        id: In(dto.guideIds),
      });
    }

    const route = this.routeRepository.create({
      name: dto.name.trim(),
      municipality: dto.municipality?.trim() || 'Piedecuesta, Santander',
      description: dto.description.trim(),
      totalDistanceKm: dto.totalDistanceKm,
      estimatedDurationMinutes: dto.estimatedDurationMinutes,
      coordinates: dto.coordinates && dto.coordinates.length > 0
        ? dto.coordinates
        : [],
      isActive: dto.isActive ?? false,
      guides: assignedGuides,
    });

    return this.routeRepository.save(route);
  }

  /**
   * Actualiza los datos de una ruta existente y sincroniza los guías asignados.
   * @param id Identificador UUID de la ruta.
   * @param dto Campos a actualizar.
   * @returns Ruta actualizada.
   */
  async updateRoute(id: string, dto: UpdateRouteDto): Promise<Route> {
    const route = await this.getRouteById(id);

    if (dto.isActive) {
      await this.routeRepository.update({ isActive: true }, { isActive: false });
      route.isActive = true;
    } else if (dto.isActive === false) {
      route.isActive = false;
    }

    if (dto.name !== undefined) route.name = dto.name.trim();
    if (dto.municipality !== undefined) route.municipality = dto.municipality.trim();
    if (dto.description !== undefined) route.description = dto.description.trim();
    if (dto.totalDistanceKm !== undefined) route.totalDistanceKm = dto.totalDistanceKm;
    if (dto.estimatedDurationMinutes !== undefined) {
      route.estimatedDurationMinutes = dto.estimatedDurationMinutes;
    }
    if (dto.coordinates !== undefined) route.coordinates = dto.coordinates;

    if (dto.guideIds !== undefined) {
      if (dto.guideIds.length > 0) {
        route.guides = await this.guideRepository.findBy({
          id: In(dto.guideIds),
        });
      } else {
        route.guides = [];
      }
    }

    return this.routeRepository.save(route);
  }

  /**
   * Elimina una ruta turística del sistema.
   * @param id Identificador UUID de la ruta a eliminar.
   */
  async deleteRoute(id: string): Promise<void> {
    const route = await this.getRouteById(id);
    await this.routeRepository.remove(route);
  }

  /**
   * Establece una ruta específica como la ruta activa oficial del sistema.
   * @param id Identificador UUID de la ruta a activar.
   * @returns Ruta activada.
   */
  async setActiveRoute(id: string): Promise<Route> {
    const route = await this.getRouteById(id);
    await this.routeRepository.update({ isActive: true }, { isActive: false });
    await this.routeRepository.update({ id }, { isActive: true });
    route.isActive = true;
    return route;
  }

  /**
   * Coordenadas predeterminadas del centro histórico de Piedecuesta.
   * @returns Arreglo de pares [longitud, latitud].
   */
  private getDefaultCoordinates(): [number, number][] {
    return [
      [-73.0501, 6.9877], // Parque Principal La Libertad
      [-73.0498, 6.9879], // Carrera 6 hacia calle 10
      [-73.0496, 6.9882], // Iglesia San Francisco Javier
      [-73.0500, 6.9886], // Esquina calle 9 con carrera 7
      [-73.0505, 6.9890], // Callejón de los Garroteros
      [-73.0509, 6.9883], // Carrera 8 peatonal
      [-73.0498, 6.9874], // Transición hacia el sur
      [-73.0488, 6.9868], // Ermita Nuestra Señora de la Asunción
      [-73.0502, 6.9888], // Retorno norte hacia el centro cultural
      [-73.0515, 6.9898], // Casa de la Cultura Custodio García Rovira
    ];
  }

  /**
   * Determina si las coordenadas corresponden al arreglo de prueba inicial con cruces y saltos diagonales.
   * @param coords Arreglo de coordenadas a validar.
   * @returns true si coincide con el mock inicial legado.
   */
  private isLegacyMockCoordinates(coords: [number, number][]): boolean {
    const defaultCoords = this.getDefaultCoordinates();
    if (!coords || coords.length !== defaultCoords.length) return false;
    return coords.every(
      (c, i) => Math.abs(c[0] - defaultCoords[i][0]) < 0.0001 && Math.abs(c[1] - defaultCoords[i][1]) < 0.0001,
    );
  }

  /**
   * Consulta el clima en tiempo real y pronostico por horas mediante Open-Meteo API con cache local.
   * @returns Reporte meteorologico estructurado con recomendaciones para la caminata.
   */
  async getWeather(): Promise<WeatherReportDto> {
    const now = Date.now();
    if (this.weatherCache && now - this.weatherCacheTimestamp < this.CACHE_TTL_MS) {
      return this.weatherCache;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.PIEDECUESTA_LAT}&longitude=${this.PIEDECUESTA_LNG}&current=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&timezone=America%2FBogota&forecast_days=1`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Open-Meteo responded with status: ${response.status}`);
      }

      const data = (await response.json()) as OpenMeteoResponse;

      const currentCode = data.current.weather_code ?? 0;
      const currentWeather: CurrentWeatherDto = {
        temperature: Math.round(data.current.temperature_2m),
        relativeHumidity: data.current.relative_humidity_2m,
        precipitationProbability: data.current.precipitation_probability ?? 0,
        weatherCode: currentCode,
        weatherDescription: this.mapWeatherCodeToDescription(currentCode),
        weatherIcon: this.mapWeatherCodeToIcon(currentCode),
        windSpeed: Math.round(data.current.wind_speed_10m),
        time: data.current.time,
      };

      const hourly: HourlyForecastDto[] = (data.hourly.time || [])
        .slice(6, 20) // Horas habituales de caminata turistica (06:00 a 19:00)
        .map((timeStr: string, idx: number) => {
          const actualIdx = idx + 6;
          const code = data.hourly.weather_code[actualIdx] ?? 0;
          return {
            time: timeStr.split('T')[1] || timeStr,
            temperature: Math.round(data.hourly.temperature_2m[actualIdx] ?? 22),
            precipitationProbability: data.hourly.precipitation_probability[actualIdx] ?? 0,
            weatherCode: code,
            weatherDescription: this.mapWeatherCodeToDescription(code),
            weatherIcon: this.mapWeatherCodeToIcon(code),
          };
        });

      const recommendations = this.generateTourRecommendations(
        currentWeather.temperature,
        currentWeather.precipitationProbability,
      );

      this.weatherCache = {
        municipality: 'Piedecuesta, Santander',
        latitude: this.PIEDECUESTA_LAT,
        longitude: this.PIEDECUESTA_LNG,
        current: currentWeather,
        hourly,
        recommendations,
        fetchedAt: new Date().toISOString(),
      };
      this.weatherCacheTimestamp = now;

      return this.weatherCache;
    } catch (error) {
      this.logger.error('Error al consultar Open-Meteo API. Retornando fallback meteorologico.', error);
      return this.getFallbackWeather();
    }
  }

  /**
   * Genera recomendaciones de seguridad y equipamiento para el senderismo urbano segun el clima.
   * @param temp
   * @param rainProb
   * @returns Lista de recomendaciones según clima.
   */
  private generateTourRecommendations(temp: number, rainProb: number): string[] {
    const recs: string[] = [
      'Usa calzado deportivo cerrado y con buen agarre para las calles coloniales.',
      'Lleva al menos 500ml de agua para mantener una hidratacion constante.',
    ];

    if (temp >= 24) {
      recs.push('Aplica protector solar y usa gorra o sombrero para protegerte de la radiacion UV.');
    }

    if (rainProb >= 40) {
      recs.push('Probabilidad de lluvia moderada: empaca paraguas liviano o impermeable impermeable.');
    } else {
      recs.push('Condiciones secas favorables para la toma de fotografias en los miradores y plazas.');
    }

    return recs;
  }

  /**
   * Mapea el codigo WMO a descripcion en español.
   * @param code
   * @returns Descripcion textual en español.
   */
  private mapWeatherCodeToDescription(code: number): string {
    switch (code) {
      case 0:
        return 'Cielo despejado';
      case 1:
        return 'Mayormente despejado';
      case 2:
        return 'Parcialmente nublado';
      case 3:
        return 'Nublado';
      case 45:
      case 48:
        return 'Niebla en la meseta';
      case 51:
      case 53:
      case 55:
        return 'Llovizna ligera';
      case 61:
      case 63:
      case 65:
        return 'Lluvia constante';
      case 80:
      case 81:
      case 82:
        return 'Chubascos intermitentes';
      case 95:
      case 96:
      case 99:
        return 'Tormenta eléctrica';
      default:
        return 'Clima templado';
    }
  }

  /**
   * Mapea el codigo WMO al icono adecuado de Ionic/Ionicons.
   * @param code
   * @returns Nombre del icono de Ionicons.
   */
  private mapWeatherCodeToIcon(code: number): string {
    if (code === 0) return 'sunny-outline';
    if (code >= 1 && code <= 3) return 'partly-sunny-outline';
    if (code === 45 || code === 48) return 'cloud-outline';
    if (code >= 51 && code <= 65) return 'rainy-outline';
    if (code >= 80 && code <= 82) return 'umbrella-outline';
    if (code >= 95) return 'thunderstorm-outline';
    return 'partly-sunny-outline';
  }

  /**
   * Fallback meteorologico en caso de fallo externo de red.
   * @returns Reporte meteorológico predeterminado.
   */
  private getFallbackWeather(): WeatherReportDto {
    return {
      municipality: 'Piedecuesta, Santander',
      latitude: this.PIEDECUESTA_LAT,
      longitude: this.PIEDECUESTA_LNG,
      current: {
        temperature: 22,
        relativeHumidity: 78,
        precipitationProbability: 25,
        weatherCode: 2,
        weatherDescription: 'Parcialmente nublado',
        weatherIcon: 'partly-sunny-outline',
        windSpeed: 6,
        time: new Date().toISOString(),
      },
      hourly: [
        { time: '08:00', temperature: 20, precipitationProbability: 15, weatherCode: 1, weatherDescription: 'Despejado', weatherIcon: 'sunny-outline' },
        { time: '10:00', temperature: 23, precipitationProbability: 20, weatherCode: 2, weatherDescription: 'Parcialmente nublado', weatherIcon: 'partly-sunny-outline' },
        { time: '12:00', temperature: 25, precipitationProbability: 30, weatherCode: 2, weatherDescription: 'Parcialmente nublado', weatherIcon: 'partly-sunny-outline' },
        { time: '14:00', temperature: 26, precipitationProbability: 35, weatherCode: 3, weatherDescription: 'Nublado', weatherIcon: 'cloudy-outline' },
        { time: '16:00', temperature: 24, precipitationProbability: 40, weatherCode: 51, weatherDescription: 'Llovizna ligera', weatherIcon: 'rainy-outline' },
        { time: '18:00', temperature: 21, precipitationProbability: 25, weatherCode: 3, weatherDescription: 'Nublado', weatherIcon: 'cloudy-outline' },
      ],
      recommendations: [
        'Usa calzado deportivo cerrado para caminar comodamente por el centro historico.',
        'Lleva hidratacion y protector solar para el recorrido matutino.',
      ],
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Inserta los 5 POIs iniciales de Piedecuesta si no existen en la base de datos.
   */
  private async seedInitialWaypointsIfEmpty(): Promise<void> {
    const count = await this.waypointRepository.count();
    if (count > 0) {
      this.logger.log(`Base de datos ya cuenta con ${count} waypoints indexados.`);
      return;
    }

    this.logger.log('Sembrando POIs historicos y culturales de Piedecuesta...');

    const initialPois: Array<{
      /**
       *
       */
      title: string;
      /**
       *
       */
      description: string;
      /**
       *
       */
      orderIndex: number;
      /**
       *
       */
      lat: number;
      /**
       *
       */
      lng: number;
      /**
       *
       */
      audioUrl: string;
      /**
       *
       */
      photoUrls: string[];
    }> = [
      {
        title: 'Parque Principal La Libertad',
        description:
          'Corazón cívico e histórico de Piedecuesta. Alrededor de este emblemático parque convergen la arquitectura republicana tradicional, fuentes ornamentales y la vida cotidiana de los garroteros bajo majestuosos árboles samanes.',
        orderIndex: 1,
        lat: 6.9877,
        lng: -73.0501,
        audioUrl: 'https://actions.google.com/sounds/v1/ambiences/park_with_birds.ogg',
        photoUrls: [
          'https://images.unsplash.com/photo-1541971875076-8f970d573be6?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?auto=format&fit=crop&w=800&q=80',
        ],
      },
      {
        title: 'Iglesia San Francisco Javier',
        description:
          'Templo monumental erigido a finales del siglo XVIII y principios del XIX. Destaca por sus altas torres gemelas de estilo neoclásico, altares tallados en maderas nativas y una acústica imponente que acompaña los actos religiosos solemnes.',
        orderIndex: 2,
        lat: 6.9882,
        lng: -73.0496,
        audioUrl: 'https://actions.google.com/sounds/v1/foley/church_bells_distant.ogg',
        photoUrls: [
          'https://images.unsplash.com/photo-1548625361-12c8a1674483?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
        ],
      },
      {
        title: 'Callejón de los Garroteros',
        description:
          'Pasaje peatonal empedrado que rinde tributo a la histórica Insurrección de los Comuneros de 1781 y a los valientes artesanos y campesinos que armados con garrotes defendieron su territorio y dignidad.',
        orderIndex: 3,
        lat: 6.9890,
        lng: -73.0505,
        audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_village_atmosphere.ogg',
        photoUrls: [
          'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
        ],
      },
      {
        title: 'Ermita Nuestra Señora de la Asunción',
        description:
          'Una de las joyas arquitectónicas más antiguas del departamento de Santander. Construida en tapia pisada y bahareque colonial, resguarda reliquias marianas y una atmósfera de profunda introspección espiritual.',
        orderIndex: 4,
        lat: 6.9868,
        lng: -73.0488,
        audioUrl: 'https://actions.google.com/sounds/v1/weather/soft_wind_chimes.ogg',
        photoUrls: [
          'https://images.unsplash.com/photo-1473177104440-ffee2f376098?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        ],
      },
      {
        title: 'Casa de la Cultura Custodio García Rovira',
        description:
          'Epicentro de las artes plásticas, el patrimonio tabacalero y las tradiciones orales piedecuestanas. Sus salas albergan exposiciones permanentes sobre el cultivo de la hoja de tabaco y la música de cuerdas andina.',
        orderIndex: 5,
        lat: 6.9898,
        lng: -73.0515,
        audioUrl: 'https://actions.google.com/sounds/v1/foley/acoustic_guitar_tuning.ogg',
        photoUrls: [
          'https://images.unsplash.com/photo-1460518451285-97b6aa326961?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80',
        ],
      },
    ];

    const activeRoute = await this.routeRepository.findOne({ where: { isActive: true } });
    const initialRouteId = activeRoute?.id ?? null;

    for (const item of initialPois) {
      const wp = this.waypointRepository.create({
        routeId: initialRouteId,
        title: item.title,
        description: item.description,
        orderIndex: item.orderIndex,
        location: {
          type: 'Point',
          coordinates: [item.lng, item.lat],
        },
        audioUrl: item.audioUrl,
        photoUrls: item.photoUrls,
      });
      await this.waypointRepository.save(wp);
    }

    this.logger.log('✅ 5 Waypoints de Piedecuesta sembrados exitosamente.');
  }

  /**
   * Inicializa la ruta oficial en la tabla 'routes' vinculando los guías disponibles si la tabla está vacía.
   */
  private async seedInitialRouteIfEmpty(): Promise<void> {
    const count = await this.routeRepository.count();
    if (count > 0) {
      return;
    }

    this.logger.log('Inicializando tabla routes con la Ruta Histórica de los Garroteros...');

    const availableGuides = await this.guideRepository.find({
      where: { status: 'ACTIVE' },
    });

    const route = this.routeRepository.create({
      name: 'Ruta Histórica y Cultural de los Garroteros',
      municipality: 'Piedecuesta, Santander',
      description:
        'Recorrido peatonal guiado a través de los monumentos, templos y callejones insignes del centro histórico de la Villa de San Carlos de Piedecuesta.',
      totalDistanceKm: 2.1,
      estimatedDurationMinutes: 50,
      coordinates: this.getDefaultCoordinates(),
      isActive: true,
      guides: availableGuides,
    });

    await this.routeRepository.save(route);
    this.logger.log(`✅ Ruta oficial inicial creada exitosamente con ${availableGuides.length} guías asignados.`);
  }
}
