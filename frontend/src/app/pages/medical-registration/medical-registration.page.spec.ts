/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para MedicalRegistrationPage validando asociación de ruta asignada (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Mocks de MedicalService, AuthService, Router y ToastController.
 * [Edge Cases]: Validación de assignedRoute computed con usuario asignado o sin asignar, y payload en onSave.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MedicalRegistrationPage } from './medical-registration.page';
import { MedicalService, DietType, type IMedicalProfile } from '../../core/services/medical.service';
import { AuthService, type IUser, UserRole, UserStatus } from '../../core/services/auth.service';

describe('MedicalRegistrationPage', () => {
  let component: MedicalRegistrationPage;
  let fixture: ComponentFixture<MedicalRegistrationPage>;
  let mockMedicalService: Partial<MedicalService>;
  let mockAuthService: Partial<AuthService>;
  let mockRouter: Partial<Router>;
  let currentUserSignal: ReturnType<typeof signal<IUser | null>>;
  let profileSignal: ReturnType<typeof signal<IMedicalProfile | null>>;

  const mockUserWithRoute: IUser = {
    id: 'user-123',
    email: 'turista@piedecuesta.com',
    fullName: 'Turista Garrotero',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    routeId: 'route-active-99',
    route: {
      id: 'route-active-99',
      name: 'Ruta Histórica y Cultural de los Garroteros',
    },
  };

  beforeEach(async () => {
    currentUserSignal = signal<IUser | null>(mockUserWithRoute);
    profileSignal = signal<IMedicalProfile | null>(null);

    mockMedicalService = {
      profile: profileSignal,
      getMyProfile: vi.fn().mockReturnValue(of(null)),
      saveMyProfile: vi.fn().mockReturnValue(of({} as IMedicalProfile)),
    };

    mockAuthService = {
      currentUser: currentUserSignal,
      refreshProfile: vi.fn().mockReturnValue(of(mockUserWithRoute)),
      updateCurrentUserAvatar: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [MedicalRegistrationPage],
      providers: [
        { provide: MedicalService, useValue: mockMedicalService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicalRegistrationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe reflejar la ruta asignada al usuario autenticado', () => {
    expect(component.assignedRoute()).toEqual({
      id: 'route-active-99',
      name: 'Ruta Histórica y Cultural de los Garroteros',
    });
  });

  it('debe incluir routeId al guardar la ficha médica y confirmar asistencia', () => {
    component.attendanceConfirmed.set(true);
    component.dietType.set(DietType.REGULAR);
    component.emergencyContactName.set('María Pérez');
    component.emergencyContactPhone.set('+57 300 123 4567');

    component.onSave();

    expect(mockMedicalService.saveMyProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        attendanceConfirmed: true,
        routeId: 'route-active-99',
        emergencyContactName: 'María Pérez',
        emergencyContactPhone: '+57 300 123 4567',
      }),
    );
  });

  it('debe deshabilitar el guardado si falta el nombre o el teléfono del contacto de emergencia', () => {
    component.emergencyContactName.set('');
    component.emergencyContactPhone.set('');
    expect(component.isFormValid()).toBe(false);

    component.emergencyContactName.set('María Pérez');
    component.emergencyContactPhone.set('');
    expect(component.isFormValid()).toBe(false);

    component.emergencyContactName.set('');
    component.emergencyContactPhone.set('+57 300 123 4567');
    expect(component.isFormValid()).toBe(false);

    // No debe invocar saveMyProfile si el formulario es inválido
    component.onSave();
    expect(mockMedicalService.saveMyProfile).not.toHaveBeenCalled();
  });

  it('debe habilitar el guardado cuando el nombre y teléfono del contacto de emergencia son válidos', () => {
    component.emergencyContactName.set('María Pérez');
    component.emergencyContactPhone.set('3001234567');

    expect(component.isContactNameValid()).toBe(true);
    expect(component.isContactPhoneValid()).toBe(true);
    expect(component.isFormValid()).toBe(true);
  });

  it('debe reflejar null en assignedRoute si el usuario no tiene ruta asignada', () => {
    currentUserSignal.set({
      ...mockUserWithRoute,
      routeId: null,
      route: null,
    });

    expect(component.assignedRoute()).toBeNull();
  });
});
