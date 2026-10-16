/**
 * @sdd
 * [Objetivo]: Servicio de gestion y persistencia de usuarios (SDD-002-AUTH-RBAC).
 * [I/O]: Inyecta Repository<User>, expone busqueda por email (con o sin passwordHash) y por ID.
 * [Edge Cases]: Sanitizacion de datos, busquedas seguras con QueryBuilder para evitar filtracion de hashes.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

/**
 * Servicio encargado de la consulta y persistencia de la entidad User.
 */
@Injectable()
export class UsersService {
  /**
   *
   * @param userRepository
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Busca un usuario por su correo electronico excluyendo la contraseña.
   * @param email Correo del usuario.
   * @returns El usuario encontrado o null.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  /**
   * Busca un usuario por su correo incluyendo explicitamente el hash de la contraseña para autenticacion.
   * @param email Correo del usuario.
   * @returns El usuario con el campo passwordHash incluido o null.
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = :email', { email: email.toLowerCase().trim() })
      .getOne();
  }

  /**
   * Busca un usuario por su identificador UUID.
   * @param id UUID del usuario.
   * @returns El usuario encontrado.
   * @throws NotFoundException si no existe.
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  /**
   * Crea un nuevo registro de usuario en el sistema.
   * @param userData Datos parciales del usuario a persistir.
   * @returns El usuario persistido.
   */
  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create({
      ...userData,
      email: userData.email?.toLowerCase().trim(),
    });
    return this.userRepository.save(user);
  }
}
