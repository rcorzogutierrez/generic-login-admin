// src/app/modules/clients/components/form-designer/form-designer.component.ts
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, computed, inject, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';

import { FieldConfig, FieldType } from '../../models';
import { FormLayoutConfig, FieldPosition, FormButtonsConfig } from '../../models/client-module-config.interface';
import { FieldConfigDialogComponent } from '../field-config-dialog/field-config-dialog.component';

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
  private dialog = inject(MatDialog);

  // Convert to signal inputs for reactivity
  fields = input<FieldConfig[]>([]);
  layout = input<FormLayoutConfig | undefined>();

  @Output() layoutChange = new EventEmitter<FormLayoutConfig>();
  @Output() fieldAdded = new EventEmitter<void>();

  // Configuration signals
  columns = signal<2 | 3 | 4>(3);
  spacing = signal<'compact' | 'normal' | 'spacious'>('normal');

  // Layout state - Map of "row-col" to field
  gridFieldPositions = signal<Map<string, FieldConfig>>(new Map());

  // Available fields (not yet placed in grid)
  availableFields = signal<FieldConfig[]>([]);

  // Computed grid structure
  gridCells = computed(() => {
    const cols = this.columns();
    const rows = Math.max(3, Math.ceil(this.fields().length / cols));
    return Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => ({ row, col }))
    );
  });

  // Connected drop list IDs for CDK
  gridDropListIds = computed(() => {
    return this.gridCells().flat().map(cell => `grid-${cell.row}-${cell.col}`);
  });

  // Button configuration
  buttonsConfig = signal<FormButtonsConfig>({
    position: 'right',
    order: ['save', 'cancel'],
    style: 'inline',
    showLabels: true
  });

  constructor() {
    // React to changes in fields or layout inputs
    effect(() => {
      const currentFields = this.fields();
      const currentLayout = this.layout();

      // Initialize with existing layout or set all fields as available
      if (currentLayout) {
        this.columns.set(currentLayout.columns);
        this.spacing.set(currentLayout.spacing);
        this.buttonsConfig.set(currentLayout.buttons);

        // Separate placed fields from available
        const gridPositions = new Map<string, FieldConfig>();
        const available: FieldConfig[] = [];

        currentFields.forEach(field => {
          const fieldPos = currentLayout.fields[field.id];
          if (fieldPos) {
            // Field has a position, place it in the grid
            const key = `${fieldPos.row}-${fieldPos.col}`;
            gridPositions.set(key, field);
          } else {
            // Field not positioned, add to available
            available.push(field);
          }
        });

        this.gridFieldPositions.set(gridPositions);
        this.availableFields.set(available);
      } else {
        // All fields start as available
        this.availableFields.set([...currentFields]);
      }
    });
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
   * Handles drop event when field is dropped on a grid cell
   */
  onGridCellDrop(event: CdkDragDrop<string>, row: number, col: number) {
    const cellKey = `${row}-${col}`;

    // Check if cell already has a field
    if (this.gridFieldPositions().has(cellKey)) {
      console.log('Cell already occupied');
      return;
    }

    const sourceListId = event.previousContainer.id;

    if (sourceListId === 'available-fields') {
      // Dragging from palette to grid
      const field = this.availableFields()[event.previousIndex];

      // Remove from available
      this.availableFields.update(fields => {
        const newFields = [...fields];
        newFields.splice(event.previousIndex, 1);
        return newFields;
      });

      // Add to grid
      this.gridFieldPositions.update(positions => {
        const newPositions = new Map(positions);
        newPositions.set(cellKey, field);
        return newPositions;
      });

      this.emitLayoutChange();
    } else if (sourceListId.startsWith('grid-')) {
      // Moving between grid cells
      const [sourceRow, sourceCol] = sourceListId.replace('grid-', '').split('-').map(Number);
      const sourceKey = `${sourceRow}-${sourceCol}`;

      const field = this.gridFieldPositions().get(sourceKey);
      if (field) {
        this.gridFieldPositions.update(positions => {
          const newPositions = new Map(positions);
          newPositions.delete(sourceKey);
          newPositions.set(cellKey, field);
          return newPositions;
        });

        this.emitLayoutChange();
      }
    }
  }

  /**
   * Removes a field from the grid and returns it to available fields
   */
  removeFieldFromGrid(row: number, col: number) {
    const cellKey = `${row}-${col}`;
    const field = this.gridFieldPositions().get(cellKey);

    if (field) {
      // Remove from grid
      this.gridFieldPositions.update(positions => {
        const newPositions = new Map(positions);
        newPositions.delete(cellKey);
        return newPositions;
      });

      // Add back to available
      this.availableFields.update(fields => [...fields, field]);

      this.emitLayoutChange();
    }
  }

  /**
   * Gets the field placed at a specific cell
   */
  getFieldAtCell(row: number, col: number): FieldConfig | null {
    const cellKey = `${row}-${col}`;
    return this.gridFieldPositions().get(cellKey) || null;
  }

  /**
   * Gets the drop list ID for a cell
   */
  getCellDropListId(row: number, col: number): string {
    return `grid-${row}-${col}`;
  }

  /**
   * Gets all connected drop list IDs for a grid cell
   * Includes the palette and all other grid cells
   */
  getConnectedDropListIds(): string[] {
    return ['available-fields', ...this.gridDropListIds()];
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
    const layoutConfig: FormLayoutConfig = {
      columns: this.columns(),
      fields: this.buildFieldPositions(),
      buttons: this.buttonsConfig(),
      spacing: this.spacing(),
      showSections: false
    };

    this.layoutChange.emit(layoutConfig);
  }

  /**
   * Builds the field positions map from current state
   */
  private buildFieldPositions(): { [fieldId: string]: FieldPosition } {
    const positions: { [fieldId: string]: FieldPosition } = {};
    const cols = this.columns();

    // Build positions from gridFieldPositions
    this.gridFieldPositions().forEach((field, cellKey) => {
      const [row, col] = cellKey.split('-').map(Number);

      positions[field.id] = {
        row,
        col,
        colSpan: 1, // Por defecto ocupa 1 columna
        order: row * cols + col // Orden basado en posición
      };
    });

    return positions;
  }

  /**
   * Abrir dialog para agregar nuevo campo
   */
  addNewField() {
    const dialogRef = this.dialog.open(FieldConfigDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        mode: 'create'
      },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // El campo fue creado exitosamente
        // Emitir evento para que el componente padre recargue los campos
        this.fieldAdded.emit();
      }
    });
  }

  /**
   * Abrir dialog para editar campo existente
   */
  editField(field: FieldConfig) {
    const dialogRef = this.dialog.open(FieldConfigDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        mode: 'edit',
        field: field
      },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // El campo fue editado exitosamente
        // Emitir evento para que el componente padre recargue los campos
        this.fieldAdded.emit();
      }
    });
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
