/**
 * @sdd
 * [Objetivo]: Parametros de configuracion y endpoints base para el entorno de desarrollo local frontend.
 * [I/O]: Exporta objeto inmutable con flags production (false), apiUrl ('http://localhost:3000/api/v1') y wsUrl.
 * [Edge Cases]: Reemplazado durante compilaciones productivas mediante la directiva fileReplacements en angular.json.
 */

// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  wsUrl: 'http://localhost:3000',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
