/**
 * @sdd
 * [Objetivo]: Tarjeta blanca de superficie curva reutilizable estilo mockup (SDD-005-UI-REDESIGN).
 * [I/O]: Inputs: title (string), subtitle (string), badge (string), badgeColor ('primary' | 'success' | 'warning' | 'danger'), icon (string).
 * [Edge Cases]: Renderizado OnPush, proyeccion de contenido estructurado <ng-content>, sin inline styles.
 */

// frontend/src/app/shared/components/info-card/info-card.component.ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';

/**
 * Componente de tarjeta de contenido con bordes redondeados y sombras sutiles.
 */
@Component({
  selector: 'app-info-card',
  templateUrl: './info-card.component.html',
  styleUrls: ['./info-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoCardComponent {
  /**
   * Titulo de la tarjeta.
   */
  public readonly title = input<string>('');

  /**
   * Subtitulo o descripcion secundaria.
   */
  public readonly subtitle = input<string>('');

  /**
   * Texto de la etiqueta de estado o categoria en la esquina superior derecha.
   */
  public readonly badge = input<string>('');

  /**
   * Variante de color para el badge.
   */
  public readonly badgeColor = input<'primary' | 'success' | 'warning' | 'danger'>('primary');

  /**
   * Nombre del icono de Ionic a mostrar junto al titulo.
   */
  public readonly icon = input<string>('');
}
