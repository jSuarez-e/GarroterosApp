/**
 * @sdd
 * [Objetivo]: Servicio de administración de cuentas de usuario con roles RBAC y control de acceso (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta Repository<User>. Métodos: getUsers, getUserById, createUser, updateUser, toggleUserStatus, deleteUser.
 * [Edge Cases]: Encriptación segura con bcrypt, unicidad de correo, prevención de auto-eliminación del administrador activo.
 */

// backend/src/modules/admin/services/admin-users.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../../users/entities/user.entity.js';
import { Route } from '../../routes/entities/route.entity.js';
import { Guide } from '../../guides/entities/guide.entity.js';
import { MedicalProfile } from '../../medical/entities/medical-profile.entity.js';
import {
  AdminCreateUserDto,
  AdminUpdateUserDto,
  AdminUserQueryDto,
  type IGuideRouteRoster,
  type IRouteRosterParticipant,
} from '../dto/admin-user.dto.js';

/**
 * Servicio para la gestión administrativa de usuarios y asignación de rutas turísticas.
 */
@Injectable()
export class AdminUsersService {
  /**
   * Inicializa el servicio inyectando los repositorios necesarios.
   * @param userRepository Repositorio de persistencia de usuarios.
   * @param routeRepository Repositorio de persistencia de rutas turísticas.
   * @param guideRepository Repositorio de persistencia de guías oficiales.
   * @param medicalProfileRepository Repositorio de fichas médicas y asistencia.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(Guide)
    private readonly guideRepository: Repository<Guide>,
    @InjectRepository(MedicalProfile)
    private readonly medicalProfileRepository: Repository<MedicalProfile>,
  ) {}

  /**
   * Obtiene la lista de usuarios del sistema con filtros opcionales de búsqueda, rol, estado y ruta.
   * @param query Criterios de filtrado.
   * @returns Lista de usuarios con su ruta asignada precargada.
   */
  async getUsers(query: AdminUserQueryDto): Promise<User[]> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.route', 'route')
      .orderBy('user.createdAt', 'DESC');

    if (query.search && query.search.trim().length > 0) {
      qb.andWhere(
        '(LOWER(user.fullName) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: `%${query.search.toLowerCase().trim()}%` },
      );
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.routeId) {
      qb.andWhere('user.routeId = :routeId', { routeId: query.routeId });
    }

    const users = await qb.getMany();
    return this.populateUsersMedicalAvatars(users);
  }

  /**
   * Completa los avatares faltantes de los usuarios consultando sus fichas médicas.
   * @param users Lista de usuarios a enriquecer.
   * @returns Lista de usuarios con avatares sincronizados.
   */
  private async populateUsersMedicalAvatars(users: User[]): Promise<User[]> {
    if (users.length === 0) {
      return users;
    }

    const userIdsWithoutAvatar = users
      .filter((userItem) => !userItem.avatarUrl)
      .map((userItem) => userItem.id);

    if (userIdsWithoutAvatar.length === 0) {
      return users;
    }

    const medicalProfiles = await this.medicalProfileRepository.find({
      where: { userId: In(userIdsWithoutAvatar) },
    });

    const photoMap = new Map<string, string>();
    for (const medical of medicalProfiles) {
      if (medical.photoUrl) {
        photoMap.set(medical.userId, medical.photoUrl);
      }
    }

    for (const userItem of users) {
      if (!userItem.avatarUrl && photoMap.has(userItem.id)) {
        userItem.avatarUrl = photoMap.get(userItem.id) ?? null;
      }
    }

    return users;
  }

  /**
   * Obtiene un usuario específico por su ID incluyendo su relación con la ruta asignada.
   * @param id UUID del usuario.
   * @returns Entidad User.
   * @throws NotFoundException si no existe.
   */
  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { route: true },
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }
    return user;
  }

  /**
   * Crea un usuario de forma manual asignando credenciales, rol y ruta opcional.
   * @param dto Datos del usuario a crear.
   * @returns Usuario persistido.
   * @throws ConflictException si el email ya se encuentra registrado.
   */
  async createUser(dto: AdminCreateUserDto): Promise<User> {
    const emailNormalized = dto.email.toLowerCase().trim();
    const existing = await this.userRepository.findOne({
      where: { email: emailNormalized },
    });

    if (existing) {
      throw new ConflictException(`El correo electrónico ${emailNormalized} ya está registrado.`);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const newUser = this.userRepository.create({
      email: emailNormalized,
      passwordHash,
      fullName: dto.fullName.trim(),
      role: dto.role,
      status: UserStatus.ACTIVE,
      phone: dto.phone ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      routeId: dto.routeId ?? null,
    });

    const saved = await this.userRepository.save(newUser);
    return this.getUserById(saved.id);
  }

  /**
   * Actualiza los datos de un usuario existente incluyendo su ruta asignada.
   * @param id UUID del usuario a actualizar.
   * @param dto Campos a modificar.
   * @returns Usuario actualizado.
   */
  async updateUser(id: string, dto: AdminUpdateUserDto): Promise<User> {
    const user = await this.getUserById(id);

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName.trim();
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone ?? null;
    }
    if (dto.role !== undefined) {
      user.role = dto.role;
    }
    if (dto.status !== undefined) {
      user.status = dto.status;
    }
    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl ?? null;
    }
    if (dto.routeId !== undefined) {
      user.routeId = dto.routeId ?? null;
    }

    await this.userRepository.save(user);
    return this.getUserById(id);
  }

  /**
   * Configura o actualiza la ruta asignada a un usuario.
   * @param id UUID del usuario.
   * @param routeId UUID de la ruta turística o null.
   * @returns Usuario con la ruta actualizada.
   */
  async assignUserRoute(id: string, routeId: string | null): Promise<User> {
    const user = await this.getUserById(id);
    user.routeId = routeId;
    await this.userRepository.save(user);
    return this.getUserById(id);
  }

  /**
   * Alterna el estado de una cuenta de usuario entre ACTIVE e INACTIVE.
   * @param id UUID del usuario.
   * @returns Usuario con estado actualizado.
   */
  async toggleUserStatus(id: string): Promise<User> {
    const user = await this.getUserById(id);
    user.status = user.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
    return this.userRepository.save(user);
  }

  /**
   * Elimina permanentemente una cuenta de usuario.
   * @param id UUID del usuario a eliminar.
   * @param currentAdminId ID del administrador que ejecuta la operación para prevenir auto-eliminación.
   * @returns Confirmación de eliminación.
   */
  async deleteUser(id: string, currentAdminId: string): Promise<{ /**
   *
   */
  success: boolean; /**
   *
   */
  message: string }> {
    if (id === currentAdminId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta de administrador activa.');
    }

    const user = await this.getUserById(id);
    await this.userRepository.remove(user);
    return { success: true, message: `Usuario ${user.email} eliminado exitosamente.` };
  }

  /**
   * Obtiene la lista de rutas activas vinculadas al guía en sesión (o todas las rutas activas si es administrador),
   * junto con la lista de participantes asignados y sus estados de asistencia y ficha médica.
   * @param currentUser Usuario autenticado que realiza la consulta (guía o admin).
   * @returns Lista de rutas con sus participantes y métricas de asistencia.
   */
  async getGuideRouteRoster(currentUser: User): Promise<IGuideRouteRoster[]> {
    // 1. Identificar si el usuario autenticado tiene un registro de Guía vinculado
    let assignedRoutes: Route[] = [];
    const guideProfile = await this.guideRepository.findOne({
      where: [{ userId: currentUser.id }, { email: currentUser.email }],
      relations: { routes: true },
    });

    if (guideProfile && guideProfile.routes && guideProfile.routes.length > 0) {
      const routeIds = guideProfile.routes.map((routeEntity) => routeEntity.id);
      assignedRoutes = await this.routeRepository.find({
        where: { id: In(routeIds) },
        relations: { guides: true },
        order: { isActive: 'DESC', name: 'ASC' },
      });
    }

    // 2. Si no es un guía específico con rutas asignadas, consultar rutas activas oficiales
    if (assignedRoutes.length === 0) {
      assignedRoutes = await this.routeRepository.find({
        where: { isActive: true },
        relations: { guides: true },
        order: { name: 'ASC' },
      });
    }

    // 3. Fallback: si aún no hay rutas activas, obtener todas las rutas disponibles
    if (assignedRoutes.length === 0) {
      assignedRoutes = await this.routeRepository.find({
        relations: { guides: true },
        order: { createdAt: 'DESC' },
      });
    }

    if (assignedRoutes.length === 0) {
      return [];
    }

    // 4. Obtener todos los usuarios asignados a las rutas identificadas
    const targetRouteIds = assignedRoutes.map((targetRoute) => targetRoute.id);
    const assignedUsers = await this.userRepository.find({
      where: { routeId: In(targetRouteIds) },
      order: { fullName: 'ASC' },
    });

    // 5. Obtener las fichas médicas de todos los usuarios asignados
    const participantUserIds = assignedUsers.map((participantUser) => participantUser.id);
    const medicalProfiles =
      participantUserIds.length > 0
        ? await this.medicalProfileRepository.find({
            where: { userId: In(participantUserIds) },
          })
        : [];

    const medicalMap = new Map<string, MedicalProfile>();
    for (const medical of medicalProfiles) {
      medicalMap.set(medical.userId, medical);
    }

    // Agrupar usuarios por ruta
    const usersByRouteMap = new Map<string, User[]>();
    for (const user of assignedUsers) {
      if (user.routeId) {
        const routeUsers = usersByRouteMap.get(user.routeId) ?? [];
        routeUsers.push(user);
        usersByRouteMap.set(user.routeId, routeUsers);
      }
    }

    // 6. Construir el roster estructurado
    const rosters: IGuideRouteRoster[] = assignedRoutes.map((routeEntity) => {
      const usersInRoute = usersByRouteMap.get(routeEntity.id) ?? [];
      const participants: IRouteRosterParticipant[] = usersInRoute.map((user) => {
        const medical = medicalMap.get(user.id);
        const attendanceConfirmed = medical ? medical.attendanceConfirmed : false;
        const hasMedicalProfile = Boolean(medical);
        const photoUrl = medical?.photoUrl ?? user.avatarUrl ?? null;

        return {
          userId: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone ?? null,
          avatarUrl: user.avatarUrl ?? null,
          photoUrl,
          attendanceConfirmed,
          hasMedicalProfile,
          medicalUpdatedAt: medical?.updatedAt ? medical.updatedAt.toISOString() : null,
          medicalSummary: medical
            ? {
                bloodType: medical.bloodType ?? null,
                allergies: medical.allergies ?? null,
                dietType: medical.dietType ?? null,
                emergencyContactName: medical.emergencyContactName ?? null,
                emergencyContactPhone: medical.emergencyContactPhone ?? null,
                medicalConditions: medical.medicalConditions ?? null,
                medications: medical.medications ?? null,
                notes: medical.notes ?? null,
              }
            : null,
        };
      });

      const totalParticipants = participants.length;
      const confirmedParticipants = participants.filter(
        (participant) => participant.attendanceConfirmed,
      ).length;
      const attendanceRatePercentage =
        totalParticipants > 0
          ? Math.round((confirmedParticipants / totalParticipants) * 100)
          : 0;

      return {
        routeId: routeEntity.id,
        routeName: routeEntity.name,
        municipality: routeEntity.municipality,
        totalDistanceKm: Number(routeEntity.totalDistanceKm) || 0,
        estimatedDurationMinutes: Number(routeEntity.estimatedDurationMinutes) || 0,
        isActive: routeEntity.isActive,
        guides: (routeEntity.guides ?? []).map((guideEntity) => ({
          id: guideEntity.id,
          fullName: guideEntity.fullName,
          phone: guideEntity.phone ?? null,
          avatarUrl: guideEntity.avatarUrl ?? null,
        })),
        totalParticipants,
        confirmedParticipants,
        attendanceRatePercentage,
        participants,
      };
    });

    return rosters;
  }
}
