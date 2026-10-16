/**
 * @sdd
 * [Objetivo]: Registrar una decision arquitectonica (ADR) en docs/brain.sqlite (tabla adr_logs).
 * [I/O]: `npm run brain:adr -- "<titulo>" "<contexto>" "<decision>" "<consecuencias>"`. Escribe adr_logs.
 * [Edge Cases]: Exige 4 argumentos no vacios; consultas parametrizadas; crea la tabla si falta; exit 1 en error.
 */
import Database from 'better-sqlite3';

const [title, context, decision, consequences] = process.argv.slice(2).map((a) => (a ?? '').trim());
if (!title || !context || !decision || !consequences) {
  console.error('❌ Uso: npm run brain:adr -- "<titulo>" "<contexto>" "<decision>" "<consecuencias>"');
  process.exit(1);
}

const db = new Database('./docs/brain.sqlite');
try {
  db.exec(`CREATE TABLE IF NOT EXISTS adr_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, context TEXT NOT NULL,
    decision TEXT NOT NULL, consequences TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  const info = db.prepare('INSERT INTO adr_logs (title, context, decision, consequences) VALUES (?, ?, ?, ?)')
    .run(title, context, decision, consequences);
  console.log(`✅ ADR #${info.lastInsertRowid} registrado: ${title}`);
} catch (error) {
  console.error('❌ Error registrando ADR:', error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
