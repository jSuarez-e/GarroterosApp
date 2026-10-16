/**
 * @sdd
 * [Objetivo]: Gestionar y sincronizar dinámicamente perfiles de entorno (Local vs Render) en monorepo GarroterosApp.
 * [I/O]: Lee `.env` o argumentos de línea de comandos ('local' | 'render'); escribe `backend/.env` y `frontend/src/environments/`.
 * [Edge Cases]: Detección automática de IP LAN para pruebas de APK en red física, validación de variables de Render y fallback seguro.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const ROOT_DIR = process.cwd();
const ROOT_ENV_PATH = path.join(ROOT_DIR, '.env');
const ROOT_ENV_EXAMPLE_PATH = path.join(ROOT_DIR, '.env.example');
const BACKEND_ENV_PATH = path.join(ROOT_DIR, 'backend', '.env');
const FRONTEND_ENV_DIR = path.join(ROOT_DIR, 'frontend', 'src', 'environments');

/**
 * Obtiene la dirección IP local de la interfaz de red (IPv4) para pruebas en dispositivos físicos sobre Wi-Fi.
 * @returns {string} Dirección IP LAN o 'localhost'.
 */
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

/**
 * Parsea un archivo de variables de entorno en un mapa clave-valor.
 * @param {string} filePath Ruta del archivo .env.
 * @returns {Record<string, string>} Mapa de variables.
 */
function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

// 1. Cargar variables desde .env raíz (o fallback a backend/.env)
let env = parseEnv(ROOT_ENV_PATH);
if (Object.keys(env).length === 0) {
  env = parseEnv(BACKEND_ENV_PATH);
}

// 2. Determinar modo (argumento CLI > variable APP_MODE > default 'local')
const cliArg = process.argv[2]?.toLowerCase();
const appMode = cliArg === 'render' || cliArg === 'local' ? cliArg : (env.APP_MODE?.toLowerCase() || 'local');

const lanIp = env.LOCAL_LAN_IP || getLanIp();
const renderBackendUrl = env.RENDER_BACKEND_URL || 'https://garroterosapp-backend.onrender.com';
const renderDatabaseUrl = env.RENDER_DATABASE_URL || '';
const renderRedisUrl = env.RENDER_REDIS_URL || '';
const jwtSecret = env.JWT_SECRET || 'super_secret_jwt_key_2026_tour_guide_piedecuesta';
const jwtExpiration = env.JWT_EXPIRATION || '24h';
const corsOrigin = env.CORS_ORIGIN || 'http://localhost:8100,http://localhost:4200,capacitor://localhost,https://localhost,http://localhost';

console.log(`\n======================================================`);
console.log(`🚀 GARROTEROS MONOREPO - CONFIGURADOR DE ENTORNO`);
console.log(`======================================================`);
console.log(`📌 Modo Activo: [${appMode.toUpperCase()}]`);
if (appMode === 'local') {
  console.log(`📡 IP LAN Detectada para APK: http://${lanIp}:3000`);
} else {
  console.log(`☁️ URL Render Cloud: ${renderBackendUrl}`);
}
console.log(`======================================================\n`);

// 3. Sincronizar backend/.env según el modo
let backendEnvContent = '';
if (appMode === 'render') {
  backendEnvContent = `# MODO DE EJECUCION ACTIVO: RENDER (NUBE / PRODUCCION)
APP_MODE=render
NODE_ENV=production
PORT=${process.env.PORT || env.PORT || 10000}

# Database en Render PostgreSQL (SSL requerido)
DATABASE_URL=${renderDatabaseUrl}
DATABASE_SSL=true

# Redis en la Nube
REDIS_URL=${renderRedisUrl}

# Auth
JWT_SECRET=${jwtSecret}
JWT_EXPIRATION=${jwtExpiration}

# CORS
CORS_ORIGIN=${corsOrigin},${renderBackendUrl}
`;
} else {
  backendEnvContent = `# MODO DE EJECUCION ACTIVO: LOCAL (MAQUINA / DOCKER)
APP_MODE=local
NODE_ENV=development
PORT=${env.LOCAL_BACKEND_PORT || 3000}

# Database PostgreSQL Local
DB_HOST=${env.LOCAL_DB_HOST || 'localhost'}
DB_PORT=${env.LOCAL_DB_PORT || 5432}
DB_USER=${env.LOCAL_DB_USER || 'tour_admin'}
DB_PASSWORD=${env.LOCAL_DB_PASSWORD || 'SecretPass2026!'}
DB_NAME=${env.LOCAL_DB_NAME || 'guianza_turistica_db'}

# Redis Local
REDIS_HOST=${env.LOCAL_REDIS_HOST || 'localhost'}
REDIS_PORT=${env.LOCAL_REDIS_PORT || 6379}

# Auth
JWT_SECRET=${jwtSecret}
JWT_EXPIRATION=${jwtExpiration}

# CORS
CORS_ORIGIN=${corsOrigin},http://${lanIp}:8100,http://${lanIp}:3000
`;
}

fs.writeFileSync(BACKEND_ENV_PATH, backendEnvContent, 'utf-8');
console.log(`✅ [Backend] backend/.env actualizado para modo [${appMode}].`);

// 4. Sincronizar frontend/src/environments/
if (!fs.existsSync(FRONTEND_ENV_DIR)) {
  fs.mkdirSync(FRONTEND_ENV_DIR, { recursive: true });
}

// 4.1 environment.render.ts
const renderEnvContent = `/**
 * @sdd
 * [Objetivo]: Parametros de configuracion y endpoints base para despliegue en la nube Render (SDD-006-ANDROID-RELEASE-DISTRIBUTION).
 * [I/O]: Exporta objeto inmutable con flags production (true), apiUrl ('${renderBackendUrl}/api/v1') y wsUrl ('${renderBackendUrl}').
 * [Edge Cases]: Utilizado por fileReplacements durante empaquetado de APK apuntando al servicio productivo en la nube.
 */

export const environment = {
  production: true,
  apiUrl: '${renderBackendUrl}/api/v1',
  wsUrl: '${renderBackendUrl}',
};
`;
fs.writeFileSync(path.join(FRONTEND_ENV_DIR, 'environment.render.ts'), renderEnvContent, 'utf-8');

// 4.2 environment.local.ts
const localEnvContent = `/**
 * @sdd
 * [Objetivo]: Parametros de configuracion y endpoints base para ejecucion local y pruebas en dispositivo movil (SDD-006-ANDROID-RELEASE-DISTRIBUTION).
 * [I/O]: Exporta objeto inmutable con flags production (false), apiUrl ('http://${lanIp}:3000/api/v1') y wsUrl ('http://${lanIp}:3000').
 * [Edge Cases]: Permite reemplazar dinamicamente el host por la IP LAN local para pruebas en emuladores o telefonos fisicos en la misma red.
 */

export const environment = {
  production: false,
  apiUrl: 'http://${lanIp}:3000/api/v1',
  wsUrl: 'http://${lanIp}:3000',
};
`;
fs.writeFileSync(path.join(FRONTEND_ENV_DIR, 'environment.local.ts'), localEnvContent, 'utf-8');

// 4.3 environment.ts (Desarrollo Web estándar)
const devEnvContent = `/**
 * @sdd
 * [Objetivo]: Parametros de configuracion y endpoints base para el entorno de desarrollo local frontend.
 * [I/O]: Exporta objeto inmutable con flags production (false), apiUrl y wsUrl segun el modo activo.
 * [Edge Cases]: Reemplazado durante compilaciones productivas mediante la directiva fileReplacements en angular.json.
 */

export const environment = {
  production: false,
  apiUrl: '${appMode === 'render' ? `${renderBackendUrl}/api/v1` : 'http://localhost:3000/api/v1'}',
  wsUrl: '${appMode === 'render' ? renderBackendUrl : 'http://localhost:3000'}',
};
`;
fs.writeFileSync(path.join(FRONTEND_ENV_DIR, 'environment.ts'), devEnvContent, 'utf-8');

// 4.4 environment.prod.ts (Configuración que compila por defecto en ng build --configuration production / npm run build:apk)
const targetProdApi = appMode === 'render' ? `${renderBackendUrl}/api/v1` : `http://${lanIp}:3000/api/v1`;
const targetProdWs = appMode === 'render' ? renderBackendUrl : `http://${lanIp}:3000`;

const prodEnvContent = `/**
 * @sdd
 * [Objetivo]: Parametros de configuracion y endpoints base para el entorno de produccion y empaquetado movil (${appMode.toUpperCase()}).
 * [I/O]: Exporta objeto inmutable con flags production (true), apiUrl ('${targetProdApi}') y wsUrl ('${targetProdWs}').
 * [Edge Cases]: Reemplaza de forma estatica el modulo environment.ts durante el build con ng build --configuration production.
 */

export const environment = {
  production: true,
  apiUrl: '${targetProdApi}',
  wsUrl: '${targetProdWs}',
};
`;
fs.writeFileSync(path.join(FRONTEND_ENV_DIR, 'environment.prod.ts'), prodEnvContent, 'utf-8');

console.log(`✅ [Frontend] environment.prod.ts sincronizado con API: [${targetProdApi}]`);
console.log(`✅ [Frontend] Archivos de entorno actualizados satisfactoriamente.\n`);
