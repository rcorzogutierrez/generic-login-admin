/**
 * Configuración de materials para diálogos genéricos de eliminación
 * Similar a clients-config.ts para reutilizar componentes genéricos
 */

import { GenericModuleConfig } from '../../../shared/models/generic-entity.interface';
import { mapFieldsToGeneric } from '../../../shared/modules/dynamic-form-builder/utils';
import { MaterialModuleConfig } from '../models';

/**
 * Crea GenericModuleConfig a partir de MaterialModuleConfig
 */
export function createGenericConfig(materialConfig: MaterialModuleConfig): GenericModuleConfig {
  return {
    collection: 'materials',
    entityName: 'Material',
    entityNamePlural: 'Materiales',
    deleteDialogFieldsCount: 3,
    searchFields: ['name', 'code', 'description'],
    defaultSort: {
      field: materialConfig.gridConfig?.sortBy || 'name',
      direction: materialConfig.gridConfig?.sortOrder || 'asc'
    },
    itemsPerPage: materialConfig.gridConfig?.itemsPerPage || 25,
    fields: mapFieldsToGeneric(materialConfig.fields)
  };
}
