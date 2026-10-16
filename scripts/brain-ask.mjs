/**
 * @sdd
 * [Objetivo]: Consultar el Cerebro (docs/brain.sqlite) con ranking por relevancia y devolver contexto JSON al agente.
 * [I/O]: `npm run brain:ask "<palabras clave>"`. Lee knowledge_nodes/knowledge_edges (solo lectura). Imprime JSON.
 * [Edge Cases]: Cerebro inexistente -> status empty_project; sin coincidencias -> not_found; descarta nodos cuyo
 *   archivo ya no existe (stale); entrada sin keywords validas -> error exit 1; consulta parametrizada (sin SQLi).
 */
import fs from 'fs';
import Database from 'better-sqlite3';

const DB_PATH = './docs/brain.sqlite';
const LIMIT = 10;
const STOPWORDS = new Set(['para', 'with', 'from', 'that', 'this', 'the', 'una', 'como', 'del', 'los', 'las']);

const rawSearch = process.argv.slice(2).join(' ').trim();
if (rawSearch.length === 0) {
  console.error('❌ ERROR: Debes proporcionar un termino de busqueda. Ej: npm run brain:ask "guide service"');
  process.exit(1);
}

if (!fs.existsSync(DB_PATH)) {
  console.log(JSON.stringify({
    status: 'empty_project',
    message: 'El Cerebro no existe. Ejecuta `npm run brain:sync` para crearlo; puedes disenar desde cero.'
  }, null, 2));
  process.exit(0);
}

const keywords = [...new Set(
  rawSearch.toLowerCase().split(/[^a-z0-9\-_.áéíóúñ]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w))
)];
if (keywords.length === 0) {
  console.error('❌ ERROR: Las palabras clave son demasiado cortas o genericas.');
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

/**
 * Calcula la relevancia de un nodo frente a las keywords.
 * @param {{name: string, file_path: string, description: string}} node Nodo del grafo.
 * @returns {number} Puntaje (mayor = mas relevante).
 */
function score(node) {
  const name = node.name.toLowerCase();
  const filePath = node.file_path.toLowerCase();
  const desc = node.description.toLowerCase();
  return keywords.reduce((acc, k) => {
    let s = acc;
    if (name === k) s += 10;
    else if (name.includes(k)) s += 5;
    if (filePath.includes(k)) s += 3;
    if (desc.includes(k)) s += 1;
    return s;
  }, 0);
}

try {
  const conditions = keywords.map(() => '(LOWER(name) LIKE ? OR LOWER(file_path) LIKE ? OR LOWER(description) LIKE ?)').join(' OR ');
  const params = keywords.flatMap((k) => [`%${k}%`, `%${k}%`, `%${k}%`]);
  const rows = db.prepare(
    `SELECT id, domain, type, name, description, file_path FROM knowledge_nodes WHERE ${conditions}`
  ).all(...params);

  const live = rows.filter((r) => fs.existsSync(r.file_path));
  const stale = rows.length - live.length;
  const ranked = live
    .map((r) => ({ ...r, score: score(r) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, LIMIT);

  const consumers = db.prepare(
    `SELECT n.file_path FROM knowledge_edges e JOIN knowledge_nodes n ON n.id = e.source_id WHERE e.target_id = ? LIMIT 5`
  );
  const dependencies = db.prepare(
    `SELECT n.file_path FROM knowledge_edges e JOIN knowledge_nodes n ON n.id = e.target_id WHERE e.source_id = ? LIMIT 5`
  );

  const items = ranked.map(({ id, ...rest }) => ({
    ...rest,
    consumed_by: consumers.all(id).map((r) => r.file_path),
    depends_on: dependencies.all(id).map((r) => r.file_path)
  }));

  console.log(`\n--- 🧠 CONTEXTO RECUPERADO PARA: "${rawSearch}" ---\n`);
  if (items.length === 0) {
    console.log(JSON.stringify({ status: 'not_found', stale_ignored: stale, message: 'Sin coincidencias. Eres libre de crearlo.' }, null, 2));
  } else {
    console.log(JSON.stringify({ status: 'success', keywords_used: keywords, count: items.length, stale_ignored: stale, items }, null, 2));
  }
  console.log('\n--- FIN DE CONTEXTO ---\n');
} catch (error) {
  console.error('❌ Error al consultar el cerebro:', error.message);
  process.exitCode = 1;
} finally {
  db.close();
}