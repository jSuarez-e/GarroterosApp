/**
 * @sdd
 * [Objetivo]: Parametros de configuracion y endpoints base para despliegue en la nube Render (SDD-006-ANDROID-RELEASE-DISTRIBUTION).
 * [I/O]: Exporta objeto inmutable con flags production (true), apiUrl ('https://garroterosapp-backend.onrender.com/api/v1') y wsUrl ('https://garroterosapp-backend.onrender.com').
 * [Edge Cases]: Utilizado por fileReplacements durante empaquetado de APK apuntando al servicio productivo en la nube.
 */

export const environment = {
  production: true,
  apiUrl: 'https://garroterosapp-backend.onrender.com/api/v1',
  wsUrl: 'https://garroterosapp-backend.onrender.com',
};
