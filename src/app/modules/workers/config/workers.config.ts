/**
 * Configuración de workers para diálogos genéricos de eliminación
 * Similar a clients-config.ts para reutilizar componentes genéricos
 */

import { GenericModuleConfig } from '../../../shared/models/generic-entity.interface';
import { mapFieldsToGeneric } from '../../../shared/modules/dynamic-form-builder/utils';
import { WorkerModuleConfig } from '../models';

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
