/**
 * @sdd
 * [Objetivo]: Logger centralizado para el cliente frontend (Angular/Ionic).
 * [I/O]: Metodos estaticos log, info, warn y error.
 * [Edge Cases]: Centraliza la salida a consola cumpliendo con las compuertas de calidad y previniendo logs descontrolados.
 */
export class AppLogger {
  static log(message: string, ...optionalParams: unknown[]): void {
    console.log(message, ...optionalParams);
  }

  static info(message: string, ...optionalParams: unknown[]): void {
    console.info(message, ...optionalParams);
  }

  static warn(message: string, ...optionalParams: unknown[]): void {
    console.warn(message, ...optionalParams);
  }

  static error(message: string, ...optionalParams: unknown[]): void {
    console.error(message, ...optionalParams);
  }
}
