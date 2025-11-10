// src/app/modules/clients/clients-config.ts

import { GenericModuleConfig } from '../../shared/models/generic-entity.interface';
import { mapFieldsToGeneric } from '../../shared/modules/dynamic-form-builder/utils';
import { ClientModuleConfig } from './models/client-module-config.interface';

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
