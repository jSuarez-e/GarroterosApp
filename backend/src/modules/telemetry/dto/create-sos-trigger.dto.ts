/**
 * @sdd
 * [Objetivo]: DTO de validacion para emitir una alerta de emergencia SOS via REST (SDD-003-TELEMETRY-REALTIME & SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Entrada: latitude, longitude, altitude, batteryLevel, message, timestamp. Salida validada para TelemetryController y AdminAlertsService.
 * [Edge Cases]: Coordenadas numericas obligatorias dentro de rangos geograficos validos (-90..90, -180..180), longitud maxima de mensaje de 250 caracteres.
 */

// backend/src/modules/telemetry/dto/create-sos-trigger.dto.ts

import { IsNumber, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para la emision de una alerta de emergencia SOS.
 */
export class CreateSosTriggerDto {
  /**
   * Latitud en grados decimales.
   */
  @ApiProperty({
    description: 'Latitud del incidente en grados decimales',
    example: 6.9877,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  /**
   * Longitud en grados decimales.
   */
  @ApiProperty({
    description: 'Longitud del incidente en grados decimales',
    example: -73.0501,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  /**
   * Altitud sobre el nivel del mar en metros.
   */
  @ApiPropertyOptional({
    description: 'Altitud en metros sobre el nivel del mar',
    example: 1250.5,
  })
  @IsOptional()
  @IsNumber()
  altitude?: number | null;

  /**
   * Nivel de bateria del dispositivo (0-100%).
   */
  @ApiPropertyOptional({
    description: 'Nivel porcentual de bateria del dispositivo (0-100)',
    example: 45,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryLevel?: number | null;

  /**
   * Mensaje explicativo o prioritario de la emergencia.
   */
  @ApiPropertyOptional({
    description: 'Mensaje descriptivo del motivo de la alerta SOS',
    example: '¡EMERGENCIA EN RUTA! Usuario solicita asistencia inmediata.',
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  message?: string;

  /**
   * Timestamp epoch en milisegundos de la captura del evento.
   */
  @ApiPropertyOptional({
    description: 'Timestamp epoch en milisegundos',
    example: 1792138754548,
  })
  @IsOptional()
  @IsNumber()
  timestamp?: number;
}
