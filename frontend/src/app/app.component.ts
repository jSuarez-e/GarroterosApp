/**
 * @sdd
 * [Objetivo]: Componente raiz con navegacion movil y menu lateral reactivo RBAC (SDD-002-AUTH-RBAC).
 * [I/O]: Consume senales de AuthService (currentUser, isAdmin). Renderiza opciones de menu segun rol.
 * [Edge Cases]: Oculta opciones de administracion si el rol no es ADMIN, gestion de cierre de sesion seguro.
 */

import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IonApp,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonContent,
  IonList,
  IonListHeader,
  IonLabel,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonFooter,
  IonButton,
  IonRouterOutlet,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personCircleOutline,
  mapOutline,
  informationCircleOutline,
  peopleOutline,
  partlySunnyOutline,
  navigateOutline,
  medkitOutline,
  alertCircleOutline,
  shieldCheckmarkOutline,
  logOutOutline,
  peopleCircleOutline,
  calendarOutline,
  documentTextOutline,
  locationOutline,
  lockClosedOutline,
  homeOutline,
  checkboxOutline,
} from 'ionicons/icons';
import { AuthService } from './core/services/auth.service';
import { MedicalService } from './core/services/medical.service';
import { NativeBridgeService } from './core/services/native-bridge.service';
import { SocketService } from './core/services/socket.service';
import { LocalNotificationService } from './core/services/local-notification.service';

export interface MenuItem {
  title: string;
  url: string;
  icon: string;
  requiresAttendance?: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonApp,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonContent,
    IonList,
    IonListHeader,
    IonLabel,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonFooter,
    IonButton,
    IonRouterOutlet,
  ],
})
export class AppComponent {
  private readonly authService = inject(AuthService);
  private readonly medicalService = inject(MedicalService);
  private readonly nativeBridge = inject(NativeBridgeService);
  private readonly socketService = inject(SocketService);
  private readonly localNotificationService = inject(LocalNotificationService);

  public currentUser = this.authService.currentUser;
  public isAdmin = this.authService.isAdmin;
  public isGuide = this.authService.isGuide;
  public isStaff = this.authService.isStaff;
  public isAuthenticated = this.authService.isAuthenticated;
  public attendanceConfirmed = this.medicalService.attendanceConfirmed;

  // Opciones obligatorias para rol USER (y disponibles para ADMIN y GUIDE)
  public readonly userMenuItems: MenuItem[] = [
    { title: 'Revisar Recorrido', url: '/home', icon: 'home-outline' },
    { title: 'Ficha de Asistencia', url: '/medical-card', icon: 'medkit-outline' },
    { title: 'Mapa Interactivo', url: '/map', icon: 'map-outline', requiresAttendance: true },
    { title: 'Información de Ruta', url: '/routes', icon: 'information-circle-outline' },
    { title: 'Guías del Recorrido', url: '/guides', icon: 'people-outline', requiresAttendance: true },
    { title: '¿Cómo Llegar?', url: '/how-to-arrive', icon: 'navigate-outline', requiresAttendance: true },
    { title: 'Emergencias (SOS)', url: '/sos', icon: 'alert-circle-outline', requiresAttendance: true },
    { title: 'Estado del Clima', url: '/weather', icon: 'partly-sunny-outline' },
    { title: 'Permisos App', url: '/permissions', icon: 'shield-checkmark-outline' },
  ];

  // Opción de supervisión para el rol GUIDE
  public readonly guideMenuItems: MenuItem[] = [
    { title: 'Rutas y Usuarios', url: '/admin/routes-users', icon: 'checkbox-outline' },
  ];

  // Opciones exclusivas de control administrativo para rol ADMIN
  public readonly adminMenuItems: MenuItem[] = [
    { title: 'Rutas y Usuarios', url: '/admin/routes-users', icon: 'checkbox-outline' },
    { title: 'Alertas SOS', url: '/admin/alerts', icon: 'alert-circle-outline' },
    { title: 'Gestión de Usuarios', url: '/admin/users', icon: 'people-circle-outline' },
    { title: 'Gestión de Guías', url: '/admin/guides', icon: 'people-outline' },
    { title: 'Gestión de Rutas', url: '/admin/routes', icon: 'map-outline' },
    { title: 'Itinerario de Ruta', url: '/admin/itinerary', icon: 'calendar-outline' },
    { title: 'Notas de Ruta', url: '/admin/notes', icon: 'document-text-outline' },
    { title: 'Puntos de Interés', url: '/admin/pois', icon: 'location-outline' },
  ];

  constructor() {
    addIcons({
      homeOutline,
      personCircleOutline,
      mapOutline,
      informationCircleOutline,
      peopleOutline,
      partlySunnyOutline,
      navigateOutline,
      medkitOutline,
      alertCircleOutline,
      shieldCheckmarkOutline,
      logOutOutline,
      peopleCircleOutline,
      calendarOutline,
      documentTextOutline,
      locationOutline,
      lockClosedOutline,
      checkboxOutline,
    });

    // Inicializar configuraciones nativas (orientacion vertical y barra de estado)
    this.nativeBridge.initNativeFeatures();

    // Inicializar comprobación de asistencia y sincronización de foto médica en segundo plano si hay sesión
    if (this.authService.token()) {
      this.medicalService
        .getMyProfile()
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (profile) => {
            if (profile?.photoUrl && profile.photoUrl !== this.currentUser()?.avatarUrl) {
              this.authService.updateCurrentUserAvatar(profile.photoUrl);
            }
          },
        });
    }

    // Gestionar ciclo de vida de WebSockets y notificaciones push locales según autenticación
    effect(() => {
      const activeToken = this.authService.token();
      if (activeToken) {
        this.socketService.connect(activeToken);
        void this.localNotificationService.init();
      } else {
        this.socketService.disconnect();
      }
    });
  }

  /**
   * Ejecuta el cierre de sesion a traves del servicio de autenticacion.
   */
  public onLogout(): void {
    this.authService.logout();
  }
}
