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
import { MatSnackBar } from '@angular/material/snack-bar';

import { FieldConfig, FieldType } from '../../models';
import { FormLayoutConfig, FieldPosition, FormButtonsConfig } from '../../models/client-module-config.interface';
import { FieldConfigDialogComponent } from '../field-config-dialog/field-config-dialog.component';
import { ClientConfigService } from '../../services/client-config.service';

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
  private configService = inject(ClientConfigService);
  private snackBar = inject(MatSnackBar);

  // Convert to signal inputs for reactivity
  fields = input<FieldConfig[]>([]);
  layout = input<FormLayoutConfig | undefined>();

  @Output() layoutChange = new EventEmitter<FormLayoutConfig>();
  @Output() fieldAdded = new EventEmitter<void>();

  // Configuration signals
  columns = signal<2 | 3 | 4>(3);
  spacing = signal<'compact' | 'normal' | 'spacious'>('normal');
  hasUnsavedChanges = signal<boolean>(false);

  // Layout state - Map of "row-col" to field
  gridFieldPositions = signal<Map<string, FieldConfig>>(new Map());

  // Available fields (not yet placed in grid)
  availableFields = signal<FieldConfig[]>([]);

  // Track if layout has been initialized to prevent re-loading on every change
  private isLayoutInitialized = false;

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
    // Effect 1: Cargar el layout inicial UNA SOLA VEZ
    effect(() => {
      const currentFields = this.fields();
      const currentLayout = this.layout();

      console.log('🔄 Effect 1 (Layout inicial) - isLayoutInitialized:', this.isLayoutInitialized);
      console.log('   currentFields.length:', currentFields.length);
      console.log('   currentLayout:', currentLayout ? 'exists' : 'undefined');

      // Solo cargar el layout la primera vez
      if (!this.isLayoutInitialized && currentFields.length > 0) {
        console.log('📥 Cargando layout inicial...');

        // Initialize with existing layout or set all fields as available
        if (currentLayout) {
          this.columns.set(currentLayout.columns);
          this.spacing.set(currentLayout.spacing);
          this.buttonsConfig.set(currentLayout.buttons);

          // Crear un Set de IDs de campos actuales para búsqueda rápida
          const currentFieldIds = new Set(currentFields.map(f => f.id));

          // Separate placed fields from available
          const gridPositions = new Map<string, FieldConfig>();
          const available: FieldConfig[] = [];

          currentFields.forEach(field => {
            const fieldPos = currentLayout.fields[field.id];
            if (fieldPos) {
              // Field has a position, place it in the grid
              const key = `${fieldPos.row}-${fieldPos.col}`;
              gridPositions.set(key, field);
              console.log(`   ✓ Campo posicionado: ${field.label} en (${fieldPos.row},${fieldPos.col})`);
            } else {
              // Field not positioned, add to available
              available.push(field);
              console.log(`   ○ Campo disponible: ${field.label}`);
            }
          });

          // Detectar si hay campos en el layout que ya no existen
          const layoutFieldIds = Object.keys(currentLayout.fields);
          const orphanedFields = layoutFieldIds.filter(id => !currentFieldIds.has(id));

          if (orphanedFields.length > 0) {
            console.warn('⚠️ Layout contiene referencias a campos inexistentes:', orphanedFields);
          }

          this.gridFieldPositions.set(gridPositions);
          this.availableFields.set(available);

          console.log(`✅ Layout cargado: ${gridPositions.size} campos en grid, ${available.length} disponibles`);
        } else {
          // All fields start as available
          this.availableFields.set([...currentFields]);
          console.log(`✅ Sin layout guardado: ${currentFields.length} campos disponibles`);
        }

        // Marcar como inicializado para no volver a cargar
        this.isLayoutInitialized = true;
        console.log('🔒 Layout inicializado, no se volverá a cargar automáticamente');
      } else {
        console.log('⏭️ Effect 1 ignorado (ya inicializado o sin campos)');
      }
    });

    // Effect 2: Detectar nuevos campos agregados después de la inicialización
    effect(() => {
      const currentFields = this.fields();

      // Solo ejecutar si el layout ya fue inicializado
      if (this.isLayoutInitialized && currentFields.length > 0) {
        console.log('🔄 Effect 2 (Nuevos campos) - Verificando nuevos campos...');

        // Obtener IDs de campos que ya están en el grid o en availableFields
        const gridFieldIds = new Set<string>();
        this.gridFieldPositions().forEach(field => gridFieldIds.add(field.id));

        const availFieldIds = new Set(this.availableFields().map(f => f.id));

        // Encontrar nuevos campos que no están ni en grid ni en availableFields
        const newFields = currentFields.filter(field =>
          !gridFieldIds.has(field.id) && !availFieldIds.has(field.id)
        );

        if (newFields.length > 0) {
          console.log(`   ➕ ${newFields.length} campos nuevos detectados:`, newFields.map(f => f.label));
          // Agregar nuevos campos a availableFields
          this.availableFields.update(current => [...current, ...newFields]);
        }
      }
    });
  }

  /**
   * Changes the number of columns in the grid
   */
  setColumns(cols: 2 | 3 | 4) {
    this.columns.set(cols);
    this.markAsChanged();
  }

  /**
   * Changes the spacing between fields
   */
  setSpacing(spacing: 'compact' | 'normal' | 'spacious') {
    this.spacing.set(spacing);
    this.markAsChanged();
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

      this.markAsChanged();
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

        this.markAsChanged();
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

      this.markAsChanged();
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
    this.markAsChanged();
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
      [FieldType.DICTIONARY]: 'list_alt',
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
   * Marca que hay cambios sin guardar
   */
  private markAsChanged() {
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Guarda el layout actual
   */
  saveLayout() {
    console.log('💾 saveLayout() - Guardando layout...');
    console.log('   Grid positions:', this.gridFieldPositions().size);
    console.log('   Columns:', this.columns());
    console.log('   Spacing:', this.spacing());

    const fieldPositions = this.buildFieldPositions();
    console.log('   Field positions a guardar:', Object.keys(fieldPositions).length);

    const layoutConfig: FormLayoutConfig = {
      columns: this.columns(),
      fields: fieldPositions,
      buttons: this.buttonsConfig(),
      spacing: this.spacing(),
      showSections: false
    };

    console.log('📤 Emitiendo layoutChange event:', layoutConfig);
    this.layoutChange.emit(layoutConfig);
    this.hasUnsavedChanges.set(false);
    console.log('✅ Layout emitido, hasUnsavedChanges = false');
  }

  /**
   * Obtiene el layout actual sin guardarlo
   */
  getCurrentLayout(): FormLayoutConfig {
    return {
      columns: this.columns(),
      fields: this.buildFieldPositions(),
      buttons: this.buttonsConfig(),
      spacing: this.spacing(),
      showSections: false
    };
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
   * Eliminar un campo personalizado permanentemente
   */
  async deleteField(field: FieldConfig) {
    if (field.isSystem) {
      this.snackBar.open('No se pueden eliminar campos del sistema', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      await this.configService.deleteField(field.id);

      // Remover del grid si está posicionado
      const cellKey = Array.from(this.gridFieldPositions().entries())
        .find(([_, f]) => f.id === field.id)?.[0];

      if (cellKey) {
        this.gridFieldPositions.update(positions => {
          const newPositions = new Map(positions);
          newPositions.delete(cellKey);
          return newPositions;
        });
      }

      // Remover de availableFields si está ahí
      this.availableFields.update(fields => fields.filter(f => f.id !== field.id));

      this.snackBar.open('Campo eliminado exitosamente', 'Cerrar', { duration: 3000 });

      // Emitir evento para recargar
      this.fieldAdded.emit();
    } catch (error) {
      console.error('Error eliminando campo:', error);
      this.snackBar.open('Error al eliminar el campo', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Obtiene los campos ordenados para la previsualización
   * IMPORTANTE: Solo muestra los campos que están ACTUALMENTE posicionados en el grid,
   * NO los campos disponibles en la paleta ni campos del layout guardado
   */
  getOrderedFieldsForPreview(): FieldConfig[] {
    const gridPositions = this.gridFieldPositions();

    console.log('🔍 Preview: gridFieldPositions size:', gridPositions.size);

    // Si no hay campos en el grid, retornar array vacío
    if (gridPositions.size === 0) {
      console.log('✅ Preview: Grid vacío, mostrando 0 campos');
      return [];
    }

    // Convertir el Map a array con información de posición
    const fieldsWithPositions: Array<{
      field: FieldConfig;
      row: number;
      col: number;
    }> = [];

    gridPositions.forEach((field, cellKey) => {
      const [row, col] = cellKey.split('-').map(Number);
      fieldsWithPositions.push({ field, row, col });
      console.log(`  - Campo en grid: ${field.label} (${row},${col})`);
    });

    // Ordenar por row y col
    fieldsWithPositions.sort((a, b) => {
      if (a.row !== b.row) {
        return a.row - b.row;
      }
      return a.col - b.col;
    });

    const result = fieldsWithPositions.map(item => item.field);
    console.log(`✅ Preview mostrando ${result.length} campos`);

    return result;
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
