/**
 * @sdd
 * [Objetivo]: Configuracion de entorno y polyfills para ejecucion de pruebas unitarias con Vitest/jsdom en el frontend.
 * [I/O]: Simula implementacion de window.matchMedia y MediaQueryList requerida por componentes Ionic (ion-menu, ion-split-pane).
 * [Edge Cases]: Previene TypeErrors en tiempo de ejecucion en entornos headless donde matchMedia no esta provisto nativamente por jsdom.
 */

// Polyfills for running unit tests under jsdom (the default Vitest environment).
// Ionic components such as ion-menu and ion-split-pane query `window.matchMedia`,
// which jsdom does not implement.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
