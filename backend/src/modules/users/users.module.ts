/**
 * @sdd
 * [Objetivo]: Modulo NestJS de usuarios para registro y persistencia.
 * [I/O]: Registra TypeOrmModule.forFeature([User]) y exporta UsersService.
 * [Edge Cases]: Prevencion de dependencias circulares mediante exportacion desacoplada.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

/**
 *
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
