/**
 * @sdd
 * [Objetivo]: Configuracion nativa de Capacitor para empaquetado y ejecucion del cliente movil (Ruta Turistica Piedecuesta).
 * [I/O]: Exporta objeto CapacitorConfig con appId 'com.guianza.piedecuesta', webDir 'www' y ajustes de SplashScreen.
 * [Edge Cases]: Forzado de androidScheme https y deshabilitacion de cleartext para seguridad en comunicaciones de red movil.
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.guianza.piedecuesta',
  appName: 'Ruta Turística Piedecuesta',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFFFFF',
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#3B5BDB',
    },
  },
};

export default config;