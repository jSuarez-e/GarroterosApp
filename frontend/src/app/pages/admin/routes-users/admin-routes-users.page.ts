/**
 * @sdd
 * [Objetivo]: Panel administrativo y operativo para guías turísticos para listar rutas activas y verificar asistencia y fichas médicas de usuarios asignados (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta AdminService y AuthService. Carga IGuideRouteRoster[], permite filtrar por ruta, asistencia y ficha médica, e inspeccionar resumen de emergencia.
 * [Edge Cases]: Gestión de guías sin rutas asignadas, usuarios sin foto o sin ficha médica, recarga con ionViewWillEnter y pull-to-refresh.
 */

// frontend/src/app/pages/admin/routes-users/admin-routes-users.page.ts

import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
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
  IonRefresher,
  IonRefresherContent,
  IonModal,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  personCircleOutline,
  checkmarkCircleOutline,
  timeOutline,
  medkitOutline,
  alertCircleOutline,
  callOutline,
  mailOutline,
  searchOutline,
  refreshOutline,
  closeOutline,
  fitnessOutline,
  restaurantOutline,
  heartOutline,
  shieldCheckmarkOutline,
  locationOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import {
  AdminService,
  type IGuideRouteRoster,
  type IRouteRosterParticipant,
} from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';

type AttendanceFilter = 'all' | 'confirmed' | 'pending' | 'has_medical' | 'no_medical';

/**
 * Componente principal para el módulo de Rutas y Usuarios del Guía.
 */
@Component({
  selector: 'app-admin-routes-users',
  templateUrl: './admin-routes-users.page.html',
  styleUrls: ['./admin-routes-users.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
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
    IonRefresher,
    IonRefresherContent,
    IonModal,
  ],
})
export class AdminRoutesUsersPage implements OnInit, ViewWillEnter {
  private readonly adminService = inject(AdminService);
  public readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // Estados reactivos mediante Signals
  public readonly rosterList = signal<IGuideRouteRoster[]>([]);
  public readonly loading = signal<boolean>(true);
  public readonly selectedRouteId = signal<string | null>(null);
  public readonly searchTerm = signal<string>('');
  public readonly filterStatus = signal<AttendanceFilter>('all');
  public readonly selectedParticipant = signal<IRouteRosterParticipant | null>(null);
  public readonly isModalOpen = signal<boolean>(false);

  // Rutas y participantes derivados
  public readonly selectedRoute = computed<IGuideRouteRoster | null>(() => {
    const list = this.rosterList();
    const currentId = this.selectedRouteId();
    if (!currentId && list.length > 0) {
      return list[0];
    }
    return list.find((routeItem) => routeItem.routeId === currentId) ?? list[0] ?? null;
  });

  public readonly filteredParticipants = computed<IRouteRosterParticipant[]>(() => {
    const currentRoute = this.selectedRoute();
    if (!currentRoute) return [];

    const query = this.searchTerm().toLowerCase().trim();
    const status = this.filterStatus();

    return currentRoute.participants.filter((participant) => {
      // Filtro de texto por nombre, correo o teléfono
      const matchSearch =
        query.length === 0 ||
        participant.fullName.toLowerCase().includes(query) ||
        participant.email.toLowerCase().includes(query) ||
        (participant.phone && participant.phone.includes(query));

      if (!matchSearch) return false;

      // Filtro por estado
      if (status === 'confirmed') return participant.attendanceConfirmed;
      if (status === 'pending') return !participant.attendanceConfirmed;
      if (status === 'has_medical') return participant.hasMedicalProfile;
      if (status === 'no_medical') return !participant.hasMedicalProfile;

      return true;
    });
  });

  public readonly totalConfirmedCount = computed<number>(() => {
    const currentRoute = this.selectedRoute();
    if (!currentRoute) return 0;
    return currentRoute.participants.filter((participant) => participant.attendanceConfirmed).length;
  });

  public readonly totalParticipantsCount = computed<number>(() => {
    const currentRoute = this.selectedRoute();
    return currentRoute ? currentRoute.participants.length : 0;
  });

  constructor() {
    addIcons({
      peopleOutline,
      personCircleOutline,
      checkmarkCircleOutline,
      timeOutline,
      medkitOutline,
      alertCircleOutline,
      callOutline,
      mailOutline,
      searchOutline,
      refreshOutline,
      closeOutline,
      fitnessOutline,
      restaurantOutline,
      heartOutline,
      shieldCheckmarkOutline,
      locationOutline,
      informationCircleOutline,
    });
  }

  public ngOnInit(): void {
    this.loadRoster();
  }

  public ionViewWillEnter(): void {
    this.loadRoster();
  }

  /**
   * Consulta al backend las rutas activas con participantes asignados.
   * @param event Evento opcional de pull-to-refresh.
   */
  public loadRoster(event?: CustomEvent): void {
    if (!event) {
      this.loading.set(true);
    }

    this.adminService
      .getGuideRouteRoster()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rosterData: IGuideRouteRoster[]) => {
          this.rosterList.set(rosterData);
          if (rosterData.length > 0 && !this.selectedRouteId()) {
            this.selectedRouteId.set(rosterData[0].routeId);
          }
          this.loading.set(false);
          if (event) {
            (event.target as HTMLIonRefresherElement).complete();
          }
        },
        error: () => {
          this.loading.set(false);
          if (event) {
            (event.target as HTMLIonRefresherElement).complete();
          }
        },
      });
  }

  /**
   * Cambia la ruta actualmente inspeccionada.
   * @param routeId UUID de la ruta seleccionada.
   */
  public onSelectRoute(routeId: string): void {
    this.selectedRouteId.set(routeId);
  }

  /**
   * Actualiza el filtro de estado de asistencia.
   * @param filter Nuevo criterio de filtro.
   */
  public onFilterChange(filter: AttendanceFilter): void {
    this.filterStatus.set(filter);
  }

  /**
   * Abre el modal con los detalles médicos y de contacto de emergencia de un usuario.
   * @param participant Datos del participante seleccionado.
   */
  public onOpenParticipantModal(participant: IRouteRosterParticipant): void {
    this.selectedParticipant.set(participant);
    this.isModalOpen.set(true);
  }

  /**
   * Cierra el modal de detalle del participante.
   */
  public onCloseParticipantModal(): void {
    this.isModalOpen.set(false);
    this.selectedParticipant.set(null);
  }
}
