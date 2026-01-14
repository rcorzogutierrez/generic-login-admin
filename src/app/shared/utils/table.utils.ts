// src/app/shared/utils/table.utils.ts

/**
 * Utilidades para manejo de tablas y datos
 *
 * Funciones reutilizables para:
 * - Obtener valores anidados
 * - Ordenar datos
 * - Filtrar datos
 * - Obtener valores únicos
 */

/**
 * Obtiene el valor de una propiedad anidada en un objeto
 *
 * @param obj - Objeto del cual obtener el valor
 * @param path - Ruta a la propiedad (ej: 'user.address.city')
 * @returns El valor en la ruta especificada o undefined
 *
 * @example
 * ```typescript
 * const user = { address: { city: 'Barcelona' } };
 * getNestedValue(user, 'address.city'); // 'Barcelona'
 * ```
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;

  return path.split('.').reduce((current, prop) => {
    return current?.[prop];
  }, obj);
}

/**
 * Ordena un array de objetos por un campo específico
 *
 * @param data - Array a ordenar
 * @param field - Campo por el cual ordenar (soporta nested: 'user.name')
 * @param direction - Dirección del ordenamiento
 * @param valueGetter - Función opcional para obtener/transformar el valor antes de comparar
 * @returns Array ordenado (crea una copia, no muta el original)
 *
 * @example
 * ```typescript
 * const users = [{ name: 'Juan' }, { name: 'Ana' }];
 * sortData(users, 'name', 'asc'); // [{ name: 'Ana' }, { name: 'Juan' }]
 * ```
 */
export function sortData<T>(
  data: T[],
  field: string,
  direction: 'asc' | 'desc' = 'asc',
  valueGetter?: (item: T) => any
): T[] {
  if (!data || data.length === 0) return [];

  return [...data].sort((a, b) => {
    // Obtener valores a comparar
    let aValue = valueGetter ? valueGetter(a) : getNestedValue(a, field);
    let bValue = valueGetter ? valueGetter(b) : getNestedValue(b, field);

    // Manejar valores null/undefined
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    // Determinar tipo y comparar
    let comparison = 0;

    // Si son números
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    }
    // Si son fechas
    else if (aValue instanceof Date && bValue instanceof Date) {
      comparison = aValue.getTime() - bValue.getTime();
    }
    // Si son booleanos
    else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      comparison = (aValue === bValue) ? 0 : aValue ? 1 : -1;
    }
    // Comparación de strings (case-insensitive)
    else {
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      comparison = aStr.localeCompare(bStr);
    }

    // Aplicar dirección
    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Filtra un array de objetos buscando un término en múltiples campos
 *
 * @param data - Array a filtrar
 * @param searchTerm - Término de búsqueda (case-insensitive)
 * @param searchFields - Campos en los que buscar (soporta nested paths)
 * @returns Array filtrado
 *
 * @example
 * ```typescript
 * const users = [
 *   { name: 'Juan', email: '[email protected]' },
 *   { name: 'Ana', email: '[email protected]' }
 * ];
 * filterData(users, 'juan', ['name', 'email']); // [{ name: 'Juan', ... }]
 * ```
 */
export function filterData<T>(
  data: T[],
  searchTerm: string,
  searchFields: (keyof T | string)[]
): T[] {
  if (!data || data.length === 0) return [];
  if (!searchTerm || searchTerm.trim() === '') return data;

  const term = searchTerm.toLowerCase().trim();

  return data.filter(item => {
    // Buscar en todos los campos especificados
    return searchFields.some(field => {
      const value = getNestedValue(item, field as string);

      if (value === null || value === undefined) return false;

      // Si es array, buscar en cada elemento
      if (Array.isArray(value)) {
        return value.some(v =>
          String(v).toLowerCase().includes(term)
        );
      }

      // Buscar en el valor convertido a string
      return String(value).toLowerCase().includes(term);
    });
  });
}

/**
 * Obtiene los valores únicos de un campo con su conteo de ocurrencias
 *
 * @param data - Array de datos
 * @param field - Campo del cual extraer valores únicos
 * @param labelFormatter - Función opcional para formatear las etiquetas
 * @returns Array de objetos con value, label y count
 *
 * @example
 * ```typescript
 * const users = [
 *   { status: 'active' },
 *   { status: 'active' },
 *   { status: 'inactive' }
 * ];
 * getUniqueValues(users, 'status');
 * // [
 * //   { value: 'active', label: 'active', count: 2 },
 * //   { value: 'inactive', label: 'inactive', count: 1 }
 * // ]
 * ```
 */
export function getUniqueValues<T>(
  data: T[],
  field: keyof T | string,
  labelFormatter?: (value: any) => string
): Array<{ value: any; label: string; count: number }> {
  if (!data || data.length === 0) return [];

  // Mapa para contar ocurrencias
  const valuesMap = new Map<any, number>();

  // Contar valores
  for (const item of data) {
    const value = getNestedValue(item, field as string);

    if (value !== null && value !== undefined && value !== '') {
      // Si es array, contar cada elemento
      if (Array.isArray(value)) {
        for (const v of value) {
          valuesMap.set(v, (valuesMap.get(v) || 0) + 1);
        }
      } else {
        valuesMap.set(value, (valuesMap.get(value) || 0) + 1);
      }
    }
  }

  // Convertir a array con formato
  const uniqueValues = Array.from(valuesMap.entries()).map(([value, count]) => {
    const label = labelFormatter ? labelFormatter(value) : String(value);
    return { value, label, count };
  });

  // Ordenar por label
  uniqueValues.sort((a, b) => a.label.localeCompare(b.label));

  return uniqueValues;
}

/**
 * Aplica múltiples filtros a un dataset
 *
 * @param data - Array de datos
 * @param filters - Objeto con los filtros a aplicar { campo: valor }
 * @returns Array filtrado
 *
 * @example
 * ```typescript
 * const users = [
 *   { name: 'Juan', age: 30, city: 'Madrid' },
 *   { name: 'Ana', age: 25, city: 'Barcelona' }
 * ];
 * applyFilters(users, { city: 'Madrid' }); // [{ name: 'Juan', ... }]
 * ```
 */
export function applyFilters<T>(
  data: T[],
  filters: Record<string, any>
): T[] {
  if (!data || data.length === 0) return [];
  if (!filters || Object.keys(filters).length === 0) return data;

  return data.filter(item => {
    // El item debe cumplir TODOS los filtros
    return Object.entries(filters).every(([field, filterValue]) => {
      // Si el filtro está vacío, no filtrar por este campo
      if (filterValue === null || filterValue === undefined || filterValue === '') {
        return true;
      }

      const itemValue = getNestedValue(item, field);

      // Si el valor del item es null/undefined, no coincide
      if (itemValue === null || itemValue === undefined) {
        return false;
      }

      // Si el filtro es un array, verificar si el valor está en el array
      if (Array.isArray(filterValue)) {
        return filterValue.includes(itemValue);
      }

      // Si el valor del item es un array, verificar si contiene el filtro
      if (Array.isArray(itemValue)) {
        return itemValue.includes(filterValue);
      }

      // Comparación directa
      return itemValue === filterValue;
    });
  });
}

/**
 * Pagina un array de datos
 *
 * @param data - Array de datos
 * @param page - Número de página (0-indexed)
 * @param pageSize - Tamaño de página
 * @returns Slice del array para la página especificada
 *
 * @example
 * ```typescript
 * const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * paginateData(data, 0, 3); // [1, 2, 3]
 * paginateData(data, 1, 3); // [4, 5, 6]
 * ```
 */
export function paginateData<T>(
  data: T[],
  page: number,
  pageSize: number
): T[] {
  if (!data || data.length === 0) return [];
  if (page < 0) page = 0;

  const start = page * pageSize;
  const end = start + pageSize;

  return data.slice(start, end);
}

/**
 * Calcula el número total de páginas
 *
 * @param totalItems - Total de items
 * @param pageSize - Tamaño de página
 * @returns Número total de páginas
 */
export function calculateTotalPages(totalItems: number, pageSize: number): number {
  if (totalItems <= 0 || pageSize <= 0) return 0;
  return Math.ceil(totalItems / pageSize);
}
