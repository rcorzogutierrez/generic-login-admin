// src/app/modules/clients/components/form-designer/form-designer.component.ts
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';

import { FieldConfig, FieldType } from '../../models';
import { FormLayoutConfig, FieldPosition, FormButtonsConfig } from '../../models/client-module-config.interface';

@Component({
  selector: 'app-form-designer',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule
  ],
  templateUrl: './form-designer.component.html',
  styleUrl: './form-designer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormDesignerComponent {
  @Input() fields: FieldConfig[] = [];
  @Input() layout?: FormLayoutConfig;
  @Output() layoutChange = new EventEmitter<FormLayoutConfig>();

  // Configuration signals
  columns = signal<2 | 3 | 4>(3);
  spacing = signal<'compact' | 'normal' | 'spacious'>('normal');

  // Layout state
  gridCells = computed(() => {
    const cols = this.columns();
    const rows = Math.max(3, Math.ceil(this.fields.length / cols));
    return Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => ({ row, col }))
    );
  });

  // Available fields (not yet placed in grid)
  availableFields = signal<FieldConfig[]>([]);

  // Placed fields (in grid)
  placedFields = signal<Map<string, FieldConfig>>(new Map());

  // Button configuration
  buttonsConfig = signal<FormButtonsConfig>({
    position: 'right',
    order: ['save', 'cancel'],
    style: 'inline',
    showLabels: true
  });

  ngOnInit() {
    // Initialize with existing layout or set all fields as available
    if (this.layout) {
      this.columns.set(this.layout.columns);
      this.spacing.set(this.layout.spacing);
      this.buttonsConfig.set(this.layout.buttons);

      // Separate placed fields from available
      const placed = new Map<string, FieldConfig>();
      const available: FieldConfig[] = [];

      this.fields.forEach(field => {
        if (this.layout?.fields[field.id]) {
          placed.set(field.id, field);
        } else {
          available.push(field);
        }
      });

      this.placedFields.set(placed);
      this.availableFields.set(available);
    } else {
      // All fields start as available
      this.availableFields.set([...this.fields]);
    }
  }

  /**
   * Changes the number of columns in the grid
   */
  setColumns(cols: 2 | 3 | 4) {
    this.columns.set(cols);
    this.emitLayoutChange();
  }

  /**
   * Changes the spacing between fields
   */
  setSpacing(spacing: 'compact' | 'normal' | 'spacious') {
    this.spacing.set(spacing);
    this.emitLayoutChange();
  }

  /**
   * Handles drop event for fields
   */
  onFieldDrop(event: CdkDragDrop<any>, row: number, col: number) {
    if (event.previousContainer === event.container) {
      // Moving within the same container
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      // Moving from available to grid or vice versa
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    this.emitLayoutChange();
  }

  /**
   * Gets the field placed at a specific cell
   */
  getFieldAtCell(row: number, col: number): FieldConfig | null {
    // Implementation will depend on how we store field positions
    // For now, return null
    return null;
  }

  /**
   * Updates button configuration
   */
  updateButtonConfig(config: Partial<FormButtonsConfig>) {
    this.buttonsConfig.update(current => ({ ...current, ...config }));
    this.emitLayoutChange();
  }

  /**
   * Gets the icon for a field type
   */
  getFieldTypeIcon(type: FieldType): string {
    const icons: Record<FieldType, string> = {
      [FieldType.TEXT]: 'text_fields',
      [FieldType.NUMBER]: 'numbers',
      [FieldType.EMAIL]: 'email',
      [FieldType.PHONE]: 'phone',
      [FieldType.SELECT]: 'arrow_drop_down_circle',
      [FieldType.MULTISELECT]: 'checklist',
      [FieldType.DATE]: 'calendar_today',
      [FieldType.DATETIME]: 'event',
      [FieldType.CHECKBOX]: 'check_box',
      [FieldType.TEXTAREA]: 'notes',
      [FieldType.URL]: 'link',
      [FieldType.CURRENCY]: 'attach_money'
    };
    return icons[type] || 'help_outline';
  }

  /**
   * Emits the current layout configuration
   */
  private emitLayoutChange() {
    const layout: FormLayoutConfig = {
      columns: this.columns(),
      fields: this.buildFieldPositions(),
      buttons: this.buttonsConfig(),
      spacing: this.spacing(),
      showSections: false
    };

    this.layoutChange.emit(layout);
  }

  /**
   * Builds the field positions map from current state
   */
  private buildFieldPositions(): { [fieldId: string]: FieldPosition } {
    const positions: { [fieldId: string]: FieldPosition } = {};

    // TODO: Build actual positions from grid state
    // For now, return empty object

    return positions;
  }

  /**
   * Tracking function for @for
   */
  trackByFieldId(index: number, field: FieldConfig): string {
    return field.id;
  }

  /**
   * Tracking function for grid cells
   */
  trackByCell(index: number, cell: { row: number; col: number }): string {
    return `${cell.row}-${cell.col}`;
  }
}
