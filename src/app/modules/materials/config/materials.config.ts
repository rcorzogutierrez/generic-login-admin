/**
 * Configuración de materials para diálogos genéricos de eliminación
 * Similar a admin-users.config.ts para reutilizar componentes genéricos
 */

import { GenericModuleConfig } from '../../../shared/models/generic-entity.interface';
import { Material } from '../models';

/**
 * Configuración del módulo de materials para diálogos genéricos
 */
export const MATERIALS_CONFIG: GenericModuleConfig = {
  collection: 'materials',
  entityName: 'Material',
  entityNamePlural: 'Materiales',
  deleteDialogFieldsCount: 3,

  fields: [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      showInDelete: true,
      showInGrid: true
    },
    {
      name: 'code',
      label: 'Código',
      type: 'text',
      showInDelete: true,
      showInGrid: true
    },
    {
      name: 'description',
      label: 'Descripción',
      type: 'text',
      showInDelete: true,
      showInGrid: false,
      format: (desc: string) => {
        if (!desc) return '-';
        return desc.length > 50 ? desc.substring(0, 50) + '...' : desc;
      }
    },
    {
      name: 'isActive',
      label: 'Estado',
      type: 'checkbox',
      showInDelete: false,
      showInGrid: true,
      format: (isActive: boolean) => isActive ? '✓ Activo' : '✗ Inactivo'
    }
  ]
};

/**
 * Adapta un Material al formato GenericEntity
 * GenericEntity requiere 'id' mientras Material ya lo tiene
 */
export function adaptMaterialToGenericEntity(material: Material): any {
  return {
    ...material,
    id: material.id // Material ya tiene id desde GenericEntity
  };
}
