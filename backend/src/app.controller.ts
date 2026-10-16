/**
 * @sdd
 * [Objetivo]: Controlador raiz de la aplicacion backend NestJS para sondeo de salud y estado operativo basico.
 * [I/O]: Expone GET /api/v1/ invocando AppService.getHello(). Retorna string de saludo/disponibilidad.
 * [Edge Cases]: Operacion no autenticada para verificacion de disponibilidad y health check de infraestructura.
 */

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

/**
 * Controlador principal de verificacion de estado de la API.
 */
@Controller()
export class AppController {
  /**
   * Crea una instancia de AppController.
   * @param appService Servicio principal de aplicacion.
   */
  constructor(private readonly appService: AppService) {}

  /**
   * Endpoint de bienvenida y prueba de vida de la aplicacion.
   * @returns Saludo en formato texto simple.
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
