// src/app/shared/components/data-table/models/table-column.interface.ts
import { TemplateRef } from '@angular/core';

/**
 * Configuración de una columna de tabla
 *
 * @typeParam T - Tipo de los datos de la fila
 *
 * @example
 * ```typescript
 * const column: TableColumn<Client> = {
 *   id: 'name',
 *   label: 'Nombre',
 *   field: 'name',
 *   sortable: true,
 *   width: '200px'
 * };
 * ```
 */
export interface TableColumn<T = any> {
  /** Identificador único de la columna */
  id: string;

  /** Etiqueta mostrada en el header */
  label: string;

  /** Campo del objeto a mostrar (soporta nested: 'user.name') */
  field?: keyof T | string;

  /** Si la columna es ordenable */
  sortable?: boolean;

  /** Si la columna es filtrable */
  filterable?: boolean;

  /** Ancho CSS de la columna (ej: '200px', '20%', 'auto') */
  width?: string;

  /** Alineación del header */
  headerAlign?: 'left' | 'center' | 'right';

  /** Alineación de las celdas */
  cellAlign?: 'left' | 'center' | 'right';

  // ========================================
  // CUSTOM RENDERING
  // ========================================

  /** Template personalizado para la celda */
  cellTemplate?: TemplateRef<any>;

  /** Template personalizado para el header */
  headerTemplate?: TemplateRef<any>;

  /** Función para transformar el valor antes de mostrarlo */
  valueFormatter?: (value: any, row: T) => string;

  // ========================================
  // CSS CLASSES
  // ========================================

  /** Clases CSS para el header */
  headerClass?: string | string[];

  /** Clases CSS para las celdas (puede ser función para clases dinámicas) */
  cellClass?: string | string[] | ((row: T) => string | string[]);

  // ========================================
  // VISIBILITY
  // ========================================

  /** Si la columna está visible (por defecto true) */
  visible?: boolean;

  /** Si la columna se oculta en móvil */
  hiddenOnMobile?: boolean;

  /** Si la columna se oculta en tablet */
  hiddenOnTablet?: boolean;

  // ========================================
  // METADATA
  // ========================================

  /** Tooltip para el header */
  tooltip?: string;

  /** Si la columna es sticky (se mantiene fija al hacer scroll horizontal) */
  sticky?: 'left' | 'right';

  /** Orden de la columna (para reordenamiento) */
  order?: number;
}
