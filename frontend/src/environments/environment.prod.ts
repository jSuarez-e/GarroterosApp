/**
 * @sdd
 * [Objetivo]: Parametros de configuracion y endpoints base para el entorno de produccion y empaquetado movil.
 * [I/O]: Exporta objeto inmutable con flags production (true), apiUrl ('http://localhost:3000/api/v1') y wsUrl.
 * [Edge Cases]: Reemplaza de forma estatica el modulo environment.ts durante el build con ng build --configuration production.
 */

export const environment = {
  production: true,
  apiUrl: 'http://localhost:3000/api/v1',
  wsUrl: 'http://localhost:3000',
};
