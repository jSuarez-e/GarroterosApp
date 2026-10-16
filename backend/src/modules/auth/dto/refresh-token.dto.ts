/**
 * @sdd
 * [Objetivo]: DTO de validacion para la renovacion silenciosa de tokens JWT (SDD-002-AUTH-RBAC / SDD-005).
 * [I/O]: Entrada: refreshToken (string no vacio).
 * [Edge Cases]: Rechazo de tokens vacios o estructuras no string mediante ValidationPipe.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Data Transfer Object para solicitar renovacion de credenciales con refresh token.
 */
export class RefreshTokenDto {
  /**
   * Token JWT de larga duracion emitido previamente.
   */
  @ApiProperty({
    description: 'Refresh token JWT emitido previamente para renovacion silenciosa',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'El refresh token debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El refresh token es obligatorio' })
  refreshToken!: string;
}
