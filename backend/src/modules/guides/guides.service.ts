/**
 * @sdd
 * [Objetivo]: Servicio de consulta, persistencia y asignación de guías turísticos oficiales de Piedecuesta.
 * [I/O]: Inyecta Repository<Guide> y Repository<Route>. Expone operaciones CRUD y consulta de guías asociados a la ruta activa.
 * [Edge Cases]: Seeding idempotente en onModuleInit, validación de email duplicado y fallback de ruta activa.
 */

// backend/src/modules/guides/guides.service.ts

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Guide } from './entities/guide.entity.js';
import { Route } from '../routes/entities/route.entity.js';
import type { CreateGuideDto, UpdateGuideDto } from './dto/guide.dto.js';

/**
 * Interfaz de salida para el perfil enriquecido de un guía turístico oficial.
 */
export interface GuideProfileOutput {
  /** Identificador único UUID */
  id: string;
  /** Nombre completo */
  fullName: string;
  /** Correo electrónico */
  email: string;
  /** Teléfono de contacto directo */
  phone: string | null;
  /** Fotografía o avatar */
  avatarUrl: string | null;
  /** Reseña biográfica */
  bio: string | null;
  /** Certificaciones y credenciales */
  certifications: string[];
  /** Calificación promedio */
  rating: number;
  /** Años de experiencia */
  experienceYears: number;
  /** Recorrido o tour al que está asignado */
  assignedTour: string | null;
  /** Estado operativo */
  status: 'ACTIVE' | 'INACTIVE';
}

/**
 * Servicio encargado del ciclo de vida y consultas del directorio de guías turísticos.
 */
@Injectable()
export class GuidesService implements OnModuleInit {
  /**
   * Instancia de registro para auditoría interna del servicio.
   */
  private readonly logger = new Logger(GuidesService.name);

  /**
   * Constructor con inyección de repositorios TypeORM.
   * @param guideRepository Repositorio de guías turísticos.
   * @param routeRepository Repositorio de rutas y senderos.
   */
  constructor(
    @InjectRepository(Guide)
    private readonly guideRepository: Repository<Guide>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
  ) {}

  /**
   * Inicialización del módulo con seeding de guías oficiales si la tabla está vacía.
   */
  async onModuleInit(): Promise<void> {
    await this.seedInitialGuidesIfEmpty();
  }

  /**
   * Obtiene la lista de guías oficiales asignados a la ruta activa o a la ruta solicitada.
   * @param search Término opcional para filtrar por nombre o correo.
   * @param routeId Identificador opcional de ruta específica.
   * @returns Lista de perfiles de guías turísticos.
   */
  async getGuides(search?: string, routeId?: string): Promise<GuideProfileOutput[]> {
    let guides: Guide[] = [];
    let tourName: string = 'Ruta Histórica y Cultural de los Garroteros';

    if (routeId) {
      const route = await this.routeRepository.findOne({
        where: { id: routeId },
        relations: { guides: true },
      });
      if (route) {
        guides = (route.guides || []).filter((g) => g.status === 'ACTIVE');
        tourName = route.name;
      }
    } else {
      // Buscar la ruta activa oficial
      const activeRoute = await this.routeRepository.findOne({
        where: { isActive: true },
        relations: { guides: true },
      });

      if (activeRoute && activeRoute.guides && activeRoute.guides.length > 0) {
        guides = activeRoute.guides.filter((g) => g.status === 'ACTIVE');
        tourName = activeRoute.name;
      } else {
        // Fallback: listar todos los guías activos si no hay ruta activa configurada
        guides = await this.guideRepository.find({
          where: { status: 'ACTIVE' },
          order: { fullName: 'ASC' },
        });
      }
    }

    if (search && search.trim().length > 0) {
      const term = search.toLowerCase().trim();
      guides = guides.filter(
        (g) =>
          g.fullName.toLowerCase().includes(term) ||
          g.email.toLowerCase().includes(term),
      );
    }

    return guides.map((guide) => ({
      id: guide.id,
      fullName: guide.fullName,
      email: guide.email,
      phone: guide.phone,
      avatarUrl: guide.avatarUrl,
      bio: guide.bio,
      certifications: guide.certifications || [],
      rating: Number(guide.rating) || 5.0,
      experienceYears: guide.experienceYears || 1,
      assignedTour: tourName,
      status: guide.status,
    }));
  }

  /**
   * Obtiene la totalidad de guías en la tabla para administración y selección en formularios de rutas.
   * @returns Lista completa de guías registrados.
   */
  async getAllGuides(): Promise<Guide[]> {
    const guides = await this.guideRepository.find({
      relations: { routes: true },
      order: { fullName: 'ASC' },
    });
    return guides.map((g) => ({
      ...g,
      rating: Number(g.rating) || 5.0,
      experienceYears: Number(g.experienceYears) || 1,
      routes: (g.routes || []).map((r) => ({ id: r.id, name: r.name })),
    })) as unknown as Guide[];
  }

  /**
   * Consulta un guía por su identificador UUID.
   * @param id Identificador UUID del guía.
   * @returns Entidad Guide encontrada.
   * @throws NotFoundException Si el guía no existe.
   */
  async getGuideById(id: string): Promise<Guide> {
    const guide = await this.guideRepository.findOne({
      where: { id },
      relations: { routes: true },
    });
    if (!guide) {
      throw new NotFoundException(`Guía con ID ${id} no encontrado`);
    }
    return guide;
  }

  /**
   * Crea un nuevo guía turístico en la base de datos.
   * @param dto Datos del guía a registrar.
   * @returns Guía persistido.
   * @throws ConflictException Si el correo electrónico ya está registrado.
   */
  async createGuide(dto: CreateGuideDto): Promise<Guide> {
    await this.validateEmailAvailability(dto.email);
    const assignedRoutes = await this.fetchAssignedRoutes(dto.routeIds || []);

    const guide = this.guideRepository.create({
      fullName: dto.fullName.trim(),
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone.trim(),
      avatarUrl: dto.avatarUrl ?? null,
      bio: dto.bio ?? null,
      certifications: dto.certifications ?? [],
      rating: dto.rating ?? 5.0,
      experienceYears: dto.experienceYears ?? 1,
      status: dto.status ?? 'ACTIVE',
      routes: assignedRoutes,
    });

    return this.guideRepository.save(guide);
  }

  /**
   * Actualiza los datos de un guía turístico.
   * @param id Identificador del guía.
   * @param dto Datos modificados.
   * @returns Guía actualizado.
   */
  async updateGuide(id: string, dto: UpdateGuideDto): Promise<Guide> {
    const guide = await this.getGuideById(id);

    if (dto.email && dto.email.toLowerCase().trim() !== guide.email) {
      await this.validateEmailAvailability(dto.email);
      guide.email = dto.email.toLowerCase().trim();
    }

    this.applyGuideScalarFields(guide, dto);

    if (dto.routeIds !== undefined) {
      guide.routes = await this.fetchAssignedRoutes(dto.routeIds);
    }

    return this.guideRepository.save(guide);
  }

  /**
   * Valida que el email no esté registrado previamente por otro guía.
   * @param email Correo electrónico a validar.
   * @throws ConflictException Si el correo ya existe.
   */
  private async validateEmailAvailability(email: string): Promise<void> {
    const existing = await this.guideRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un guía registrado con el correo ${email}`);
    }
  }

  /**
   * Aplica los campos escalares editados a la entidad Guide.
   * @param guide Entidad a modificar.
   * @param dto Datos recibidos.
   */
  private applyGuideScalarFields(guide: Guide, dto: UpdateGuideDto): void {
    if (dto.fullName !== undefined) guide.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) guide.phone = dto.phone.trim();
    if (dto.avatarUrl !== undefined) guide.avatarUrl = dto.avatarUrl;
    if (dto.bio !== undefined) guide.bio = dto.bio;
    if (dto.certifications !== undefined) guide.certifications = dto.certifications;
    if (dto.rating !== undefined) guide.rating = dto.rating;
    if (dto.experienceYears !== undefined) guide.experienceYears = dto.experienceYears;
    if (dto.status !== undefined) guide.status = dto.status;
  }

  /**
   * Consulta las entidades Route a partir de una lista de IDs.
   * @param routeIds Identificadores UUID de rutas.
   * @returns Lista de entidades de ruta asignadas.
   */
  private async fetchAssignedRoutes(routeIds: string[]): Promise<Route[]> {
    if (!routeIds || routeIds.length === 0) {
      return [];
    }
    return this.routeRepository.findBy({ id: In(routeIds) });
  }

  /**
   * Elimina permanentemente o desactiva un guía del sistema.
   * @param id Identificador del guía.
   */
  async deleteGuide(id: string): Promise<void> {
    const guide = await this.guideRepository.findOne({
      where: { id },
      relations: { routes: true },
    });
    if (!guide) {
      throw new NotFoundException(`Guía con ID ${id} no encontrado`);
    }
    guide.routes = [];
    await this.guideRepository.save(guide);
    await this.guideRepository.remove(guide);
  }

  /**
   * Inicializa guías turísticos por defecto en la base de datos si la tabla se encuentra vacía.
   */
  private async seedInitialGuidesIfEmpty(): Promise<void> {
    const count = await this.guideRepository.count();
    if (count > 0) {
      return;
    }

    this.logger.log('Inicializando tabla guides con guías oficiales de Piedecuesta...');

    const initialGuides: Partial<Guide>[] = [
      {
        fullName: 'Julio Carrillo',
        email: 'julio@garroterosapp.com',
        phone: '+573007654321',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        bio: 'Historiador y guía líder de Piedecuesta. Especialista en la gesta comunera de 1781 y arquitectura colonial.',
        certifications: ['SENA Guianza Turística', 'Primeros Auxilios WFR'],
        rating: 4.9,
        experienceYears: 8,
        status: 'ACTIVE',
      },
      {
        fullName: 'Mayerly Gómez',
        email: 'mayerly@garroterosapp.com',
        phone: '+573109876543',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        bio: 'Intérprete del patrimonio tabacalero y tradiciones orales garroteras. Pasión por la cultura y el senderismo seguro.',
        certifications: ['Guía Profesional MinCIT', 'Rescate en Montaña'],
        rating: 4.8,
        experienceYears: 6,
        status: 'ACTIVE',
      },
      {
        fullName: 'Daniel Rey',
        email: 'daniel@garroterosapp.com',
        phone: '+573106552799',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        bio: 'Coordinador de logística y seguridad en ruta. Experto en orientación topográfica y soporte de primeros auxilios.',
        certifications: ['WFR Cruz Roja', 'SENA Guianza Turística'],
        rating: 4.9,
        experienceYears: 7,
        status: 'ACTIVE',
      },
    ];

    for (const g of initialGuides) {
      const entity = this.guideRepository.create(g);
      await this.guideRepository.save(entity);
    }

    this.logger.log('✅ Seeding de guías oficiales completado con éxito.');
  }
}
