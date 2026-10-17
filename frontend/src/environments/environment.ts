/**
 * @sdd
 * [Objetivo]: Parametros de configuracion y endpoints base para el entorno de desarrollo local frontend.
 * [I/O]: Exporta objeto inmutable con flags production (false), apiUrl y wsUrl segun el modo activo.
 * [Edge Cases]: Reemplazado durante compilaciones productivas mediante la directiva fileReplacements en angular.json.
 */

export const environment = {
  production: false,
  // apiUrl: 'http://localhost:3000/api/v1',
  // wsUrl: 'http://localhost:3000',
  apiUrl: 'https://garroterosapp.onrender.com/api/v1',
  wsUrl: 'https://garroterosapp.onrender.com',
};
