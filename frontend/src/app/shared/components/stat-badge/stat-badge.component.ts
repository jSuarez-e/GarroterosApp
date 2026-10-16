/**
 * @sdd
 * [Objetivo]: Chip de metrica o indicador estadistico reutilizable (SDD-005-UI-REDESIGN).
 * [I/O]: Inputs: icon (string), value (string | number), label (string), variant ('default' | 'primary' | 'warning' | 'success').
 * [Edge Cases]: Renderizado OnPush optimizado, control flow nativo @if.
 */

// frontend/src/app/shared/components/stat-badge/stat-badge.component.ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';

/**
 * Componente para visualizacion compacta de metricas, pasajeros, distancias o clima.
 */
@Component({
  selector: 'app-stat-badge',
  templateUrl: './stat-badge.component.html',
  styleUrls: ['./stat-badge.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatBadgeComponent {
  /**
   * Icono representativo.
   */
  public readonly icon = input.required<string>();

  /**
   * Valor o cifra principal a mostrar.
   */
  public readonly value = input.required<string | number>();

  /**
   * Etiqueta o descripcion breve.
   */
  public readonly label = input<string>('');

  /**
   * Variante estetica y cromatica del chip.
   */
  public readonly variant = input<'default' | 'primary' | 'warning' | 'success'>('default');
}
