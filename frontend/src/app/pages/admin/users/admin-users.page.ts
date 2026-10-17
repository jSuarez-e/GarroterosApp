/**
 * @sdd
 * [Objetivo]: Panel administrativo para el CRUD de usuarios y control de roles RBAC (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta AdminService y AuthService. Permite listar, filtrar, crear cuentas manualmente, alternar estados y eliminar.
 * [Edge Cases]: Validación de auto-eliminación, confirmación de eliminación y retroalimentación reactiva con Signals.
 */

// frontend/src/app/pages/admin/users/admin-users.page.ts

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonModal,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  peopleCircleOutline,
  peopleOutline,
  personCircleOutline,
  personAddOutline,
  shieldCheckmarkOutline,
  personOutline,
  callOutline,
  mailOutline,
  trashOutline,
  createOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  closeOutline,
  keyOutline,
  mapOutline,
  openOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import {
  AdminService,
  AdminCreateUserDto,
  AdminUpdateUserDto,
} from '../../../core/services/admin.service';
import { AuthService, UserRole, UserStatus, IUser } from '../../../core/services/auth.service';
import { RoutesService } from '../../../core/services/routes.service';
import type { RouteEntityDto } from '../../../../../../shared/src/index';
import {
  HeroBannerComponent,
} from '../../../shared/components';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.page.html',
  styleUrls: ['./admin-users.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonToast,
    IonModal,
    HeroBannerComponent,
  ],
})
export class AdminUsersPage implements OnInit, ViewWillEnter {
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);
  private readonly routesService = inject(RoutesService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly users = signal<IUser[]>([]);
  public readonly availableRoutes = signal<RouteEntityDto[]>([]);
  public readonly isLoading = signal<boolean>(true);
  public readonly errorMessage = signal<string | null>(null);
  public readonly isSubmitting = signal<boolean>(false);
  public readonly searchQuery = signal<string>('');
  public readonly roleFilter = signal<string>('ALL');
  public readonly routeFilter = signal<string>('ALL');

  public readonly isModalOpen = signal<boolean>(false);
  public readonly editingUser = signal<IUser | null>(null);

  // Form Fields
  public readonly formEmail = signal<string>('');
  public readonly formPassword = signal<string>('');
  public readonly formFullName = signal<string>('');
  public readonly formRole = signal<UserRole>(UserRole.USER);
  public readonly formPhone = signal<string>('');
  public readonly formRouteId = signal<string>('');

  public readonly showToast = signal<boolean>(false);
  public readonly toastMessage = signal<string>('');

  public readonly currentUser = this.authService.currentUser;

  constructor() {
    addIcons({
      peopleCircleOutline,
      peopleOutline,
      personCircleOutline,
      personAddOutline,
      shieldCheckmarkOutline,
      personOutline,
      callOutline,
      mailOutline,
      trashOutline,
      createOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      closeOutline,
      keyOutline,
      mapOutline,
      openOutline,
      informationCircleOutline,
    });
  }

  ngOnInit(): void {
    this.fetchUsers();
    this.loadRoutes();
  }

  /**
   * Refresca la lista de usuarios cada vez que la vista entra en primer plano (Ionic lifecycle).
   */
  ionViewWillEnter(): void {
    this.fetchUsers();
    this.loadRoutes();
  }

  /**
   * Carga el catálogo de rutas turísticas disponibles para asignación y filtrado.
   */
  public loadRoutes(): void {
    this.routesService
      .getAllRoutes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (routes) => this.availableRoutes.set(routes),
        error: () => this.availableRoutes.set([]),
      });
  }

  /**
   * Carga la lista de usuarios con los filtros activos.
   */
  public fetchUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const role = this.roleFilter() !== 'ALL' ? (this.roleFilter() as UserRole) : undefined;
    const routeId = this.routeFilter() !== 'ALL' ? this.routeFilter() : undefined;
    this.adminService
      .getUsers({
        search: this.searchQuery() || undefined,
        role,
        routeId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.users.set(data);
          this.isLoading.set(false);
          this.errorMessage.set(null);
        },
        error: (err: { status?: number; message?: string }) => {
          this.isLoading.set(false);
          const msg =
            err.status === 401 || err.status === 403
              ? 'Acceso no autorizado. Inicie sesión con credenciales de Administrador.'
              : 'Error al conectar con el servidor backend. Verifique que esté en ejecución.';
          this.errorMessage.set(msg);
        },
      });
  }

  /**
   * Maneja el filtrado por texto en la barra de búsqueda.
   * @param event Evento del buscador.
   */
  public onSearch(event: CustomEvent): void {
    const val = (event.detail.value || '').trim();
    this.searchQuery.set(val);
    this.fetchUsers();
  }

  /**
   * Maneja el cambio de filtro de rol.
   * @param event Evento del selector de rol.
   */
  public onRoleFilterChange(event: CustomEvent): void {
    this.roleFilter.set(event.detail.value);
    this.fetchUsers();
  }

  /**
   * Maneja el cambio de filtro de ruta.
   * @param event Evento del selector de ruta.
   */
  public onRouteFilterChange(event: CustomEvent): void {
    this.routeFilter.set(event.detail.value);
    this.fetchUsers();
  }

  /**
   * Asigna de manera ágil una ruta a un usuario directamente desde la tarjeta del listado.
   * @param user Usuario a configurar.
   * @param event Evento emitido por el selector de ruta.
   */
  public onAssignRoute(user: IUser, event: CustomEvent): void {
    const targetRouteId = (event.detail.value as string) || null;
    if ((user.routeId || null) === targetRouteId) {
      return;
    }

    this.adminService
      .assignUserRoute(user.id, targetRouteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedUser) => {
          this.users.update((currentList) =>
            currentList.map((item) => (item.id === updatedUser.id ? updatedUser : item)),
          );
          const routeName = updatedUser.route?.name || 'Sin ruta';
          this.toastMessage.set(`Ruta asignada a ${updatedUser.fullName}: ${routeName}`);
          this.showToast.set(true);
        },
        error: () => {
          this.toastMessage.set('Error al asignar la ruta al usuario.');
          this.showToast.set(true);
          this.fetchUsers();
        },
      });
  }

  /**
   * Abre el modal para crear un nuevo usuario.
   */
  public openCreateModal(): void {
    this.editingUser.set(null);
    this.formEmail.set('');
    this.formPassword.set('');
    this.formFullName.set('');
    this.formRole.set(UserRole.USER);
    this.formPhone.set('');
    this.formRouteId.set('');
    this.isModalOpen.set(true);
  }

  /**
   * Abre el modal para editar un usuario existente.
   * @param user Usuario a modificar.
   */
  public openEditModal(user: IUser): void {
    this.editingUser.set(user);
    this.formEmail.set(user.email);
    this.formPassword.set('');
    this.formFullName.set(user.fullName);
    this.formRole.set(user.role);
    this.formPhone.set(user.phone || '');
    this.formRouteId.set(user.routeId || '');
    this.isModalOpen.set(true);
  }

  /**
   * Cierra el modal de formulario.
   */
  public closeModal(): void {
    this.isModalOpen.set(false);
  }

  /**
   * Actualiza el valor de un campo de texto de forma tipada.
   * @param targetSignal Señal writable a actualizar.
   * @param event Evento del input.
   */
  public onInputChange(targetSignal: { set: (val: string) => void }, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      targetSignal.set(input.value);
    }
  }

  /**
   * Guarda o actualiza un usuario según el modo del modal.
   */
  public onSaveUser(): void {
    if (!this.formFullName().trim()) {
      this.toastMessage.set('El nombre completo es obligatorio.');
      this.showToast.set(true);
      return;
    }

    this.isSubmitting.set(true);
    const editing = this.editingUser();

    if (editing) {
      const dto: AdminUpdateUserDto = {
        fullName: this.formFullName().trim(),
        role: this.formRole(),
        phone: this.formPhone().trim() || null,
        routeId: this.formRouteId().trim() || null,
      };

      this.adminService
        .updateUser(editing.id, dto)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.closeModal();
            this.toastMessage.set('Usuario actualizado correctamente.');
            this.showToast.set(true);
            this.fetchUsers();
          },
          error: () => {
            this.isSubmitting.set(false);
            this.toastMessage.set('Error al actualizar el usuario.');
            this.showToast.set(true);
          },
        });
    } else {
      if (!this.formEmail().trim() || !this.formPassword().trim()) {
        this.isSubmitting.set(false);
        this.toastMessage.set('Correo y contraseña son obligatorios.');
        this.showToast.set(true);
        return;
      }

      const dto: AdminCreateUserDto = {
        email: this.formEmail().trim(),
        password: this.formPassword().trim(),
        fullName: this.formFullName().trim(),
        role: this.formRole(),
        phone: this.formPhone().trim() || null,
        routeId: this.formRouteId().trim() || null,
      };

      this.adminService
        .createUser(dto)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.closeModal();
            this.toastMessage.set('Usuario creado exitosamente.');
            this.showToast.set(true);
            this.fetchUsers();
          },
          error: () => {
            this.isSubmitting.set(false);
            this.toastMessage.set('Error al crear el usuario. Revisa el correo.');
            this.showToast.set(true);
          },
        });
    }
  }

  /**
   * Alterna el estado activo/inactivo de una cuenta.
   * @param user Usuario a modificar.
   */
  public onToggleStatus(user: IUser): void {
    this.adminService
      .toggleUserStatus(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.users.update((list) =>
            list.map((u) => (u.id === updated.id ? { ...u, status: updated.status } : u)),
          );
          this.toastMessage.set(`Estado cambiado a ${updated.status}`);
          this.showToast.set(true);
        },
        error: () => {
          this.toastMessage.set('No se pudo modificar el estado del usuario.');
          this.showToast.set(true);
        },
      });
  }

  /**
   * Elimina una cuenta de usuario tras confirmar la acción.
   * @param user Usuario a eliminar.
   */
  public onDeleteUser(user: IUser): void {
    const active = this.currentUser();
    if (active && active.id === user.id) {
      this.toastMessage.set('No puedes eliminar tu propia cuenta activa.');
      this.showToast.set(true);
      return;
    }

    if (confirm(`¿Estás seguro de eliminar al usuario ${user.fullName} (${user.email})?`)) {
      this.adminService
        .deleteUser(user.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.users.update((list) => list.filter((u) => u.id !== user.id));
            this.toastMessage.set('Usuario eliminado exitosamente.');
            this.showToast.set(true);
          },
          error: () => {
            this.toastMessage.set('Error al eliminar el usuario.');
            this.showToast.set(true);
          },
        });
    }
  }
}
