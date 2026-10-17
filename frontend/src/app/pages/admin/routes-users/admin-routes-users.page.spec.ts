/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para AdminRoutesUsersPage validando carga de rutas de guía, filtrado y verificación de asistencia (SDD-005).
 * [I/O]: Mocks de AdminService y AuthService.
 * [Edge Cases]: Rutas vacías, filtros reactivos de confirmación/ficha médica y control modal de emergencia.
 */

// frontend/src/app/pages/admin/routes-users/admin-routes-users.page.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { AdminRoutesUsersPage } from './admin-routes-users.page';
import {
  AdminService,
  type IGuideRouteRoster,
  type IRouteRosterParticipant,
} from '../../../core/services/admin.service';
import { AuthService, UserRole, UserStatus } from '../../../core/services/auth.service';

describe('AdminRoutesUsersPage', () => {
  let component: AdminRoutesUsersPage;
  let fixture: ComponentFixture<AdminRoutesUsersPage>;
  let mockAdminService: {
    getGuideRouteRoster: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    currentUser: ReturnType<typeof vi.fn>;
    isAdmin: ReturnType<typeof vi.fn>;
  };

  const sampleParticipant: IRouteRosterParticipant = {
    userId: 'user-1',
    fullName: 'Ana María López',
    email: 'ana@example.com',
    phone: '3151234567',
    avatarUrl: null,
    photoUrl: 'https://cdn.example.com/ana.jpg',
    attendanceConfirmed: true,
    hasMedicalProfile: true,
    medicalUpdatedAt: '2026-10-17T00:00:00.000Z',
    medicalSummary: {
      bloodType: 'O+',
      allergies: 'Penicilina',
      dietType: 'VEGETARIAN',
      emergencyContactName: 'Pedro López',
      emergencyContactPhone: '3119876543',
      medicalConditions: null,
      medications: null,
      notes: 'Lleva inhalador',
    },
  };

  const samplePendingParticipant: IRouteRosterParticipant = {
    userId: 'user-2',
    fullName: 'Bernardo Gómez',
    email: 'bernardo@example.com',
    phone: '3207654321',
    avatarUrl: null,
    photoUrl: null,
    attendanceConfirmed: false,
    hasMedicalProfile: false,
    medicalUpdatedAt: null,
    medicalSummary: null,
  };

  const sampleRosters: IGuideRouteRoster[] = [
    {
      routeId: 'route-1',
      routeName: 'Camino Real a Umpalá',
      municipality: 'Piedecuesta',
      totalDistanceKm: 7.2,
      estimatedDurationMinutes: 120,
      isActive: true,
      guides: [
        {
          id: 'guide-1',
          fullName: 'Guía Líder',
          phone: '3001112233',
          avatarUrl: null,
        },
      ],
      totalParticipants: 2,
      confirmedParticipants: 1,
      attendanceRatePercentage: 50,
      participants: [sampleParticipant, samplePendingParticipant],
    },
  ];

  beforeEach(async () => {
    mockAdminService = {
      getGuideRouteRoster: vi.fn().mockReturnValue(of(sampleRosters)),
    };

    mockAuthService = {
      currentUser: vi.fn().mockReturnValue({
        id: 'admin-1',
        email: 'admin@garroteros.com',
        fullName: 'Guía Administrador',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
      isAdmin: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [AdminRoutesUsersPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: AdminService, useValue: mockAdminService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRoutesUsersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente e inicializar el roster de rutas y usuarios', () => {
    expect(component).toBeTruthy();
    expect(mockAdminService.getGuideRouteRoster).toHaveBeenCalled();
    expect(component.rosterList()).toEqual(sampleRosters);
    expect(component.selectedRoute()?.routeId).toBe('route-1');
    expect(component.totalParticipantsCount()).toBe(2);
    expect(component.totalConfirmedCount()).toBe(1);
  });

  it('debe filtrar los participantes por estado de asistencia', () => {
    // Filtro por confirmados
    component.onFilterChange('confirmed');
    expect(component.filteredParticipants()).toHaveLength(1);
    expect(component.filteredParticipants()[0].fullName).toBe('Ana María López');

    // Filtro por pendientes
    component.onFilterChange('pending');
    expect(component.filteredParticipants()).toHaveLength(1);
    expect(component.filteredParticipants()[0].fullName).toBe('Bernardo Gómez');

    // Filtro por ficha médica
    component.onFilterChange('has_medical');
    expect(component.filteredParticipants()).toHaveLength(1);
    expect(component.filteredParticipants()[0].hasMedicalProfile).toBe(true);

    // Filtro sin ficha médica
    component.onFilterChange('no_medical');
    expect(component.filteredParticipants()).toHaveLength(1);
    expect(component.filteredParticipants()[0].hasMedicalProfile).toBe(false);
  });

  it('debe filtrar los participantes por término de búsqueda en nombre o correo', () => {
    component.searchTerm.set('bernardo');
    expect(component.filteredParticipants()).toHaveLength(1);
    expect(component.filteredParticipants()[0].email).toBe('bernardo@example.com');

    component.searchTerm.set('3151234567');
    expect(component.filteredParticipants()).toHaveLength(1);
    expect(component.filteredParticipants()[0].fullName).toBe('Ana María López');

    component.searchTerm.set('inexistente');
    expect(component.filteredParticipants()).toHaveLength(0);
  });

  it('debe abrir y cerrar el modal de detalle del participante', () => {
    component.onOpenParticipantModal(sampleParticipant);
    expect(component.isModalOpen()).toBe(true);
    expect(component.selectedParticipant()).toEqual(sampleParticipant);

    component.onCloseParticipantModal();
    expect(component.isModalOpen()).toBe(false);
    expect(component.selectedParticipant()).toBeNull();
  });
});
