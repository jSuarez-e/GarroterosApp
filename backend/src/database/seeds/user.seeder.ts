/**
 * @sdd
 * [Objetivo]: Sembrador de datos iniciales (Data Seeder) para provisionar los usuarios administrativos de la plataforma.
 * [I/O]: Inyecta DataSource de TypeORM. Lee SEED_DEFAULT_PASSWORD. Inserta entidades User con contraseñas hasheadas.
 * [Edge Cases]: Operacion idempotente; valida la existencia previa por email antes de insertar para evitar duplicidades.
 */

import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../../modules/users/entities/user.entity.js';

/**
 * Ejecuta el sembrado de usuarios administradores iniciales en la base de datos.
 * @param dataSource Conexion activa de TypeORM.
 * @returns Promesa resuelta tras finalizar la insercion o verificacion.
 */
export async function runUserSeeder(dataSource: DataSource): Promise<void> {
  const logger = new Logger('UserSeeder');
  const userRepository = dataSource.getRepository(User);
  const saltRounds = 10;

  const rawSeedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!rawSeedPassword && process.env.NODE_ENV === 'production') {
    throw new Error('SEED_DEFAULT_PASSWORD debe estar definido en variables de entorno para entornos productivos.');
  }
  const defaultPassword = await bcrypt.hash(rawSeedPassword || 'Guianza2026!', saltRounds);

  const initialUsers: Partial<User>[] = [
    {
      email: 'admin@guianza.com',
      passwordHash: defaultPassword,
      fullName: 'Administrador Principal',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phone: '+573001234567',
    },
    {
      email: 'julio@garroterosapp.com',
      passwordHash: defaultPassword,
      fullName: 'Julio Guía Piedecuesta',
      role: UserRole.GUIDE,
      status: UserStatus.ACTIVE,
      phone: '+573007654321',
    },
    {
      email: 'mayerly@garroterosapp.com',
      passwordHash: defaultPassword,
      fullName: 'Mayerly Guía Piedecuesta',
      role: UserRole.GUIDE,
      status: UserStatus.ACTIVE,
      phone: '+573109876543',
    },
    {
      email: 'daniel@garroterosapp.com',
      passwordHash: defaultPassword,
      fullName: 'Daniel Guía Piedecuesta',
      role: UserRole.GUIDE,
      status: UserStatus.ACTIVE,
      phone: '+573106552799',
    },
  ];

  for (const userData of initialUsers) {
    const existingUser = await userRepository.findOne({ where: { email: userData.email } });
    if (!existingUser) {
      const newUser = userRepository.create(userData);
      await userRepository.save(newUser);
      logger.log(`[SEEDER] Usuario creado: ${userData.email} (${userData.role})`);
    } else {
      logger.log(`[SEEDER] El usuario ya existe: ${userData.email}`);
    }
  }
}