/**
 * @sdd
 * [Objetivo]: Pruebas unitarias para AdminUsersPage validando carga de rutas, asignación ágil y filtros (SDD-005).
 * [I/O]: Mocks de AdminService, AuthService y RoutesService.
 * [Edge Cases]: Asignación nula (desasignar), prevención de llamadas redundantes si la ruta no cambia y manejo de errores.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { AdminUsersPage } from './admin-users.page';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService, UserRole, UserStatus, IUser } from '../../../core/services/auth.service';
import { RoutesService } from '../../../core/services/routes.service';
import type { RouteEntityDto } from '../../../../../../shared/src/index';

describe('AdminUsersPage', () => {
  let component: AdminUsersPage;
  let fixture: ComponentFixture<AdminUsersPage>;
  let mockAdminService: {
    getUsers: ReturnType<typeof vi.fn>;
    assignUserRoute: ReturnType<typeof vi.fn>;
    updateUser: ReturnType<typeof vi.fn>;
    createUser: ReturnType<typeof vi.fn>;
    deleteUser: ReturnType<typeof vi.fn>;
    toggleUserStatus: ReturnType<typeof vi.fn>;
  };
  let mockRoutesService: {
    getAllRoutes: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    currentUser: ReturnType<typeof vi.fn>;
  };

  const sampleRoutes: RouteEntityDto[] = [
    {
      id: 'route-1',
      name: 'Ruta de los Garroteros',
      municipality: 'Piedecuesta',
      description: 'Sendero histórico',
      totalDistanceKm: 5,
      estimatedDurationMinutes: 60,
      coordinates: [[-73.0, 7.0]],
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  const sampleUsers: IUser[] = [
    {
      id: 'user-1',
      email: 'turista@piedecuesta.com',
      fullName: 'Carlos Mendoza',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      routeId: null,
      route: null,
    },
  ];

  beforeEach(async () => {
    mockAdminService = {
      getUsers: vi.fn().mockReturnValue(of(sampleUsers)),
      assignUserRoute: vi.fn().mockReturnValue(of({
        ...sampleUsers[0],
        routeId: 'route-1',
        route: { id: 'route-1', name: 'Ruta de los Garroteros' },
      })),
      updateUser: vi.fn().mockReturnValue(of(sampleUsers[0])),
      createUser: vi.fn().mockReturnValue(of(sampleUsers[0])),
      deleteUser: vi.fn().mockReturnValue(of({ success: true, message: 'Usuario eliminado' })),
      toggleUserStatus: vi.fn().mockReturnValue(of(sampleUsers[0])),
    };

    mockRoutesService = {
      getAllRoutes: vi.fn().mockReturnValue(of(sampleRoutes)),
    };

    mockAuthService = {
      currentUser: vi.fn().mockReturnValue(null),
    };

    await TestBed.configureTestingModule({
      imports: [AdminUsersPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: AdminService, useValue: mockAdminService },
        { provide: RoutesService, useValue: mockRoutesService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente e inicializar el catálogo de rutas', () => {
    expect(component).toBeTruthy();
    expect(mockRoutesService.getAllRoutes).toHaveBeenCalled();
    expect(component.availableRoutes()).toEqual(sampleRoutes);
  });

  it('debe asignar una ruta al usuario y actualizar la señal del listado', () => {
    const userToAssign = sampleUsers[0];
    const customEvent = { detail: { value: 'route-1' } } as unknown as CustomEvent;

    component.onAssignRoute(userToAssign, customEvent);

    expect(mockAdminService.assignUserRoute).toHaveBeenCalledWith('user-1', 'route-1');
    const updated = component.users().find((u) => u.id === 'user-1');
    expect(updated?.routeId).toBe('route-1');
    expect(component.toastMessage()).toContain('Ruta asignada a Carlos Mendoza: Ruta de los Garroteros');
    expect(component.showToast()).toBe(true);
  });

  it('no debe llamar al servicio si la ruta seleccionada es idéntica a la actual', () => {
    const userWithRoute: IUser = {
      ...sampleUsers[0],
      routeId: 'route-1',
    };
    const customEvent = { detail: { value: 'route-1' } } as unknown as CustomEvent;

    component.onAssignRoute(userWithRoute, customEvent);

    expect(mockAdminService.assignUserRoute).not.toHaveBeenCalled();
  });

  it('debe filtrar la lista de usuarios por ruta cuando se cambia routeFilter', () => {
    const customEvent = { detail: { value: 'route-1' } } as unknown as CustomEvent;

    component.onRouteFilterChange(customEvent);

    expect(component.routeFilter()).toBe('route-1');
    expect(mockAdminService.getUsers).toHaveBeenCalledWith({
      search: undefined,
      role: undefined,
      routeId: 'route-1',
    });
  });

  it('debe renderizar la imagen de avatar si el usuario tiene foto, o el placeholder si es null', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // sampleUsers[0] no tiene avatarUrl -> debe mostrar placeholder
    const placeholder = compiled.querySelector('.user-card__avatar-placeholder');
    expect(placeholder).toBeTruthy();

    // Ahora simular usuario con avatarUrl
    component.users.set([
      {
        ...sampleUsers[0],
        avatarUrl: 'https://cdn.example.com/carlos.jpg',
      },
    ]);
    fixture.detectChanges();

    const img = compiled.querySelector('.user-card__avatar-img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain('https://cdn.example.com/carlos.jpg');
  });
});
