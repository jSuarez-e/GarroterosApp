/**
 * @sdd
 * [Objetivo]: Componente atomico reutilizable para el encabezado curvo principal estilo Hero (SDD-005-UI-REDESIGN).
 * [I/O]: Inputs: title (string), subtitle (string), badgeText (string), iconName (string), showDecorativePlane (boolean).
 * [Edge Cases]: Renderizado OnPush optimizado, control flow nativo @if, slots de proyeccion opcionales.
 */

// frontend/src/app/shared/components/hero-banner/hero-banner.component.ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { navigate, trailSignOutline } from 'ionicons/icons';

/**
 * Componente de encabezado Hero con diseno curvo y contraste vibrante inspirado en viajes.
 */
@Component({
  selector: 'app-hero-banner',
  templateUrl: './hero-banner.component.html',
  styleUrls: ['./hero-banner.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroBannerComponent {
  constructor() {
    addIcons({ navigate, trailSignOutline });
  }
  /**
   * Titulo principal del banner.
   */
  public readonly title = input.required<string>();

  /**
   * Subtitulo o descripcion breve.
   */
  public readonly subtitle = input<string>('');

  /**
   * Texto opcional de la capsula o badge superior.
   */
  public readonly badgeText = input<string>('');

  /**
   * Icono representativo opcional.
   */
  public readonly iconName = input<string>('trail-sign-outline');

  /**
   * Indica si se renderiza el elemento visual decorativo de viaje en segundo plano.
   */
  public readonly showDecorativeIllustration = input<boolean>(true);
}
