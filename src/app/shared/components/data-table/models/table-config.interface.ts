// src/app/shared/components/data-table/models/table-config.interface.ts
import { TableColumn } from './table-column.interface';

/**
 * Configuración general de la tabla
 *
 * @typeParam T - Tipo de los datos de la fila
 *
 * @example
 * ```typescript
 * const config: TableConfig<Client> = {
 *   columns: clientColumns,
 *   selectable: 'multiple',
 *   sortable: true,
 *   clickableRows: true,
 *   themeColor: 'purple'
 * };
 * ```
 */
export interface TableConfig<T = any> {
  /** Columnas de la tabla */
  columns: TableColumn<T>[];

  // ========================================
  // SELECTION
  // ========================================

  /** Si las filas son seleccionables (false, 'single', 'multiple') */
  selectable?: boolean | 'single' | 'multiple';

  /** Si mostrar checkbox en el header para seleccionar todas */
  showSelectAll?: boolean;

  // ========================================
  // SORTING
  // ========================================

  /** Si la tabla soporta ordenamiento */
  sortable?: boolean;

  /** Dirección de ordenamiento por defecto */
  defaultSortDirection?: 'asc' | 'desc';

  // ========================================
  // APPEARANCE
  // ========================================

  /** Si el header es sticky (se mantiene visible al hacer scroll) */
  stickyHeader?: boolean;

  /** Altura de las filas */
  rowHeight?: 'compact' | 'normal' | 'comfortable';

  /** Si las filas tienen efecto hover */
  hoverEffect?: boolean;

  /** Si las filas son clickeables */
  clickableRows?: boolean;

  /** Tema de color */
  themeColor?: 'purple' | 'amber' | 'blue' | 'green';

  /** Si mostrar bordes entre filas */
  showRowBorders?: boolean;

  /** Si alternar colores de filas (striped) */
  stripedRows?: boolean;

  // ========================================
  // EMPTY STATE
  // ========================================

  /** Mensaje cuando no hay datos */
  emptyMessage?: string;

  /** Icono del empty state */
  emptyIcon?: string;

  /** Mensaje durante carga */
  loadingMessage?: string;

  // ========================================
  // PERFORMANCE
  // ========================================

  /** Habilitar virtual scrolling para grandes datasets */
  enableVirtualScroll?: boolean;

  /** Altura de cada item para virtual scroll (en px) */
  virtualScrollItemSize?: number;

  /** Altura total del contenedor de virtual scroll */
  virtualScrollHeight?: string;

  // ========================================
  // RESPONSIVE
  // ========================================

  /** Si hacer la tabla responsive con scroll horizontal en móvil */
  responsiveScroll?: boolean;

  /** Si colapsar a cards en móvil */
  responsiveCards?: boolean;

  // ========================================
  // ACTIONS
  // ========================================

  /** Si mostrar columna de acciones */
  showActionsColumn?: boolean;

  /** Label de la columna de acciones */
  actionsColumnLabel?: string;

  /** Ancho de la columna de acciones */
  actionsColumnWidth?: string;
}
