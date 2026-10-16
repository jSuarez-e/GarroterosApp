/**
 * @sdd
 * [Objetivo]: Compuerta de calidad determinista que verifica las reglas globales del sistema (antigravityrules.md)
 *   que ESLint/Stylelint no cubren: any, control flow legacy, estilos inline, console.*, subscribe sin limpieza y @sdd.
 * [I/O]: `npm run audit:rules`. Lee frontend/src, backend/src y shared. Imprime violaciones y sale con codigo 1 si hay alguna.
 * [Edge Cases]: Ignora specs, .d.ts, comentarios, logger.ts y backend/src/scripts (CLI seeders); @sdd solo se exige a
 *   archivos .ts nuevos segun git (untracked/added) porque la regla aplica a archivos NUEVOS.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOTS = ['frontend/src', 'backend/src', 'shared'];
const violations = [];

/**
 * Lista recursivamente archivos con las extensiones indicadas.
 * @param {string} dir Directorio.
 * @param {RegExp} regex Filtro de nombre.
 * @returns {string[]} Rutas con '/'.
 */
function walk(dir, regex) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.posix.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(full, regex);
    return regex.test(e.name) ? [full] : [];
  });
}

/**
 * Indica si una linea es un comentario.
 * @param {string} line Linea.
 * @returns {boolean} true si es comentario.
 */
function isComment(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

/**
 * Registra una violacion.
 * @param {string} rule Id de regla.
 * @param {string} file Archivo.
 * @param {number} line Linea (1-based).
 * @param {string} text Texto.
 * @returns {void}
 */
function report(rule, file, line, text) {
  violations.push({ rule, file, line, text: text.trim().slice(0, 100) });
}

const tsFiles = ROOTS.flatMap((r) => walk(r, /\.ts$/)).filter((f) => !/\.(spec|d)\.ts$/.test(f));
const htmlFiles = walk('frontend/src', /\.html$/);

for (const file of tsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const isLogger = file.endsWith('core/utils/logger.ts');
  const isCliScript = file.startsWith('backend/src/scripts/');
  const hasCleanup = /takeUntilDestroyed|takeUntil\(|\.unsubscribe\(|DestroyRef/.test(content);
  lines.forEach((line, i) => {
    if (isComment(line)) return;
    if (/:\s*any\b|\bas any\b|<any>|<any\[\]>|any\[\]/.test(line)) report('NO_ANY', file, i + 1, line);
    if (/\*ng(If|For|Switch)/.test(line) && file.startsWith('frontend')) report('NO_LEGACY_CONTROL_FLOW', file, i + 1, line);
    if (file.startsWith('frontend') && /\sstyle="/.test(line)) report('NO_INLINE_STYLE', file, i + 1, line);
    if (/console\.(log|error|warn|info|debug)\(/.test(line) && !isLogger && !isCliScript) report('NO_RAW_CONSOLE', file, i + 1, line);
    if (/\.subscribe\(/.test(line) && !hasCleanup) report('SUBSCRIBE_WITHOUT_CLEANUP', file, i + 1, line);
  });
}

for (const file of htmlFiles) {
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (/\*ng(If|For|Switch)/.test(line)) report('NO_LEGACY_CONTROL_FLOW', file, i + 1, line);
    if (/\sstyle="/.test(line)) report('NO_INLINE_STYLE', file, i + 1, line);
  });
}

/**
 * Obtiene los .ts nuevos (untracked o añadidos) segun git.
 * @returns {string[]} Rutas.
 */
function newTsFiles() {
  try {
    return execSync('git status --porcelain', { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter((l) => /^(\?\?|A )/.test(l))
      .map((l) => l.slice(3).trim().replace(/\\/g, '/'))
      .filter((f) => f.endsWith('.ts') && !/\.(spec|d)\.ts$/.test(f) && ROOTS.some((r) => f.startsWith(r)));
  } catch {
    return [];
  }
}

for (const file of newTsFiles()) {
  if (fs.existsSync(file) && !/@sdd/.test(fs.readFileSync(file, 'utf8'))) report('NEW_FILE_WITHOUT_SDD', file, 1, 'Falta bloque @sdd');
}

const legacyWithoutSdd = tsFiles.filter((f) => !/@sdd/.test(fs.readFileSync(f, 'utf8'))).length;

if (violations.length === 0) {
  console.log(`✅ audit:rules OK — 0 violaciones. (Informativo: ${legacyWithoutSdd} archivos legacy sin @sdd; solo se exige a archivos nuevos.)`);
} else {
  const byRule = violations.reduce((acc, v) => ({ ...acc, [v.rule]: (acc[v.rule] ?? 0) + 1 }), {});
  violations.forEach((v) => console.log(`❌ [${v.rule}] ${v.file}:${v.line}  ${v.text}`));
  console.log(`\n❌ audit:rules FAILED — ${violations.length} violaciones`, JSON.stringify(byRule));
  process.exit(1);
}
