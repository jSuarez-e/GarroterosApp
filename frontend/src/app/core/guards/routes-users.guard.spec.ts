/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para routesUsersGuard validando acceso exclusivo para roles ADMIN y GUIDE (SDD-005).
 * [I/O]: Mock de AuthService y Router.
 * [Edge Cases]: Permite paso a ADMIN y GUIDE, bloquea y redirige a USER o usuarios sin sesión.
 */

import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { routesUsersGuard } from './routes-users.guard';
import { AuthService, UserRole, UserStatus, type IUser } from '../services/auth.service';

describe('routesUsersGuard', () => {
  let mockAuthService: {
    currentUser: ReturnType<typeof signal<IUser | null>>;
  };
  let router: Router;

  beforeEach(() => {
    mockAuthService = {
      currentUser: signal<IUser | null>(null),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('debe permitir el acceso si el usuario tiene rol ADMIN', () => {
    mockAuthService.currentUser.set({
      id: 'admin-1',
      email: 'admin@garroteros.com',
      fullName: 'Admin User',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    const result = TestBed.runInInjectionContext(() => routesUsersGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('debe permitir el acceso si el usuario tiene rol GUIDE', () => {
    mockAuthService.currentUser.set({
      id: 'guide-1',
      email: 'guia@garroteros.com',
      fullName: 'Guía User',
      role: UserRole.GUIDE,
      status: UserStatus.ACTIVE,
    });

    const result = TestBed.runInInjectionContext(() => routesUsersGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('debe redirigir a /home si el usuario tiene rol USER', () => {
    mockAuthService.currentUser.set({
      id: 'user-1',
      email: 'turista@garroteros.com',
      fullName: 'Turista User',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });

    const result = TestBed.runInInjectionContext(() => routesUsersGuard({} as never, {} as never));
    expect(result).toEqual(router.parseUrl('/home'));
  });

  it('debe redirigir a /login si no hay usuario autenticado', () => {
    mockAuthService.currentUser.set(null);

    const result = TestBed.runInInjectionContext(() => routesUsersGuard({} as never, {} as never));
    expect(result).toEqual(router.parseUrl('/login'));
  });
});
