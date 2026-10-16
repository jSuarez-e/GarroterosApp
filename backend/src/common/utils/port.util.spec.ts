/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para la utilidad resolveApplicationPort.
 * [I/O]: Evalua escenarios de puertos validos, prefijados, fuera de rango o corruptos.
 * [Edge Cases]: Cadenas 'PORT=10000', ':8080', valores no numericos, 0 y superiores a 65535.
 */

import { describe, it, expect } from 'vitest';
import { resolveApplicationPort } from './port.util.js';

describe('resolveApplicationPort', () => {
  it('deberia retornar 3000 si el valor es undefined', () => {
    expect(resolveApplicationPort(undefined)).toBe(3000);
  });

  it('deberia retornar 3000 si el valor es una cadena vacia', () => {
    expect(resolveApplicationPort('')).toBe(3000);
  });

  it('deberia retornar el puerto numerico si viene como cadena limpia', () => {
    expect(resolveApplicationPort('10000')).toBe(10000);
    expect(resolveApplicationPort('8080')).toBe(8080);
  });

  it('deberia extraer el numero si viene con prefijo como PORT=10000', () => {
    expect(resolveApplicationPort('PORT=10000')).toBe(10000);
  });

  it('deberia extraer el numero si viene con dos puntos como :5000', () => {
    expect(resolveApplicationPort(':5000')).toBe(5000);
  });

  it('deberia tolerar espacios en blanco alrededor', () => {
    expect(resolveApplicationPort('  10000  ')).toBe(10000);
  });

  it('deberia retornar 3000 si no contiene digitos numericos', () => {
    expect(resolveApplicationPort('invalid_port')).toBe(3000);
    expect(resolveApplicationPort('$PORT')).toBe(3000);
  });

  it('deberia retornar 3000 si el puerto esta fuera de rango (< 1 o > 65535)', () => {
    expect(resolveApplicationPort('0')).toBe(3000);
    expect(resolveApplicationPort('70000')).toBe(3000);
  });
});
