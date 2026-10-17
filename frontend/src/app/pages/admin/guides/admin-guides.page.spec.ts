/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para AdminGuidesPage validando registro de guías con credenciales de acceso inicial (SDD-005).
 * [I/O]: Mocks de GuidesService y RoutesService.
 * [Edge Cases]: Validación de contraseña inicial en creación, carga de rutas y filtrado reactivo.
 */

// frontend/src/app/pages/admin/guides/admin-guides.page.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { AdminGuidesPage } from './admin-guides.page';
import { GuidesService } from '../../../core/services/guides.service';
import { RoutesService } from '../../../core/services/routes.service';
import type { IGuideProfile, RouteEntityDto } from '../../../../../../shared/src/index';

describe('AdminGuidesPage', () => {
  let component: AdminGuidesPage;
  let fixture: ComponentFixture<AdminGuidesPage>;
  let mockGuidesService: {
    getAllGuides: ReturnType<typeof vi.fn>;
    createGuide: ReturnType<typeof vi.fn>;
    updateGuide: ReturnType<typeof vi.fn>;
    deleteGuide: ReturnType<typeof vi.fn>;
  };
  let mockRoutesService: {
    getAllRoutes: ReturnType<typeof vi.fn>;
  };

  const sampleGuide: IGuideProfile = {
    id: 'guide-1',
    fullName: 'Julio Carrillo',
    email: 'julio@garroterosapp.com',
    phone: '+573007654321',
    avatarUrl: null,
    bio: 'Historiador líder.',
    certifications: ['SENA Guianza Turística'],
    rating: 4.9,
    experienceYears: 8,
    assignedTour: 'Ruta Histórica',
    status: 'ACTIVE',
    userId: 'user-guide-1',
    routes: [{ id: 'route-1', name: 'Ruta de los Garroteros' }],
  };

  const sampleRoutes: RouteEntityDto[] = [
    {
      id: 'route-1',
      name: 'Ruta de los Garroteros',
      municipality: 'Piedecuesta',
      description: 'Sendero oficial',
      totalDistanceKm: 6,
      estimatedDurationMinutes: 120,
      coordinates: [[-73.0, 7.0]],
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  beforeEach(async () => {
    mockGuidesService = {
      getAllGuides: vi.fn().mockReturnValue(of([sampleGuide])),
      createGuide: vi.fn().mockReturnValue(of(sampleGuide)),
      updateGuide: vi.fn().mockReturnValue(of(sampleGuide)),
      deleteGuide: vi.fn().mockReturnValue(of({ success: true })),
    };

    mockRoutesService = {
      getAllRoutes: vi.fn().mockReturnValue(of(sampleRoutes)),
    };

    await TestBed.configureTestingModule({
      imports: [AdminGuidesPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: GuidesService, useValue: mockGuidesService },
        { provide: RoutesService, useValue: mockRoutesService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminGuidesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente e inicializar el catálogo de guías', () => {
    expect(component).toBeTruthy();
    expect(mockGuidesService.getAllGuides).toHaveBeenCalled();
    expect(component.guides()).toHaveLength(1);
    expect(component.guides()[0].fullName).toBe('Julio Carrillo');
  });

  it('debe inicializar el formulario de creación con la contraseña de acceso por defecto', () => {
    component.openCreateModal();
    expect(component.editingGuideId()).toBeNull();
    expect(component.isModalOpen()).toBe(true);
    expect(component.formPassword).toBe('Guia2026*');
  });

  it('debe enviar initialPassword al crear un nuevo guía', () => {
    component.openCreateModal();
    component.formFullName = 'Nuevo Guía';
    component.formEmail = 'nuevo@guianza.com';
    component.formPhone = '+573151234567';
    component.formPassword = 'MiPasswordPersonalizada123*';

    component.onSaveGuide();

    expect(mockGuidesService.createGuide).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Nuevo Guía',
        email: 'nuevo@guianza.com',
        phone: '+573151234567',
        initialPassword: 'MiPasswordPersonalizada123*',
      }),
    );
  });
});
