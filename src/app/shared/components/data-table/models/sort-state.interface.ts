// src/app/shared/components/data-table/models/sort-state.interface.ts

/**
 * Estado del ordenamiento de la tabla
 *
 * @example
 * ```typescript
 * const sort: SortState = {
 *   field: 'name',
 *   direction: 'asc'
 * };
 * ```
 */
export interface SortState {
  /** Campo por el cual se está ordenando */
  field: string;

  /** Dirección del ordenamiento */
  direction: 'asc' | 'desc';
}
