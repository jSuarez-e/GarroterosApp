/**
 * @sdd
 * [Objetivo]: Pantalla de presentacion (SplashScreen) de la aplicacion con animacion de entrada del logo oficial, indicador de progreso y navegacion condicional.
 * [I/O]: Senales reactivas de progreso y estado. Redirige a /home (autenticado) o /login (invitado) tras completar la secuencia.
 * [Edge Cases]: Cancelacion de temporizadores al destruir el componente, salto manual sin esperas (skip), integracion segura con NativeBridgeService.
 */

// frontend/src/app/pages/splash/splash.page.ts

import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonProgressBar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowForwardOutline, compassOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { NativeBridgeService } from '../../core/services/native-bridge.service';

/**
 * Pagina de presentacion SplashScreen para bienvenida de usuarios y precarga de contexto.
 */
@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonIcon,
    IonProgressBar,
  ],
})
export class SplashPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly nativeBridge = inject(NativeBridgeService);

  public readonly progress = signal<number>(0);
  public readonly statusMessage = signal<string>('Iniciando experiencia...');
  public readonly isReady = signal<boolean>(false);

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private hasNavigated = false;

  constructor() {
    addIcons({
      arrowForwardOutline,
      compassOutline,
    });
  }

  /**
   * Inicializa la secuencia de arranque, barra de progreso y liberacion del splash nativo.
   */
  public ngOnInit(): void {
    this.nativeBridge.hideSplashScreen();
    this.startLoadingSequence();
  }

  /**
   * Limpia timers pendientes al salir de la vista.
   */
  public ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Ejecuta la transicion de la barra de progreso y actualiza el mensaje de estado.
   */
  private startLoadingSequence(): void {
    const totalDuration = 2200; // 2.2 segundos
    const stepTime = 50;
    const increment = 1 / (totalDuration / stepTime);

    this.intervalId = setInterval(() => {
      const current = this.progress();
      const next = Math.min(1, current + increment);
      this.progress.set(next);

      if (next < 0.35) {
        this.statusMessage.set('Preparando rutas y senderos de Piedecuesta...');
      } else if (next < 0.7) {
        this.statusMessage.set('Cargando puntos de interés y coordenadas...');
      } else if (next < 0.95) {
        this.statusMessage.set('Sincronizando guías y telemetría...');
      } else {
        this.statusMessage.set('¡Todo listo para la aventura!');
        this.isReady.set(true);
      }

      if (next >= 1) {
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
        setTimeout(() => this.navigateNext(), 250);
      }
    }, stepTime);
  }

  /**
   * Redirige al destino apropiado según el estado de la sesión activa.
   */
  public navigateNext(): void {
    if (this.hasNavigated) {
      return;
    }
    this.hasNavigated = true;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home'], { replaceUrl: true });
    } else {
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }
}
