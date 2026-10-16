/**
 * @sdd
 * [Objetivo]: Decorador para asignar roles requeridos a controladores o metodos (SDD-002-AUTH-RBAC).
 * [I/O]: Entrada: lista de UserRole. Salida: Metadato 'roles' inyectado en el Handler/Class.
 * [Edge Cases]: Uso estricto de UserRole evitando strings no tipados.
 */

import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity.js';

export const ROLES_KEY = 'roles';

/**
 * Decorador para restringir acceso segun los roles especificados.
 * @param roles Roles autorizados.
 * @returns CustomDecorator configurado.
 */
export const Roles = (...roles: UserRole[]): CustomDecorator<string> => SetMetadata(ROLES_KEY, roles);
