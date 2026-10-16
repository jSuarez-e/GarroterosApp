/**
 * @sdd
 * [Objetivo]: Indexar de forma estructural (sin LLM) el codigo del monorepo en docs/brain.sqlite:
 *   nodos (knowledge_nodes), relaciones de importacion (knowledge_edges) y poda de archivos inexistentes.
 * [I/O]: Lee TARGET_DIRS; escribe docs/brain.sqlite. Uso: `npm run brain:sync`. Sale con codigo 1 si falla.
 * [Edge Cases]: Migra el esquema antiguo (name UNIQUE) a UNIQUE(file_path); omite archivos sin cambios por hash;
 *   elimina nodos cuyo archivo ya no existe; dominio por primer segmento del path (no por substring).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';

const DB_PATH = './docs/brain.sqlite';
const TARGET_DIRS = ['./frontend/src', './backend/src', './shared', './mobile-plugins'];
const FILE_REGEX = /\.(ts|tsx|css|scss|html|java|kt|cs|py)$/;
const SKIP_FILE_REGEX = /\.(spec\.ts|d\.ts)$/;

const db = new Database(DB_PATH);

const CREATE_NODES = `
  CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_nodes_name ON knowledge_nodes (name);
  CREATE TABLE IF NOT EXISTS knowledge_edges (
    source_id INTEGER,
    target_id INTEGER,
    relation_type TEXT NOT NULL,
    PRIMARY KEY (source_id, target_id, relation_type),
    FOREIGN KEY (source_id) REFERENCES knowledge_nodes (id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES knowledge_nodes (id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS adr_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    context TEXT NOT NULL,
    decision TEXT NOT NULL,
    consequences TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

/**
 * Migra el esquema legado (name UNIQUE) a UNIQUE(file_path), descartando nodos obsoletos.
 * @returns {void}
 */
function migrateSchema() {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'knowledge_nodes'").get();
  if (row && /name\s+(?:TEXT|VARCHAR\(\d+\))\s+(?:NOT NULL\s+)?UNIQUE/i.test(row.sql)) {
    console.log('🔧 Migrando esquema legado (name UNIQUE -> file_path UNIQUE)...');
    db.exec('DROP TABLE IF EXISTS knowledge_edges; DROP TABLE knowledge_nodes;');
  }
  db.exec(CREATE_NODES);
}

/**
 * Calcula el hash SHA-256 de un contenido.
 * @param {string} content Contenido del archivo.
 * @returns {string} Hash hexadecimal.
 */
function getFileHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Deduce el dominio por el primer segmento de la ruta.
 * @param {string} normalizedPath Ruta relativa con separador '/'.
 * @returns {string} Dominio.
 */
function getDomain(normalizedPath) {
  const first = normalizedPath.replace(/^\.\//, '').split('/')[0];
  if (first === 'frontend') return 'Frontend';
  if (first === 'backend') return 'Backend';
  if (first === 'mobile-plugins') return 'Mobile';
  return 'Shared';
}

/**
 * Deduce el tipo de artefacto por el nombre de archivo.
 * @param {string} fileName Nombre del archivo.
 * @returns {string} Tipo.
 */
function getType(fileName) {
  const map = [
    ['.service.', 'Service'], ['.component.', 'Component'], ['.page.', 'Page'], ['.controller.', 'Controller'],
    ['.module.', 'Module'], ['.entity.', 'Entity'], ['.model.', 'Entity'], ['.dto.', 'DTO'],
    ['.guard.', 'Guard'], ['.interceptor.', 'Interceptor'], ['.store.', 'Store'], ['.interface.', 'Interface'],
    ['.pipe.', 'Pipe'], ['.directive.', 'Directive'], ['.middleware.', 'Middleware']
  ];
  const hit = map.find(([token]) => fileName.includes(token));
  if (hit) return hit[1];
  if (/\.(scss|css)$/.test(fileName)) return 'Stylesheet';
  if (fileName.endsWith('.html')) return 'Template';
  return 'Archivo';
}

/**
 * Analiza un archivo localmente para extraer tipo, nombre y descripcion (@sdd o fallback).
 * @param {string} content Contenido.
 * @param {string} fileName Nombre del archivo.
 * @returns {{type: string, name: string, description: string}} Metadatos.
 */
function analyzeFileLocally(content, fileName) {
  const type = getType(fileName);
  const classMatch = content.match(/export\s+(?:default\s+)?(?:abstract\s+)?(?:class|interface|enum|const|type)\s+(\w+)/);
  const name = classMatch ? classMatch[1] : fileName;
  const sddMatch = content.match(/@sdd([\s\S]*?)(?:\*\/|-->)/);
  let description;
  if (sddMatch) {
    description = sddMatch[1]
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .filter((line) => line.length > 0)
      .join('\n');
  } else {
    const imports = [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1].split('/').pop());
    const uniqueImports = [...new Set(imports)].slice(0, 6).join(', ');
    description = `[Objetivo]: ${type} ${name} (sin firma @sdd).\n[I/O]: Dependencias: ${uniqueImports || 'Ninguna'}.\n[Edge Cases]: Indexado estructuralmente.`;
  }
  return { type, name, description };
}

/**
 * Recorre un directorio y devuelve las rutas de los archivos indexables.
 * @param {string} dir Directorio raiz.
 * @returns {string[]} Rutas con separador '/'.
 */
function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else if (FILE_REGEX.test(full) && !SKIP_FILE_REGEX.test(full)) out.push(full.replace(/\\/g, '/'));
  }
  return out;
}

/**
 * Indexa los archivos y poda los nodos cuyo archivo ya no existe.
 * @param {string[]} files Rutas relativas actuales.
 * @returns {number} Cantidad de nodos podados.
 */
function indexFiles(files) {
  const upsert = db.prepare(`
    INSERT INTO knowledge_nodes (domain, type, name, description, file_path, file_hash)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(file_path) DO UPDATE SET domain = excluded.domain, type = excluded.type, name = excluded.name,
      description = excluded.description, file_hash = excluded.file_hash, updated_at = CURRENT_TIMESTAMP
  `);
  const getHash = db.prepare('SELECT file_hash FROM knowledge_nodes WHERE file_path = ?');
  let indexed = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.trim().length === 0) continue;
    const hash = getFileHash(content);
    const existing = getHash.get(file.replace(/^\.\//, ''));
    if (existing && existing.file_hash === hash) continue;
    const meta = analyzeFileLocally(content, path.basename(file));
    const clean = file.replace(/^\.\//, '');
    upsert.run(getDomain(clean), meta.type, meta.name, meta.description, clean, hash);
    indexed++;
  }
  const alive = new Set(files.map((f) => f.replace(/^\.\//, '')));
  const del = db.prepare('DELETE FROM knowledge_nodes WHERE id = ?');
  let pruned = 0;
  for (const row of db.prepare('SELECT id, file_path FROM knowledge_nodes').all()) {
    if (!alive.has(row.file_path)) { del.run(row.id); pruned++; }
  }
  console.log(`⚡ Indexados/actualizados: ${indexed} | 🧹 Podados (archivo inexistente): ${pruned}`);
  return pruned;
}

/**
 * Reconstruye las relaciones CONSUMES a partir de imports relativos entre archivos TypeScript.
 * @param {string[]} files Rutas relativas actuales.
 * @returns {number} Cantidad de aristas creadas.
 */
function rebuildEdges(files) {
  db.exec('DELETE FROM knowledge_edges');
  const idByPath = new Map(db.prepare('SELECT id, file_path FROM knowledge_nodes').all().map((r) => [r.file_path, r.id]));
  const insert = db.prepare('INSERT OR IGNORE INTO knowledge_edges (source_id, target_id, relation_type) VALUES (?, ?, ?)');
  let count = 0;
  for (const file of files.filter((f) => f.endsWith('.ts'))) {
    const clean = file.replace(/^\.\//, '');
    const sourceId = idByPath.get(clean);
    if (!sourceId) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(clean), match[1]));
      const targetId = idByPath.get(`${resolved}.ts`) ?? idByPath.get(`${resolved}/index.ts`);
      if (targetId && targetId !== sourceId) { insert.run(sourceId, targetId, 'CONSUMES'); count++; }
    }
  }
  console.log(`🔗 Relaciones CONSUMES: ${count}`);
  return count;
}

/**
 * Punto de entrada: migra, indexa, poda y reconstruye relaciones en una transaccion.
 * @returns {void}
 */
function main() {
  console.log('🔄 Iniciando sincronizacion estructural del Cerebro...');
  try {
    migrateSchema();
    const files = TARGET_DIRS.filter((d) => fs.existsSync(d)).flatMap((d) => collectFiles(d));
    db.exec('BEGIN TRANSACTION');
    indexFiles(files);
    rebuildEdges(files);
    db.exec('COMMIT');
    const total = db.prepare('SELECT COUNT(*) AS c FROM knowledge_nodes').get().c;
    console.log(`✅ Sincronizacion completada. Nodos totales: ${total}.`);
  } catch (error) {
    if (db.inTransaction) db.exec('ROLLBACK');
    console.error('❌ Error critico durante la sincronizacion:', error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();