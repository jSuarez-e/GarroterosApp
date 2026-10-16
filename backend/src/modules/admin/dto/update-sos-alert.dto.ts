/**
 * @sdd
 * [Objetivo]: DTO de validacion para actualizar el estado de una alerta SOS y registrar la nota del suceso (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Valida status (SosAlertStatus) y resolutionNote (string no vacio, min 3 caracteres).
 * [Edge Cases]: Rechaza cadenas vacias o estados no admitidos por el enum.
 */

// backend/src/modules/admin/dto/update-sos-alert.dto.ts

import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SosAlertStatus } from '../entities/sos-alert.entity.js';

/**
 * DTO para la actualizacion del estado y nota de una alerta SOS.
 */
export class UpdateSosAlertDto {
  /**
   * Nuevo estado asignado a la alerta.
   */
  @ApiProperty({
    enum: SosAlertStatus,
    description: 'Nuevo estado de la alerta SOS',
    example: SosAlertStatus.RESOLVED,
  })
  @IsEnum(SosAlertStatus)
  @IsNotEmpty()
  status: SosAlertStatus;

  /**
   * Nota o bitacora explicativa del suceso al gestionar o cancelar la notificacion.
   */
  @ApiProperty({
    description: 'Nota u observacion del suceso al gestionar o cancelar la alerta',
    example: 'Se contacto al senderista, sufrio un tropiezo leve. Ya se encuentra con el guia Carlos.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  resolutionNote: string;
}
