/**
 * @sdd
 * [Objetivo]: Servicio singleton para control estricto de reproduccion de audio (SDD-004-MAP-MULTIMEDIA-WEATHER).
 * [I/O]: Expone senales reactivas (isPlaying, currentUrl, currentTime, duration) y metodos play, pause, toggle y stop.
 * [Edge Cases]: Impide solapamiento garantizando que solo 1 audio suene a la vez. Libera memoria y detiene streams en navegacion.
 */

import { Injectable, signal, computed, effect } from '@angular/core';

/**
 * Servicio encargado de la gestion centralizada de reproduccion multimedia para POIs y recorridos.
 */
@Injectable({
  providedIn: 'root',
})
export class AudioPlayerService {
  private audioElement: HTMLAudioElement | null = null;

  public isPlaying = signal<boolean>(false);
  public currentUrl = signal<string | null>(null);
  public currentTime = signal<number>(0);
  public duration = signal<number>(0);
  public isLoading = signal<boolean>(false);

  public progress = computed(() => {
    const dur = this.duration();
    if (dur <= 0) return 0;
    return Math.min(1, Math.max(0, this.currentTime() / dur));
  });

  constructor() {
    this.initAudioElement();
  }

  /**
   * Inicializa la instancia única de HTMLAudioElement y sus escuchadores de eventos.
   */
  private initAudioElement(): void {
    if (typeof window === 'undefined') return;

    this.audioElement = new Audio();

    this.audioElement.addEventListener('play', () => {
      this.isPlaying.set(true);
      this.isLoading.set(false);
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPlaying.set(false);
    });

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement) {
        this.currentTime.set(this.audioElement.currentTime);
      }
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      if (this.audioElement) {
        this.duration.set(this.audioElement.duration || 0);
        this.isLoading.set(false);
      }
    });

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying.set(false);
      this.currentTime.set(0);
    });

    this.audioElement.addEventListener('error', () => {
      this.isPlaying.set(false);
      this.isLoading.set(false);
    });

    this.audioElement.addEventListener('waiting', () => {
      this.isLoading.set(true);
    });

    this.audioElement.addEventListener('canplay', () => {
      this.isLoading.set(false);
    });
  }

  /**
   * Reproduce una pista de audio dada su URL. Si ya habia otra sonando, la detiene primero.
   * @param url Direccion URL del archivo de audio a reproducir.
   */
  public play(url: string): void {
    if (!this.audioElement) return;

    if (this.currentUrl() === url && !this.audioElement.paused) {
      return;
    }

    if (this.currentUrl() !== url) {
      this.audioElement.pause();
      this.audioElement.src = url;
      this.currentUrl.set(url);
      this.currentTime.set(0);
      this.duration.set(0);
      this.isLoading.set(true);
      this.audioElement.load();
    }

    this.audioElement
      .play()
      .catch((err) => {
        // Puede ocurrir si el navegador bloquea autoplay sin gesto de usuario
        this.isPlaying.set(false);
        this.isLoading.set(false);
      });
  }

  /**
   * Pausa la reproduccion actual sin descartar el progreso.
   */
  public pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.isPlaying.set(false);
    }
  }

  /**
   * Alterna entre reproduccion y pausa para una URL especifica.
   * @param url Direccion URL del audio.
   */
  public toggle(url: string): void {
    if (this.currentUrl() === url && this.isPlaying()) {
      this.pause();
    } else {
      this.play(url);
    }
  }

  /**
   * Detiene por completo la reproduccion y libera los recursos del buffer.
   */
  public stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.removeAttribute('src');
      this.audioElement.load();
    }
    this.isPlaying.set(false);
    this.currentUrl.set(null);
    this.currentTime.set(0);
    this.duration.set(0);
    this.isLoading.set(false);
  }

  /**
   * Desplaza la posicion de reproduccion al segundo indicado.
   * @param seconds Tiempo en segundos hacia el que avanzar o retroceder.
   */
  public seek(seconds: number): void {
    if (this.audioElement && this.duration() > 0) {
      this.audioElement.currentTime = Math.max(0, Math.min(seconds, this.duration()));
      this.currentTime.set(this.audioElement.currentTime);
    }
  }
}
