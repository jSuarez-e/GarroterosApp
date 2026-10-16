/**
 * @sdd
 * [Objetivo]: Página del directorio oficial de guías turísticos de Piedecuesta (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta GuidesService. Expone lista reactiva de guías con filtrado dinámico por búsqueda y botón de llamada directa.
 * [Edge Cases]: Estados de carga vacíos, manejo de avatares rotos y formateo de enlaces telefónicos seguros.
 */

// frontend/src/app/pages/guides/guides.page.ts

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
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonSpinner,
  IonSearchbar,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  callOutline,
  star,
  ribbonOutline,
  timeOutline,
  searchOutline,
} from 'ionicons/icons';
import {
  GuidesService,
  IGuideProfile,
} from '../../core/services/guides.service';
import {
  HeroBannerComponent,
} from '../../shared/components';

@Component({
  selector: 'app-guides',
  templateUrl: './guides.page.html',
  styleUrls: ['./guides.page.scss'],
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
    IonIcon,
    IonSpinner,
    IonSearchbar,
    HeroBannerComponent,
  ],
})
export class GuidesPage implements OnInit, ViewWillEnter {
  private readonly guidesService = inject(GuidesService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly guides = signal<IGuideProfile[]>([]);
  public readonly isLoading = signal<boolean>(true);
  public readonly searchQuery = signal<string>('');

  constructor() {
    addIcons({
      peopleOutline,
      callOutline,
      star,
      ribbonOutline,
      timeOutline,
      searchOutline,
    });
  }

  ngOnInit(): void {
    this.fetchGuides();
  }

  ionViewWillEnter(): void {
    this.fetchGuides(this.searchQuery());
  }

  /**
   * Consulta el catálogo de guías oficiales activos desde el backend.
   * @param query Término de búsqueda opcional.
   */
  public fetchGuides(query?: string): void {
    this.isLoading.set(true);
    this.guidesService
      .getGuides(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.guides.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Maneja el cambio en la barra de búsqueda de guías.
   * @param event Evento emitido por IonSearchbar.
   */
  public onSearchChange(event: CustomEvent): void {
    const val = (event.detail.value || '').trim();
    this.searchQuery.set(val);
    this.fetchGuides(val);
  }

  /**
   * Formatea el número telefónico para llamada telefónica nativa (tel:...).
   * @param phone Teléfono del guía.
   * @returns URI de llamada segura.
   */
  public getCallUri(phone: string | null): string {
    if (!phone) return '#';
    return `tel:${phone.replace(/\s+/g, '')}`;
  }
}
