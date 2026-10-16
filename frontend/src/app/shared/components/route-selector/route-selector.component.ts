/**
 * @sdd
 * [Objetivo]: Selector universal reactivo de rutas turísticas para paneles administrativos y vistas de catálogo.
 * [I/O - Reusabilidad]: Input/Model: selectedRouteId (string | null). Output: routeChanged (RouteEntityDto). Inyecta RoutesService.
 * [Edge Cases - UI]: Carga asíncrona, autoselección de la ruta activa oficial, fallback a primera ruta disponible, diseño móvil BEM.
 */

// frontend/src/app/shared/components/route-selector/route-selector.component.ts

import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  model,
  output,
  input,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  mapOutline,
  checkmarkCircleOutline,
  walkOutline,
  timeOutline,
  navigateOutline,
  trailSignOutline,
} from 'ionicons/icons';
import { RoutesService } from '../../../core/services/routes.service';
import type { RouteEntityDto } from '../../../../../../shared/src/index';

@Component({
  selector: 'app-route-selector',
  templateUrl: './route-selector.component.html',
  styleUrls: ['./route-selector.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonSpinner,
  ],
})
export class RouteSelectorComponent implements OnInit {
  private readonly routesService = inject(RoutesService);
  private readonly destroyRef = inject(DestroyRef);

  /** Identificador de la ruta seleccionada con enlace bidireccional (model signal) */
  public readonly selectedRouteId = model<string | null>(null);

  /** Etiqueta opcional descriptiva */
  public readonly label = input<string>('Filtrar por Ruta');

  /** Emite el objeto completo de la ruta al cambiar */
  public readonly routeChanged = output<RouteEntityDto>();

  /** Colección de rutas disponibles */
  public readonly routes = signal<RouteEntityDto[]>([]);

  /** Estado de carga de las rutas */
  public readonly isLoading = signal<boolean>(true);

  /** Ruta actualmente seleccionada computada */
  public readonly currentRoute = computed<RouteEntityDto | null>(() => {
    const id = this.selectedRouteId();
    if (!id) return null;
    return this.routes().find((r) => r.id === id) || null;
  });

  constructor() {
    addIcons({
      mapOutline,
      checkmarkCircleOutline,
      walkOutline,
      timeOutline,
      navigateOutline,
      trailSignOutline,
    });
  }

  ngOnInit(): void {
    this.loadRoutes();
  }

  /**
   * Carga todas las rutas turísticas registradas y autoselecciona la ruta activa si no hay selección previa.
   */
  public loadRoutes(): void {
    this.isLoading.set(true);
    this.routesService
      .getAllRoutes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.routes.set(data);
          this.isLoading.set(false);

          if (data.length > 0) {
            const currentId = this.selectedRouteId();
            const existing = currentId ? data.find((r) => r.id === currentId) : null;

            if (!existing) {
              const activeRoute = data.find((r) => r.isActive) || data[0];
              this.selectedRouteId.set(activeRoute.id);
              this.routeChanged.emit(activeRoute);
            } else {
              this.routeChanged.emit(existing);
            }
          }
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Manejador del cambio de selección en el componente.
   * @param newRouteId Nuevo ID de ruta seleccionado.
   */
  public onSelectionChange(newRouteId: string): void {
    this.selectedRouteId.set(newRouteId);
    const found = this.routes().find((r) => r.id === newRouteId);
    if (found) {
      this.routeChanged.emit(found);
    }
  }
}
