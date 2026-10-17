/**
 * @sdd
 * [Objetivo]: Parametros de configuracion y endpoints base para el entorno de produccion y empaquetado movil (LOCAL).
 * [I/O]: Exporta objeto inmutable con flags production (true), apiUrl ('http://172.17.208.1:3000/api/v1') y wsUrl ('http://172.17.208.1:3000').
 * [Edge Cases]: Reemplaza de forma estatica el modulo environment.ts durante el build con ng build --configuration production.
 */

export const environment = {
  production: true,
  apiUrl: 'https://garroterosapp.onrender.com/api/v1',
  wsUrl: 'https://garroterosapp.onrender.com',
  // apiUrl: 'http://172.17.208.1:3000/api/v1',
  // wsUrl: 'http://172.17.208.1:3000',
};
