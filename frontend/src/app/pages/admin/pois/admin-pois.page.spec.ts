/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para AdminPoisPage validando inicialización, filtrado por ruta y carga automática de coordenadas GPS (SDD-005).
 * [I/O]: Mocks de AdminService y Geolocation plugin.
 * [Edge Cases]: Fallback de geolocalización, sincronización de puntero en el mapa y captura de errores sin crashing.
 */

// frontend/src/app/pages/admin/pois/admin-pois.page.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminPoisPage } from './admin-pois.page';
import { AdminService, AdminPoi } from '../../../core/services/admin.service';
import { Geolocation, type Position } from '@capacitor/geolocation';

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCurrentPosition: vi.fn(),
  },
}));

describe('AdminPoisPage', () => {
  let component: AdminPoisPage;
  let fixture: ComponentFixture<AdminPoisPage>;
  let mockAdminService: {
    getPois: ReturnType<typeof vi.fn>;
    createPoi: ReturnType<typeof vi.fn>;
    updatePoi: ReturnType<typeof vi.fn>;
    deletePoi: ReturnType<typeof vi.fn>;
  };

  const samplePois: AdminPoi[] = [
    {
      id: 'poi-1',
      title: 'Ermita La Asunción',
      description: 'Punto histórico religioso.',
      orderIndex: 1,
      latitude: 6.9877,
      longitude: -73.0501,
      photoUrls: ['https://example.com/photo.jpg'],
      audioUrl: null,
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    mockAdminService = {
      getPois: vi.fn().mockReturnValue(of(samplePois)),
      createPoi: vi.fn().mockReturnValue(of(samplePois[0])),
      updatePoi: vi.fn().mockReturnValue(of(samplePois[0])),
      deletePoi: vi.fn().mockReturnValue(of({ success: true })),
    };

    await TestBed.configureTestingModule({
      imports: [AdminPoisPage],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AdminService, useValue: mockAdminService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPoisPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente e inicializar el catálogo de POIs', () => {
    expect(component).toBeTruthy();
    expect(mockAdminService.getPois).toHaveBeenCalled();
    expect(component.pois().length).toBe(1);
    expect(component.pois()[0].title).toBe('Ermita La Asunción');
  });

  it('debe inicializar el formulario de creación con valores por defecto al abrir el modal', () => {
    component.openCreateModal();

    expect(component.isModalOpen()).toBe(true);
    expect(component.editingPoi()).toBeNull();
    expect(component.formLatitude()).toBe(6.9877);
    expect(component.formLongitude()).toBe(-73.0501);
  });

  it('debe capturar y cargar automáticamente las coordenadas GPS del dispositivo con éxito', async () => {
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue({
      coords: {
        latitude: 6.991234,
        longitude: -73.055678,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as Position);

    await component.loadCurrentGpsLocation();

    expect(component.formLatitude()).toBe(6.991234);
    expect(component.formLongitude()).toBe(-73.055678);
    expect(component.showToast()).toBe(true);
    expect(component.toastMessage()).toContain('Ubicación GPS obtenida y fijada');
  });

  it('debe manejar errores de permisos GPS de manera resiliente sin lanzar excepciones', async () => {
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue(new Error('Permission denied'));

    await component.loadCurrentGpsLocation();

    expect(component.showToast()).toBe(true);
    expect(component.toastMessage()).toContain('No fue posible obtener la ubicación GPS');
    expect(component.isLocatingGps()).toBe(false);
  });

  describe('isGoogleDriveFolder', () => {
    it('debe detectar correctamente URLs de carpetas de Google Drive', () => {
      const folderUrl1 = 'https://drive.google.com/drive/u/0/folders/1WZbljAhtIhQJ1uiKcHGLgqGSKR0uytaw';
      const folderUrl2 = 'https://drive.google.com/drive/folders/1WZbljAhtIhQJ1uiKcHGLgqGSKR0uytaw';

      expect(component.isGoogleDriveFolder(folderUrl1)).toBe(true);
      expect(component.isGoogleDriveFolder(folderUrl2)).toBe(true);
    });

    it('no debe marcar como carpeta los enlaces a archivos específicos de Google Drive ni URLs estándar', () => {
      const fileUrl = 'https://drive.google.com/file/d/1WkvoRKw0sA0MESL9RUlS-KdnLKhENx27/view';
      const audioUrl = 'https://example.com/audio.ogg';

      expect(component.isGoogleDriveFolder(fileUrl)).toBe(false);
      expect(component.isGoogleDriveFolder(audioUrl)).toBe(false);
      expect(component.isGoogleDriveFolder('')).toBe(false);
      expect(component.isGoogleDriveFolder(null)).toBe(false);
    });

    it('debe bloquear el guardado en onSavePoi si la URL de audio corresponde a una carpeta', () => {
      component.formTitle.set('Parque La Libertad');
      component.formDescription.set('Centro histórico.');
      component.formAudioUrl.set('https://drive.google.com/drive/u/0/folders/1WZbljAhtIhQJ1uiKcHGLgqGSKR0uytaw');

      component.onSavePoi();

      expect(mockAdminService.createPoi).not.toHaveBeenCalled();
      expect(component.showToast()).toBe(true);
      expect(component.toastMessage()).toContain('corresponde a una carpeta de Google Drive');
    });
  });
});
