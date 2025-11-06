/**
 * Configuración de workers para diálogos genéricos de eliminación
 * Similar a clients-config.ts para reutilizar componentes genéricos
 */

import { GenericModuleConfig, GenericFieldConfig } from '../../../shared/models/generic-entity.interface';
import { FieldConfig, FieldType, WorkerModuleConfig } from '../models';

/**
 * Convierte el tipo de campo de FieldType a string genérico
 */
function mapFieldType(fieldType: FieldType): GenericFieldConfig['type'] {
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
 * Convierte FieldConfig[] a GenericFieldConfig[]
 */
function mapFieldsToGeneric(fields: FieldConfig[]): GenericFieldConfig[] {
  return fields
    .filter(field => field.isActive && !field.isSystem)
    .map(field => ({
      name: field.name,
      label: field.label,
      type: mapFieldType(field.type),
      options: field.options,
      showInGrid: field.gridConfig?.showInGrid || false,
      showInDelete: field.gridConfig?.showInGrid !== false,
      isDefault: field.isDefault
    }));
}

/**
 * Crea GenericModuleConfig a partir de WorkerModuleConfig
 */
export function createGenericConfig(workerConfig: WorkerModuleConfig): GenericModuleConfig {
  return {
    collection: 'workers',
    entityName: 'Trabajador',
    entityNamePlural: 'Trabajadores',
    deleteDialogFieldsCount: 3,
    searchFields: ['name', 'email', 'phone', 'position'],
    defaultSort: {
      field: workerConfig.gridConfig?.sortBy || 'name',
      direction: workerConfig.gridConfig?.sortOrder || 'asc'
    },
    itemsPerPage: workerConfig.gridConfig?.itemsPerPage || 25,
    fields: mapFieldsToGeneric(workerConfig.fields)
  };
}
