// src/app/shared/components/data-table/data-table.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  Signal,
  signal,
  computed,
  TemplateRef,
  ContentChildren,
  QueryList,
  AfterContentInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TableColumn, TableConfig, SortState } from './models';

/**
 * GenericDataTableComponent - Tabla de datos reutilizable y type-safe
 *
 * Componente standalone con soporte para:
 * - TypeScript generics para type safety
 * - Sorting (client-side y server-side)
 * - Row selection (single/multiple)
 * - Custom cell templates
 * - Empty/loading states
 * - Responsive design
 * - Accesibilidad completa
 *
 * @typeParam T - Tipo de los datos de cada fila
 *
 * @example
 * ```html
 * <app-data-table
 *   [data]="clients"
 *   [config]="tableConfig"
 *   [loading]="isLoading"
 *   [sortState]="currentSort"
 *   [selectedIds]="selectedIds"
 *   (rowClick)="onRowClick($event)"
 *   (selectionChange)="onSelectionChange($event)"
 *   (sortChange)="onSortChange($event)">
 * </app-data-table>
 * ```
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatCheckboxModule,
    MatTooltipModule
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.css'
})
export class GenericDataTableComponent<T> implements AfterContentInit {
  // ========================================
  // INPUTS
  // ========================================

  /** Datos a mostrar en la tabla (acepta cualquier Signal, readonly o writable) */
  @Input({ required: true }) data!: Signal<T[]>;

  /** Configuración de la tabla */
  @Input({ required: true }) config!: TableConfig<T>;

  /** Estado de loading (acepta cualquier Signal) */
  @Input() loading: Signal<boolean> = signal(false);

  /** Estado actual de ordenamiento (acepta cualquier Signal) */
  @Input() sortState: Signal<SortState | null> = signal(null);

  /** IDs de las filas seleccionadas (acepta cualquier Signal) */
  @Input() selectedIds: Signal<Set<string | number>> = signal(new Set());

  /** Función para trackBy en *ngFor (para performance) */
  @Input() trackByFn?: (index: number, item: T) => any;

  /** Campo que se usa como ID (por defecto 'id') */
  @Input() idField: keyof T = 'id' as keyof T;

  // ========================================
  // OUTPUTS
  // ========================================

  /** Emite cuando se hace click en una fila */
  @Output() rowClick = new EventEmitter<T>();

  /** Emite cuando cambia la selección */
  @Output() selectionChange = new EventEmitter<(string | number)[]>();

  /** Emite cuando se solicita cambiar el ordenamiento */
  @Output() sortChange = new EventEmitter<SortState>();

  /** Emite cuando se hace click en una acción */
  @Output() actionClick = new EventEmitter<{action: string, row: T}>();

  // ========================================
  // CONTENT CHILDREN (Templates personalizados)
  // ========================================

  @ContentChildren('columnTemplate') columnTemplates!: QueryList<TemplateRef<any>>;

  // ========================================
  // COMPUTED SIGNALS
  // ========================================

  /** Columnas visibles (filtra las que tienen visible=false) */
  displayedColumns = computed(() => {
    if (!this.config || !this.config.columns) return [];
    return this.config.columns.filter(col => col.visible !== false);
  });

  /** Si todas las filas están seleccionadas */
  allSelected = computed(() => {
    const selected = this.selectedIds();
    const data = this.data();
    return data.length > 0 && selected.size === data.length;
  });

  /** Si algunas filas están seleccionadas (pero no todas) */
  someSelected = computed(() => {
    const selected = this.selectedIds();
    const dataLength = this.data().length;
    return selected.size > 0 && selected.size < dataLength;
  });

  /** Si la tabla tiene selección habilitada */
  hasSelection = computed(() => {
    return this.config.selectable === true ||
           this.config.selectable === 'multiple' ||
           this.config.selectable === 'single';
  });

  /** Si se puede seleccionar múltiples filas */
  isMultipleSelection = computed(() => {
    return this.config.selectable === 'multiple' || this.config.selectable === true;
  });

  // ========================================
  // LIFECYCLE
  // ========================================

  ngAfterContentInit(): void {
    // Aquí podríamos mapear los templates personalizados a las columnas
    // Por ahora lo dejamos simple
  }

  // ========================================
  // SELECTION METHODS
  // ========================================

  /**
   * Toggle selección de una fila
   */
  toggleSelection(row: T, event?: MatCheckboxChange): void {
    if (event) {
      event.source._elementRef.nativeElement.blur(); // Quitar focus
    }

    const id = this.getRowId(row);
    const currentSelection = new Set(this.selectedIds());

    if (this.config.selectable === 'single') {
      // Single selection: solo puede haber uno seleccionado
      if (currentSelection.has(id)) {
        currentSelection.clear();
      } else {
        currentSelection.clear();
        currentSelection.add(id);
      }
    } else {
      // Multiple selection
      if (currentSelection.has(id)) {
        currentSelection.delete(id);
      } else {
        currentSelection.add(id);
      }
    }

    // Solo emitir el evento, no modificar el input signal
    this.selectionChange.emit(Array.from(currentSelection));
  }

  /**
   * Toggle selección de todas las filas
   */
  toggleSelectAll(event: MatCheckboxChange): void {
    // Prevenir propagación si es necesario
    event.source._elementRef.nativeElement.blur();

    const allSelected = this.allSelected();
    const newSelection = new Set<string | number>();

    if (!allSelected) {
      // Seleccionar todas
      this.data().forEach(row => {
        newSelection.add(this.getRowId(row));
      });
    }
    // Si ya están todas seleccionadas, dejamos el Set vacío (deseleccionar todas)

    // Solo emitir el evento, no modificar el input signal
    this.selectionChange.emit(Array.from(newSelection));
  }

  /**
   * Verifica si una fila está seleccionada
   */
  isRowSelected(row: T): boolean {
    return this.selectedIds().has(this.getRowId(row));
  }

  // ========================================
  // SORTING METHODS
  // ========================================

  /**
   * Maneja el click en un header de columna para ordenar
   */
  onHeaderClick(column: TableColumn<T>): void {
    if (!column.sortable || !this.config.sortable) return;

    const currentSort = this.sortState();
    const field = column.field as string;

    let newDirection: 'asc' | 'desc' = 'asc';

    // Si ya está ordenando por este campo, cambiar dirección
    if (currentSort && currentSort.field === field) {
      newDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
    }

    const newSort: SortState = {
      field,
      direction: newDirection
    };

    this.sortChange.emit(newSort);
  }

  /**
   * Obtiene el icono de ordenamiento para una columna
   */
  getSortIcon(column: TableColumn<T>): string {
    if (!column.sortable) return '';

    const currentSort = this.sortState();
    const field = column.field as string;

    if (!currentSort || currentSort.field !== field) {
      return ''; // No mostrar icono si no está ordenando por este campo
    }

    return currentSort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  /**
   * Verifica si una columna está actualmente ordenada
   */
  isColumnSorted(column: TableColumn<T>): boolean {
    const currentSort = this.sortState();
    return !!currentSort && currentSort.field === (column.field as string);
  }

  // ========================================
  // ROW METHODS
  // ========================================

  /**
   * Maneja el click en una fila
   */
  onRowClick(row: T, event: Event): void {
    // Si el click fue en el checkbox, no emitir rowClick
    const target = event.target as HTMLElement;
    if (target.closest('.checkbox-cell')) {
      return;
    }

    if (this.config.clickableRows) {
      this.rowClick.emit(row);
    }
  }

  /**
   * Obtiene el ID de una fila
   */
  getRowId(row: T): string | number {
    return row[this.idField] as string | number;
  }

  /**
   * TrackBy function por defecto
   */
  defaultTrackBy = (index: number, item: T): any => {
    return this.getRowId(item);
  };

  /**
   * Obtiene la función trackBy a usar
   */
  getTrackByFn(): (index: number, item: T) => any {
    return this.trackByFn || this.defaultTrackBy;
  }

  // ========================================
  // CELL VALUE METHODS
  // ========================================

  /**
   * Obtiene el valor de una celda
   */
  getCellValue(row: T, column: TableColumn<T>): any {
    if (!column.field) return '';

    const field = column.field as string;

    // Soportar nested fields (ej: 'user.name')
    if (field.includes('.')) {
      return this.getNestedValue(row, field);
    }

    return row[field as keyof T];
  }

  /**
   * Obtiene valor anidado de un objeto
   * @example getNestedValue(user, 'address.city') => 'Barcelona'
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Formatea el valor de una celda para mostrar
   */
  formatCellValue(value: any, column: TableColumn<T>, row: T): string {
    // Si hay formatter personalizado, usarlo
    if (column.valueFormatter) {
      return column.valueFormatter(value, row);
    }

    // Formateo por defecto según tipo
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (value instanceof Date) return value.toLocaleDateString();

    return String(value);
  }

  /**
   * Obtiene las clases CSS para una celda
   */
  getCellClasses(column: TableColumn<T>, row: T): string | string[] {
    if (!column.cellClass) return '';

    if (typeof column.cellClass === 'function') {
      return column.cellClass(row);
    }

    return column.cellClass;
  }

  /**
   * Obtiene las clases del tema para la tabla
   */
  getThemeClasses(): string {
    const theme = this.config.themeColor || 'purple';
    const themes: Record<string, string> = {
      purple: 'theme-purple',
      amber: 'theme-amber',
      blue: 'theme-blue',
      green: 'theme-green'
    };
    return themes[theme];
  }

  /**
   * Obtiene las clases de altura de fila
   */
  getRowHeightClass(): string {
    const height = this.config.rowHeight || 'normal';
    const classes: Record<string, string> = {
      compact: 'row-compact',
      normal: 'row-normal',
      comfortable: 'row-comfortable'
    };
    return classes[height];
  }
}
