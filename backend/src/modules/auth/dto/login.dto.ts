/**
 * @sdd
 * [Objetivo]: DTO de validacion estricta para el inicio de sesion (SDD-002-AUTH-RBAC).
 * [I/O]: Entrada: email (RFC 5322) y password (minimo 6 caracteres).
 * [Edge Cases]: Rechaza payloads maliciosos, tipos no string o campos adicionales antes de llegar a la logica de negocio.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Data Transfer Object para credenciales de inicio de sesion.
 */
export class LoginDto {
  /**
   *
   */
  @ApiProperty({
    description: 'Correo electronico del usuario (RFC 5322)',
    example: 'admin@guianza.com',
  })
  @IsEmail({}, { message: 'El formato del correo electronico es invalido' })
  @IsNotEmpty({ message: 'El correo electronico es obligatorio' })
  @IsString({ message: 'El correo electronico debe ser una cadena de texto' })
  email!: string;

  /**
   *
   */
  @ApiProperty({
    description: 'Contraseña del usuario (minimo 6 caracteres)',
    example: 'Guianza2026!',
    minLength: 6,
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;
}
