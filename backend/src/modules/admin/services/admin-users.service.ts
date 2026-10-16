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
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../../users/entities/user.entity.js';
import {
  AdminCreateUserDto,
  AdminUpdateUserDto,
  AdminUserQueryDto,
} from '../dto/admin-user.dto.js';

/**
 *
 */
@Injectable()
export class AdminUsersService {
  /**
   *
   * @param userRepository
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Obtiene la lista de usuarios del sistema con filtros opcionales de búsqueda, rol y estado.
   * @param query Criterios de filtrado.
   * @returns Lista de usuarios.
   */
  async getUsers(query: AdminUserQueryDto): Promise<User[]> {
    const qb = this.userRepository.createQueryBuilder('user').orderBy('user.createdAt', 'DESC');

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

    return qb.getMany();
  }

  /**
   * Obtiene un usuario específico por su ID.
   * @param id UUID del usuario.
   * @returns Entidad User.
   * @throws NotFoundException si no existe.
   */
  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }
    return user;
  }

  /**
   * Crea un usuario de forma manual asignando credenciales y rol.
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
    });

    return this.userRepository.save(newUser);
  }

  /**
   * Actualiza los datos de un usuario existente.
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

    return this.userRepository.save(user);
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
}
