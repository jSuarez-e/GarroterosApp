/**
 * @sdd
 * [Objetivo]: Servicio base de soporte para el controlador raiz de la aplicacion backend NestJS.
 * [I/O]: Expone metodo getHello(). Retorna string de disponibilidad.
 * [Edge Cases]: Operacion stateless y pura sin dependencias externas ni efectos secundarios.
 */

import { Injectable } from '@nestjs/common';

/**
 * Servicio base de la aplicacion backend.
 */
@Injectable()
export class AppService {
  /**
   * Retorna el mensaje de prueba de la aplicacion.
   * @returns Saludo en texto simple.
   */
  getHello(): string {
    return 'Hello World!';
  }
}
