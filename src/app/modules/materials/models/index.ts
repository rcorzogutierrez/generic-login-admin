/**
 * Modelos y tipos para el módulo de Materials
 */

import { GenericEntity, GenericModuleConfig } from '../../../shared/models/generic-entity.interface';
import {
  FieldType,
  FieldConfig,
  FieldOption
} from '../../../shared/modules/dynamic-form-builder/models/field-config.interface';
import { GridConfiguration } from '../../../shared/modules/dynamic-form-builder/models/module-config.interface';

// Re-export shared types for convenience
export { FieldType, FieldConfig, FieldOption };

/**
 * Interfaz para Material (Materiales/Inventario)
 */
export interface Material extends GenericEntity {
  // Campos del sistema (obligatorios)
  name: string;
  code: string;
  description?: string;

  // Campos personalizables
  customFields?: { [key: string]: any };

  // Metadatos del sistema
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

/**
 * Configuración del módulo de Materials
 */
export interface MaterialModuleConfig extends GenericModuleConfig {
  fields: FieldConfig[];  // Sobrescribe el tipo de fields de GenericModuleConfig
  gridConfig?: GridConfiguration;
  settings: {
    enableTags?: boolean;
    enableCategories?: boolean;
    enableStock?: boolean;
    requireApproval?: boolean;
    autoExpiry?: boolean;
    expiryDays?: number;
  };
}

/**
 * Configuración por defecto del módulo
 */
export const DEFAULT_MODULE_CONFIG: Partial<MaterialModuleConfig> = {
  collection: 'materials',
  entityName: 'Material',
  entityNamePlural: 'Materiales',
  fields: [],
  settings: {
    enableTags: true,
    enableCategories: true,
    enableStock: true,
    requireApproval: false,
    autoExpiry: false,
    expiryDays: 365
  }
};

/**
 * Campos por defecto del sistema (no editables)
 */
export const DEFAULT_MATERIAL_FIELDS: Partial<FieldConfig>[] = [
  {
    name: 'name',
    label: 'Nombre del Material',
    type: FieldType.TEXT,
    icon: 'inventory_2',
    placeholder: 'Ej: Cemento Portland',
    helpText: 'Nombre descriptivo del material',
    validation: { required: true, minLength: 2, maxLength: 100 },
    formOrder: 0,
    formWidth: 'full',
    gridConfig: { showInGrid: true, gridOrder: 0, sortable: true, filterable: true },
    isActive: true,
    isSystem: true,
    isDefault: true
  },
  {
    name: 'code',
    label: 'Código',
    type: FieldType.TEXT,
    icon: 'qr_code',
    placeholder: 'Ej: MAT-001',
    helpText: 'Código único del material',
    validation: { required: true, minLength: 2, maxLength: 50 },
    formOrder: 1,
    formWidth: 'half',
    gridConfig: { showInGrid: true, gridOrder: 1, sortable: true, filterable: true },
    isActive: true,
    isSystem: true,
    isDefault: true
  },
  {
    name: 'description',
    label: 'Descripción',
    type: FieldType.TEXTAREA,
    icon: 'description',
    placeholder: 'Descripción detallada del material...',
    helpText: 'Información adicional sobre el material',
    validation: { required: false, maxLength: 500 },
    formOrder: 2,
    formWidth: 'full',
    gridConfig: { showInGrid: false, gridOrder: 2, sortable: false, filterable: false },
    isActive: true,
    isSystem: true,
    isDefault: false
  }
];
