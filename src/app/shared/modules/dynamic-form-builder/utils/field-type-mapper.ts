/**
 * Utilidades compartidas para mapeo de tipos de campos
 * Elimina duplicación de código entre módulos (clients, workers, materials)
 */

import { GenericFieldConfig } from '../../../models/generic-entity.interface';
import { FieldConfig, FieldType } from '../models/field-config.interface';

/**
 * Convierte el tipo de campo de FieldType a string genérico
 *
 * @param fieldType - El tipo de campo del sistema de formularios dinámicos
 * @returns El tipo de campo genérico como string
 */
export function mapFieldType(fieldType: FieldType): GenericFieldConfig['type'] {
  switch (fieldType) {
    case FieldType.TEXT:
      return 'text';
    case FieldType.NUMBER:
      return 'number';
    case FieldType.EMAIL:
      return 'email';
    case FieldType.PHONE:
      return 'phone';
    case FieldType.SELECT:
      return 'select';
    case FieldType.MULTISELECT:
      return 'multiselect';
    case FieldType.DICTIONARY:
      return 'dictionary';
    case FieldType.DATE:
      return 'date';
    case FieldType.DATETIME:
      return 'datetime';
    case FieldType.CHECKBOX:
      return 'checkbox';
    case FieldType.TEXTAREA:
      return 'text';
    case FieldType.URL:
      return 'text';
    case FieldType.CURRENCY:
      return 'currency';
    default:
      return 'text';
  }
}

/**
 * Convierte un array de FieldConfig a GenericFieldConfig
 * Filtra campos inactivos y de sistema, mantiene solo campos activos configurados por el usuario
 *
 * @param fields - Array de configuraciones de campos del módulo
 * @returns Array de configuraciones de campos genéricas
 */
export function mapFieldsToGeneric(fields: FieldConfig[]): GenericFieldConfig[] {
  return fields
    .filter(field => field.isActive && !field.isSystem)
    .map(field => ({
      name: field.name,
      label: field.label,
      type: mapFieldType(field.type),
      options: field.options,
      showInGrid: field.gridConfig?.showInGrid || false,
      showInDelete: field.gridConfig?.showInGrid !== false, // Por defecto mostrar en delete si está en grid
      isDefault: field.isDefault
    }));
}
