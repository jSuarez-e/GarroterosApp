/**
 * @sdd
 * [Objetivo]: Barril central de exportacion para contratos cross-domain en /shared.
 * [I/O]: Re-exporta contratos de autenticacion y RBAC.
 * [Edge Cases]: Ninguno. Modulo puramente declarativo.
 */

export * from './auth/auth.contract.js';
export * from './telemetry/telemetry.contract.js';
export * from './routes/route.contract.js';
export * from './medical/medical.contract.js';
export * from './guides/guides.contract.js';
export * from './admin/admin.contract.js';
