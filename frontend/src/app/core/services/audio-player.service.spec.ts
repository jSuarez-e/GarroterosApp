/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para AudioPlayerService verificando inicialización, normalización de URLs de Google Drive y ciclo de reproducción.
 * [I/O]: HTMLAudioElement mock, señales reactivas (isPlaying, currentUrl, progress).
 * [Edge Cases]: Normalización de URLs de Drive con /file/d/ o ?id=, manejo de errores de reproducción sin romper estado.
 */

// frontend/src/app/core/services/audio-player.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioPlayerService } from './audio-player.service';
import { environment } from '../../../environments/environment';

describe('AudioPlayerService', () => {
  let service: AudioPlayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AudioPlayerService],
    });
    service = TestBed.inject(AudioPlayerService);
  });

  it('debe crearse correctamente e inicializar el estado inactivo', () => {
    expect(service).toBeTruthy();
    expect(service.isPlaying()).toBe(false);
    expect(service.currentUrl()).toBeNull();
    expect(service.currentTime()).toBe(0);
    expect(service.duration()).toBe(0);
    expect(service.progress()).toBe(0);
  });

  describe('normalizeAudioUrl', () => {
    it('debe entregar data URI inmediata para enlaces de Google Drive precargados offline', () => {
      const driveViewUrl = 'https://drive.google.com/file/d/1WkvoRKw0sA0MESL9RUlS-KdnLKhENx27/view?usp=sharing';
      const result = service.normalizeAudioUrl(driveViewUrl);

      expect(result).toMatch(/^data:audio\/ogg;base64,/);
    });

    it('debe entregar data URI inmediata para enlaces de Google Drive directos de export=download', () => {
      const driveDirectUrl = 'https://drive.google.com/uc?export=download&id=1WkvoRKw0sA0MESL9RUlS-KdnLKhENx27';
      const result = service.normalizeAudioUrl(driveDirectUrl);

      expect(result).toMatch(/^data:audio\/ogg;base64,/);
    });

    it('debe entregar data URI inmediata para identificadores alfanuméricos puros precargados', () => {
      const rawId = '1WkvoRKw0sA0MESL9RUlS-KdnLKhENx27';
      const result = service.normalizeAudioUrl(rawId);

      expect(result).toMatch(/^data:audio\/ogg;base64,/);
    });

    it('debe entregar data URI inmediata para nombres de archivo de audio precargados', () => {
      const fileName = 'audio_parquelalibertad.ogg';
      const result = service.normalizeAudioUrl(fileName);

      expect(result).toMatch(/^data:audio\/ogg;base64,/);
    });

    it('debe enrutar al endpoint de streaming del backend para IDs de Google Drive no precargados', () => {
      const unknownDriveUrl = 'https://drive.google.com/file/d/1abcdef1234567890abcdef12345/view';
      const expected = `${environment.apiUrl}/routes/audio-stream?driveId=1abcdef1234567890abcdef12345`;

      expect(service.normalizeAudioUrl(unknownDriveUrl)).toBe(expected);
    });

    it('debe resolver rutas relativas que comienzan con /api/v1', () => {
      const relativePath = '/api/v1/routes/audio-stream?driveId=custom-id-123';
      const expected = `${environment.apiUrl}/routes/audio-stream?driveId=custom-id-123`;

      expect(service.normalizeAudioUrl(relativePath)).toBe(expected);
    });

    it('debe mantener intactas URLs de audio estándar como MP3/OGG de CDN directa', () => {
      const cdnUrl = 'https://actions.google.com/sounds/v1/ambiences/park_with_birds.ogg';
      expect(service.normalizeAudioUrl(cdnUrl)).toBe(cdnUrl);
    });

    it('debe manejar URLs vacías o nulas de forma segura', () => {
      expect(service.normalizeAudioUrl('')).toBe('');
      expect(service.normalizeAudioUrl(null)).toBe('');
      expect(service.normalizeAudioUrl(undefined)).toBe('');
    });
  });

  describe('isCurrentTrack', () => {
    it('debe identificar correctamente la pista actual tanto por URL original como normalizada', () => {
      const rawUrl = 'https://drive.google.com/uc?export=download&id=1WkvoRKw0sA0MESL9RUlS-KdnLKhENx27';
      service.play(rawUrl);

      expect(service.isCurrentTrack(rawUrl)).toBe(true);
      expect(service.isCurrentTrack('https://drive.google.com/file/d/1WkvoRKw0sA0MESL9RUlS-KdnLKhENx27/view')).toBe(true);
      expect(service.isCurrentTrack('1WkvoRKw0sA0MESL9RUlS-KdnLKhENx27')).toBe(true);
      expect(service.isCurrentTrack('https://drive.google.com/uc?export=download&id=other-id')).toBe(false);
      expect(service.isCurrentTrack(null)).toBe(false);
    });
  });

  it('debe calcular el progreso reactivo según currentTime y duration', () => {
    service.duration.set(100);
    service.currentTime.set(25);
    expect(service.progress()).toBe(0.25);

    service.currentTime.set(100);
    expect(service.progress()).toBe(1);

    service.duration.set(0);
    expect(service.progress()).toBe(0);
  });

  it('debe pausar la reproducción y actualizar la señal isPlaying', () => {
    service.pause();
    expect(service.isPlaying()).toBe(false);
  });

  it('debe reiniciar el estado al invocar stop()', () => {
    service.stop();
    expect(service.isPlaying()).toBe(false);
    expect(service.currentUrl()).toBeNull();
    expect(service.currentNormalizedUrl()).toBeNull();
    expect(service.currentTime()).toBe(0);
    expect(service.duration()).toBe(0);
  });
});
