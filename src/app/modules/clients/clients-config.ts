// src/app/modules/clients/clients-config.ts

import { GenericModuleConfig, GenericFieldConfig } from '../../shared/models/generic-entity.interface';
import { FieldConfig, FieldType } from './models/field-config.interface';
import { ClientModuleConfig } from './models/client-module-config.interface';

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
      showInDelete: field.gridConfig?.showInGrid !== false, // Por defecto mostrar en delete si está en grid
      isDefault: field.isDefault
    }));
}

/**
 * Crea GenericModuleConfig a partir de ClientModuleConfig
 */
export function createGenericConfig(clientConfig: ClientModuleConfig): GenericModuleConfig {
  return {
    collection: 'clients',
    entityName: 'Cliente',
    entityNamePlural: 'Clientes',
    deleteDialogFieldsCount: 3,
    searchFields: ['name', 'email', 'phone', 'company'],
    defaultSort: {
      field: clientConfig.gridConfig?.sortBy || 'name',
      direction: clientConfig.gridConfig?.sortOrder || 'asc'
    },
    itemsPerPage: clientConfig.gridConfig?.itemsPerPage || 25,
    fields: mapFieldsToGeneric(clientConfig.fields)
  };
}

/**
 * Crea GenericModuleConfig por defecto (cuando no hay config cargada)
 */
export function getDefaultGenericConfig(): GenericModuleConfig {
  return {
    collection: 'clients',
    entityName: 'Cliente',
    entityNamePlural: 'Clientes',
    deleteDialogFieldsCount: 3,
    searchFields: ['name', 'email', 'phone', 'company'],
    defaultSort: {
      field: 'name',
      direction: 'asc'
    },
    itemsPerPage: 25,
    fields: [
      {
        name: 'name',
        label: 'Nombre',
        type: 'text',
        showInGrid: true,
        showInDelete: true,
        isDefault: true
      },
      {
        name: 'email',
        label: 'Correo Electrónico',
        type: 'email',
        showInGrid: true,
        showInDelete: true,
        isDefault: true
      },
      {
        name: 'phone',
        label: 'Teléfono',
        type: 'phone',
        showInGrid: true,
        showInDelete: true,
        isDefault: true
      },
      {
        name: 'company',
        label: 'Empresa',
        type: 'text',
        showInGrid: true,
        showInDelete: true,
        isDefault: true
      }
    ]
  };
}
