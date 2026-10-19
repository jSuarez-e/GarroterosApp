/**
 * @sdd
 * [Objetivo]: Servicio singleton para control estricto de reproduccion de audio (SDD-004-MAP-MULTIMEDIA-WEATHER).
 * [I/O]: Expone senales reactivas (isPlaying, currentUrl, currentTime, duration) y metodos play, pause, toggle y stop.
 * [Edge Cases]: Impide solapamiento garantizando que solo 1 audio suene a la vez. Libera memoria y detiene streams en navegacion.
 */

import { Injectable, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';
import { POI_OFFLINE_AUDIOS } from '../constants/poi-audios';

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
  public currentNormalizedUrl = signal<string | null>(null);
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
        if (this.duration() === 0) {
          const dur = this.audioElement.duration;
          if (dur && !isNaN(dur) && isFinite(dur)) {
            this.duration.set(dur);
          }
        }
      }
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      if (this.audioElement) {
        const dur = this.audioElement.duration;
        if (dur && !isNaN(dur) && isFinite(dur)) {
          this.duration.set(dur);
        }
        this.isLoading.set(false);
      }
    });

    this.audioElement.addEventListener('durationchange', () => {
      if (this.audioElement) {
        const dur = this.audioElement.duration;
        if (dur && !isNaN(dur) && isFinite(dur)) {
          this.duration.set(dur);
        }
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
   * Normaliza enlaces de audio, transformando URLs de Google Drive o rutas relativas al endpoint optimizado de streaming o data URIs locales.
   * @param rawUrl URL de audio original ingresada por el usuario o retornada por la API.
   * @returns URL compatible con HTMLAudioElement.
   */
  public normalizeAudioUrl(rawUrl?: string | null): string {
    if (!rawUrl) return '';
    const cleaned = rawUrl.trim();

    // 1. Coincidencia directa con clave de audio precargado offline
    if (POI_OFFLINE_AUDIOS[cleaned]) {
      return POI_OFFLINE_AUDIOS[cleaned];
    }

    // 2. Extraer ID si es un identificador puro o un enlace de Google Drive
    let driveId: string | null = null;
    if (/^[a-zA-Z0-9_-]{25,50}$/.test(cleaned) && !cleaned.includes('/') && !cleaned.includes('.')) {
      driveId = cleaned;
    } else if (
      cleaned.includes('drive.google.com') ||
      cleaned.includes('drive.usercontent.google.com') ||
      cleaned.includes('docs.google.com')
    ) {
      const driveMatch =
        cleaned.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/i) || cleaned.match(/[?&]id=([a-zA-Z0-9_-]{10,})/i);
      if (driveMatch && driveMatch[1]) {
        driveId = driveMatch[1];
      }
    }

    // 3. Si el ID de Google Drive está precargado en offline, entregar data URI inmediata (0ms latencia)
    if (driveId && POI_OFFLINE_AUDIOS[driveId]) {
      return POI_OFFLINE_AUDIOS[driveId];
    }

    // 4. Si ya apunta al endpoint de streaming del backend con URL relativa
    if (cleaned.startsWith('/api/v1')) {
      const baseUrl = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
      return `${baseUrl}${cleaned}`;
    }

    // 5. Si es otro enlace de Google Drive no precargado, enrutar al proxy de streaming del backend
    if (driveId) {
      return `${environment.apiUrl}/routes/audio-stream?driveId=${driveId}`;
    }

    return cleaned;
  }

  /**
   * Determina si la URL o identificador consultado corresponde a la pista actualmente en reproducción o seleccionada.
   * Compara de forma tolerante tanto la URL original como la versión normalizada o data URI.
   * @param candidateUrl URL original o identificador del audio.
   * @returns true si coincide con la pista activa en el reproductor.
   */
  public isCurrentTrack(candidateUrl?: string | null): boolean {
    if (!candidateUrl) return false;
    const curRaw = this.currentUrl();
    const curNorm = this.currentNormalizedUrl();
    if (!curRaw && !curNorm) return false;

    if (candidateUrl === curRaw || candidateUrl === curNorm) {
      return true;
    }

    const norm = this.normalizeAudioUrl(candidateUrl);
    return norm === curNorm || norm === curRaw;
  }

  /**
   * Reproduce una pista de audio dada su URL. Si ya habia otra sonando, la detiene primero.
   * Normaliza automáticamente URLs de Google Drive.
   * @param rawUrl Direccion URL del archivo de audio a reproducir.
   */
  public play(rawUrl: string): void {
    if (!this.audioElement) return;

    const normalizedUrl = this.normalizeAudioUrl(rawUrl);
    if (!normalizedUrl) return;

    if (this.isCurrentTrack(rawUrl) && !this.audioElement.paused) {
      return;
    }

    if (this.currentNormalizedUrl() !== normalizedUrl) {
      this.audioElement.pause();
      this.audioElement.src = normalizedUrl;
      this.currentUrl.set(rawUrl);
      this.currentNormalizedUrl.set(normalizedUrl);
      this.currentTime.set(0);
      this.duration.set(0);
      this.isLoading.set(true);
      this.audioElement.load();
    }

    try {
      const playPromise = this.audioElement.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Puede ocurrir si el navegador bloquea autoplay sin gesto de usuario
          this.isPlaying.set(false);
          this.isLoading.set(false);
        });
      }
    } catch {
      this.isPlaying.set(false);
      this.isLoading.set(false);
    }
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
   * @param rawUrl Direccion URL del audio.
   */
  public toggle(rawUrl: string): void {
    if (this.isCurrentTrack(rawUrl) && this.isPlaying()) {
      this.pause();
    } else {
      this.play(rawUrl);
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
    this.currentNormalizedUrl.set(null);
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
