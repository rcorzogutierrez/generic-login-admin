/**
 * Utilidad compartida para formatear valores de campos según su tipo
 * Centraliza la lógica de formateo que estaba duplicada en Clients, Workers y Materials
 */

/**
 * Interfaz para el campo con opciones
 */
export interface FieldWithOptions {
  type: string;
  options?: Array<{ value: string; label: string }>;
}

/**
 * Formatea un valor de campo según su tipo para visualización
 *
 * @param value - El valor a formatear
 * @param field - La configuración del campo (tipo, opciones, etc.)
 * @returns El valor formateado como string
 *
 * @example
 * ```typescript
 * // Formatear fecha
 * formatFieldValue(new Date(), { type: 'date' }) // "10/11/2025"
 *
 * // Formatear select
 * formatFieldValue('active', {
 *   type: 'select',
 *   options: [{ value: 'active', label: 'Activo' }]
 * }) // "Activo"
 *
 * // Formatear currency
 * formatFieldValue(1500.50, { type: 'currency' }) // "$1,500.50"
 * ```
 */
export function formatFieldValue(value: any, field: FieldWithOptions): string {
  // Valores nulos o indefinidos
  if (value === null || value === undefined) {
    return '-';
  }

  const fieldType = field.type;

  switch (fieldType) {
    case 'date':
      return new Date(value).toLocaleDateString();

    case 'datetime':
      return new Date(value).toLocaleString();

    case 'checkbox':
      return value ? 'Sí' : 'No';

    case 'currency':
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD'
      }).format(value);

    case 'select':
      // Buscar el label correspondiente al value en las opciones
      if (field.options && Array.isArray(field.options)) {
        const option = field.options.find(opt => opt.value === value);
        return option ? option.label : String(value);
      }
      return String(value);

    case 'multiselect':
      // Manejar múltiples valores
      if (Array.isArray(value) && field.options) {
        const labels = value.map((val: string) => {
          const option = field.options!.find(opt => opt.value === val);
          return option ? option.label : val;
        });
        return labels.join(', ');
      }
      return String(value);

    case 'dictionary':
      // Formatear objeto como pares clave-valor
      if (typeof value === 'object' && value !== null) {
        const entries = Object.entries(value);
        if (entries.length === 0) {
          return '-';
        }
        // Mostrar los primeros 2 pares clave-valor con labels
        const display = entries.slice(0, 2).map(([key, val]) => {
          // Buscar el label correspondiente al key en las opciones
          let displayKey = key;
          if (field.options && Array.isArray(field.options)) {
            const option = field.options.find(opt => opt.value === key);
            if (option) {
              displayKey = option.label;
            }
          }
          return `${displayKey}: ${val}`;
        }).join(', ');
        return entries.length > 2 ? `${display}, ...` : display;
      }
      return String(value);

    default:
      return String(value);
  }
}

/**
 * Obtiene el valor de un campo de una entidad genérica
 * Busca primero en propiedades directas, luego en customFields
 *
 * @param entity - La entidad (client, worker, material, etc.)
 * @param fieldName - El nombre del campo
 * @returns El valor del campo o undefined
 */
export function getFieldValue(entity: any, fieldName: string): any {
  if (fieldName in entity) {
    return entity[fieldName];
  }
  return entity.customFields?.[fieldName];
}
