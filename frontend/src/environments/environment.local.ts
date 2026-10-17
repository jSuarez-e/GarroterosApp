/**
 * @sdd
 * [Objetivo]: Parametros de configuracion y endpoints base para ejecucion local y pruebas en dispositivo movil (SDD-006-ANDROID-RELEASE-DISTRIBUTION).
 * [I/O]: Exporta objeto inmutable con flags production (false), apiUrl ('http://172.17.208.1:3000/api/v1') y wsUrl ('http://172.17.208.1:3000').
 * [Edge Cases]: Permite reemplazar dinamicamente el host por la IP LAN local para pruebas en emuladores o telefonos fisicos en la misma red.
 */

export const environment = {
  production: false,
  // apiUrl: 'http://172.17.208.1:3000/api/v1',
  // wsUrl: 'http://172.17.208.1:3000',
  apiUrl: 'https://garroterosapp.onrender.com/api/v1',
  wsUrl: 'https://garroterosapp.onrender.com',
};
