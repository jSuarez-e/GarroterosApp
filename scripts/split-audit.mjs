/**
 * @sdd
 * [Objetivo]: Script de particionamiento y segmentacion de reportes de auditoria estatica en lotes atomicos ejecutables.
 * [I/O]: Lee docs/audits/eslint-report.json y stylelint-report.json. Genera archivos docs/audits/batches/batch_XX.md.
 * [Edge Cases]: Ignora archivos *.d.ts y bundles de dist/. Retorna estado CLEAN con codigo 0 si no se detectan fallos.
 */

import fs from 'fs';
import path from 'path';

const ESLINT_REPORT = './docs/audits/eslint-report.json';
const STYLELINT_REPORT = './docs/audits/stylelint-report.json';
const OUTPUT_DIR = './docs/audits/batches';
const BATCH_SIZE = 4; // Procesaremos 4 archivos defectuosos por Prompt

// Función auxiliar para procesar un reporte (TypeScript o Estilos)
function loadReport(filePath, reportType) {
  if (!fs.existsSync(filePath)) {
    console.warn(JSON.stringify({ warning: `No se encontró el reporte ${reportType}. Se omitirá.` }));
    return [];
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  const report = JSON.parse(rawData);

  // Normalizar la estructura de los reportes de ESLint y Stylelint
  return report
    .filter(file => {
      const rawPath = file.filePath || file.source || '';
      
      // Normalizamos las barras para que funcione igual en Windows y Unix
      const normalizedPath = rawPath.replace(/\\/g, '/');
      
      // EXCLUSIONES: Ignorar archivos que no deben evaluarse
      // 1. Archivos de declaración de TypeScript (*.d.ts)
      if (normalizedPath.endsWith('.d.ts')) {
        return false;
      }
      
      // 2. Archivos compilados en carpetas dist
      if (normalizedPath.includes('/dist/') || normalizedPath.startsWith('dist/')) {
        return false;
      }

      // Mantener solo archivos que tengan errores o advertencias
      return (file.errorCount > 0 || file.warningCount > 0) || (file.warnings && file.warnings.length > 0);
    })
    .map(file => {
      const rawPath = file.filePath || file.source;
      const relativePath = rawPath && (rawPath.includes('frontend') || rawPath.includes('backend') || rawPath.includes('shared'))
        ? rawPath.match(/(frontend|backend|shared).*/)[0] 
        : rawPath;

      // Unificar mensajes de error/advertencia dependiendo de si es ESLint (messages) o Stylelint (warnings/deprecations)
      const messages = file.messages || file.warnings || [];

      return {
        file: relativePath ? relativePath.replace(/\\/g, '/') : 'unknown',
        errors: messages.map(m => {
          const line = m.line || m.line_number || 1;
          const rule = m.ruleId || m.rule || 'unknown-rule';
          const text = m.text || m.message;
          return `Línea ${line}: [${rule}] ${text}`;
        })
      };
    });
}

// 1. Cargar y combinar ambos reportes
const eslintDefective = loadReport(ESLINT_REPORT, 'ESLint');
const stylelintDefective = loadReport(STYLELINT_REPORT, 'Stylelint');

// Combinar ambas listas de archivos defectuosos
const allDefectiveFiles = [...eslintDefective, ...stylelintDefective];

if (allDefectiveFiles.length === 0) {
  console.log(JSON.stringify({ audit: "PASSED", status: "CLEAN" }));
  process.exit(0);
}

// 2. Limpieza radical del directorio de batches anterior
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// 3. Dividir en lotes (Batches) y generar los Prompts adaptados para TS y CSS (BEM)
let batchCount = 1;
for (let i = 0; i < allDefectiveFiles.length; i += BATCH_SIZE) {
  const batch = allDefectiveFiles.slice(i, i + BATCH_SIZE);
  
  const promptContent = `
# [SYSTEM OVERRIDE: ATOMIC REFACTORING MODE - BATCH ${batchCount}]

**CONTEXTO:**
Actúa como el Ingeniero de Software Lead. Tienes la tarea de resolver las violaciones de código detectadas por ESLint (TypeScript/Lógica) y Stylelint (CSS/SCSS bajo metodología BEM) bajo las reglas estrictas de \`.antigravityrules\`.

**DIRECTIVAS DE EJECUCIÓN:**
1. Resuelve ÚNICAMENTE los errores listados en este lote para cada archivo correspondiente.
2. Si el archivo es TypeScript y el error es \`jsdoc/require-jsdoc\`, genera la documentación JSDoc correcta (\`@param\`, \`@returns\`).
3. Si el error es \`no-explicit-any\`, infiere el tipo correcto o usa \`unknown\`/genéricos.
4. Si el archivo es CSS/SCSS, asegúrate de corregir los selectores o reglas para que cumplan estrictamente con la metodología BEM (\`.block__element--modifier\`) y elimina estilos inline si los hubiera.
5. NO devuelvas el archivo completo. Utiliza \`// ... existing code\` y muestra solo los bloques modificados con su ruta en la primera línea.

**ERRORES A RESOLVER EN ESTE LOTE:**
\`\`\`json
${JSON.stringify(batch, null, 2)}
\`\`\`

**OUTPUT ESPERADO:**
Ejecuta la refactorización para estos archivos y entrégame los bloques de código corregidos.
`.trim();

  fs.writeFileSync(path.join(OUTPUT_DIR, `batch_${batchCount.toString().padStart(2, '0')}.md`), promptContent);
  batchCount++;
}

// Output JSON estricto informando al orquestador que debe lanzar el primer batch
console.log(JSON.stringify({ 
  audit: "FAILED", 
  batches_created: batchCount - 1, 
  next_file_to_process: "docs/audits/batches/batch_01.md" 
}));