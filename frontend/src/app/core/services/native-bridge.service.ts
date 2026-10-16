/**
 * @sdd
 * [Objetivo]: Servicio centralizado para abstraer llamadas nativas de Capacitor (StatusBar, ScreenOrientation).
 * [I/O]: Expone metodos para bloquear orientacion vertical (portrait) y configurar la barra de estado sin solapamiento con la interfaz.
 * [Edge Cases]: Ejecucion condicional segura en plataformas web/navegador, prevencion de excepciones en dispositivos no soportados.
 */

// frontend/src/app/core/services/native-bridge.service.ts

import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ScreenOrientation } from '@capacitor/screen-orientation';

/**
 * Servicio encargado de la orquestación nativa mediante Capacitor, protegiendo las vistas de rotaciones y solapamientos.
 */
@Injectable({
  providedIn: 'root',
})
export class NativeBridgeService {
  /**
   * Inicializa las configuraciones nativas requeridas para la aplicación móvil.
   */
  public async initNativeFeatures(): Promise<void> {
    await Promise.all([
      this.lockPortraitOrientation(),
      this.configureStatusBar(),
    ]);
  }

  /**
   * Bloquea la orientación de la pantalla en modo vertical exclusivamente (Portrait).
   */
  public async lockPortraitOrientation(): Promise<void> {
    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch {
      // Ignorado en plataformas que no admitan bloqueo nativo (ej. navegadores web de escritorio)
    }
  }

  /**
   * Configura la barra de estado nativa para que no se superponga sobre la cabecera (header) de la app.
   * @param overlay Si la barra se superpone al WebView (false para empujar la vista y no taparla).
   * @param backgroundColor Color de fondo oficial del tema cobalto.
   */
  public async configureStatusBar(overlay = false, backgroundColor = '#3B5BDB'): Promise<void> {
    try {
      await StatusBar.setOverlaysWebView({ overlay });
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: backgroundColor });
    } catch {
      // Ignorado en navegadores o entornos donde StatusBar no esté disponible
    }
  }
}
