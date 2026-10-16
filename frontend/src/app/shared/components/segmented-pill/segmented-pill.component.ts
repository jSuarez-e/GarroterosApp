/**
 * @sdd
 * [Objetivo]: Selector segmentado estilo píldora para navegacion y filtrado rápido (SDD-005-UI-REDESIGN).
 * [I/O]: Input options (Array<{ id: string; label: string; icon?: string }>), model selectedId (string). Output selectionChange (string).
 * [Edge Cases]: Renderizado OnPush, emision de senal reactiva sin recargas.
 */

// frontend/src/app/shared/components/segmented-pill/segmented-pill.component.ts
import { Component, ChangeDetectionStrategy, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';

export interface SegmentedPillOption {
  id: string;
  label: string;
  icon?: string;
}

/**
 * Componente de selector segmentado con diseno curvo de píldora.
 */
@Component({
  selector: 'app-segmented-pill',
  templateUrl: './segmented-pill.component.html',
  styleUrls: ['./segmented-pill.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedPillComponent {
  /**
   * Lista de opciones seleccionables.
   */
  public readonly options = input.required<SegmentedPillOption[]>();

  /**
   * Identificador de la opcion activa con enlace bidireccional mediante Signal.
   */
  public readonly selectedId = model.required<string>();

  /**
   * Evento emitido al cambiar la seleccion.
   */
  public readonly selectionChange = output<string>();

  /**
   * Selecciona una opcion activa y notifica a los suscriptores.
   * @param id Identificador de la opcion seleccionada.
   */
  public selectOption(id: string): void {
    if (this.selectedId() !== id) {
      this.selectedId.set(id);
      this.selectionChange.emit(id);
    }
  }
}
