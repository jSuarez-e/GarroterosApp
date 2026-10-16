/**
 * @sdd
 * [Objetivo]: Script CLI para ejecucion directa de sentencias SQL en el Knowledge Graph SQLite (docs/brain.sqlite).
 * [I/O]: Lee scripts/init-brain.sql y ejecuta consultas multiples mediante db.exec() sobre la base de datos central.
 * [Edge Cases]: Valida la existencia del archivo SQL, captura excepciones de ejecucion y garantiza el cierre seguro de db.
 */

// scripts/run-brain.mjs
import fs from 'fs';
import Database from 'better-sqlite3';

const DB_PATH = './docs/brain.sqlite';
const QUERY_FILE = './scripts/init-brain.sql';

if (!fs.existsSync(QUERY_FILE)) {
    console.error('❌ Crea un archivo llamado "init-brain.sql" en la carpeta scripts/ y pega ahí tu SQL.');
    process.exit(1);
}

const db = new Database(DB_PATH);
const sql = fs.readFileSync(QUERY_FILE, 'utf8');

try {
    // Usamos exec() para permitir múltiples sentencias (múltiples INSERTs)
    db.exec(sql);
    console.log('✅ Conocimiento inyectado/consultado en el cerebro con éxito.');
} catch (error) {
    console.error('❌ Error ejecutando la consulta:', error.message);
} finally {
    db.close();
}