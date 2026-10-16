/**
 * @sdd
 * [Objetivo]: Configuracion del runner Vitest para suites de pruebas unitarias en el backend NestJS.
 * [I/O]: Define opciones de resolucion tsconfigPaths, globals: true y patron de inclusion para pruebas unitarias spec.ts.
 * [Edge Cases]: Habilita soporte para paths declarados en tsconfig.json sin requerir pre-compilacion.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
