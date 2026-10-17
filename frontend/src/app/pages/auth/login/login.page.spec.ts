/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para LoginPage validando reseteo del formulario y ciclo de vida (SDD-002-AUTH-RBAC).
 * [I/O]: Mocks de AuthService, MedicalService, Router y ToastController.
 * [Edge Cases]: Verificación de reseteo del formulario en ionViewWillEnter y onSubmit exitoso.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoginPage } from './login.page';
import { AuthService } from '../../../core/services/auth.service';
import { MedicalService } from '../../../core/services/medical.service';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let mockAuthService: Partial<AuthService>;
  let mockMedicalService: Partial<MedicalService>;
  let mockRouter: Partial<Router>;
  let mockToastCtrl: Partial<ToastController>;

  beforeEach(async () => {
    mockAuthService = {
      login: vi.fn().mockReturnValue(of({ accessToken: 'fake-token', user: { id: 'u1', role: 'USER' } })),
      isAdmin: signal(false),
    };

    mockMedicalService = {
      checkAttendance: vi.fn().mockReturnValue(of(true)),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      } as unknown as HTMLIonToastElement),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: MedicalService, useValue: mockMedicalService },
        { provide: Router, useValue: mockRouter },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe limpiar el formulario cuando ionViewWillEnter es invocado', () => {
    component.loginForm.setValue({
      email: 'test@ejemplo.com',
      password: 'password123',
    });
    expect(component.loginForm.value.email).toBe('test@ejemplo.com');

    component.ionViewWillEnter();

    expect(component.loginForm.value.email).toBe('');
    expect(component.loginForm.value.password).toBe('');
    expect(component.loginForm.pristine).toBe(true);
    expect(component.loginForm.untouched).toBe(true);
  });

  it('debe limpiar el formulario tras un submit exitoso', async () => {
    component.loginForm.setValue({
      email: 'usuario@ejemplo.com',
      password: 'passwordSeguro123',
    });

    await component.onSubmit();

    expect(component.loginForm.value.email).toBe('');
    expect(component.loginForm.value.password).toBe('');
    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'usuario@ejemplo.com',
      password: 'passwordSeguro123',
    });
  });
});
