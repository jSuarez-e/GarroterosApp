/**
 * @sdd
 * [Objetivo]: Configuracion del runner Vitest para suites de pruebas de integracion y End-to-End (E2E) en NestJS.
 * [I/O]: Define resolucion tsconfigPaths, globals: true y patron de inclusion para pruebas e2e-spec.ts.
 * [Edge Cases]: Entorno aislado para pruebas HTTP completas sobre la API con Supertest.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
