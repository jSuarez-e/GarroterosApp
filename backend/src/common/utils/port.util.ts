/**
 * @sdd
 * [Objetivo]: Utilidad para resolucion y saneamiento seguro del puerto de escucha HTTP en despliegues cloud (Render / local).
 * [I/O]: Recibe variable rawPort (string | undefined), retorna puerto numerico validado en rango 1-65535 con fallback a 3000.
 * [Edge Cases]: Cadenas malformadas ('PORT=10000', ':10000', 'NaN', vacias o no numericas).
 */

/**
 * Parsea y valida el puerto de enlace HTTP asegurando que se encuentre dentro del rango valido (1 a 65535).
 * Resuelve cualquier formato anomal proveniente de variables de entorno (ej. 'PORT=10000', espacios o cadenas no numericas).
 * @param rawPort Valor crudo de la variable de entorno PORT.
 * @returns Puerto entero garantizado entre 1 y 65535, con fallback predeterminado a 3000.
 */
export function resolveApplicationPort(rawPort: string | undefined): number {
  if (!rawPort || typeof rawPort !== 'string') {
    return 3000;
  }

  // Extraer cualquier secuencia de digitos numericos si viene con prefijos como 'PORT=' o ':'
  const numericMatch = rawPort.match(/\d+/);
  if (!numericMatch) {
    return 3000;
  }

  const parsedPort = Number.parseInt(numericMatch[0], 10);
  if (Number.isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    return 3000;
  }

  return parsedPort;
}
