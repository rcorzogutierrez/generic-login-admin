/**
 * Modelos y tipos para el módulo de Workers
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
 * Interfaz para Worker (Trabajadores/Empleados)
 */
export interface Worker extends GenericEntity {
  // Campos del sistema (obligatorios)
  name: string;
  email: string;
  phone?: string;
  position?: string;

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
 * Configuración del módulo de Workers
 */
export interface WorkerModuleConfig extends GenericModuleConfig {
  fields: FieldConfig[];  // Sobrescribe el tipo de fields de GenericModuleConfig
  gridConfig?: GridConfiguration;
  settings: {
    enableTags?: boolean;
    enableDepartments?: boolean;
    enableShifts?: boolean;
    requireApproval?: boolean;
    autoDeactivate?: boolean;
    deactivateDays?: number;
  };
}

export const DEFAULT_MODULE_CONFIG: Partial<WorkerModuleConfig> = {
  collection: 'workers',
  entityName: 'Trabajador',
  entityNamePlural: 'Trabajadores',
  fields: [],
  settings: {
    enableTags: true,
    enableDepartments: true,
    enableShifts: true,
    requireApproval: false,
    autoDeactivate: false,
    deactivateDays: 90
  }
};

export const DEFAULT_WORKER_FIELDS: Partial<FieldConfig>[] = [
  {
    name: 'name',
    label: 'Nombre Completo',
    type: FieldType.TEXT,
    icon: 'person',
    placeholder: 'Ej: Juan Pérez',
    helpText: 'Nombre completo del trabajador',
    validation: { required: true, minLength: 2, maxLength: 100 },
    formOrder: 0,
    formWidth: 'full',
    gridConfig: { showInGrid: true, gridOrder: 0, sortable: true, filterable: true },
    isActive: true,
    isSystem: true,
    isDefault: true
  },
  {
    name: 'email',
    label: 'Email',
    type: FieldType.EMAIL,
    icon: 'email',
    placeholder: 'Ej: juan@ejemplo.com',
    helpText: 'Correo electrónico del trabajador',
    validation: { required: true, pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
    formOrder: 1,
    formWidth: 'half',
    gridConfig: { showInGrid: true, gridOrder: 1, sortable: true, filterable: true },
    isActive: true,
    isSystem: true,
    isDefault: true
  },
  {
    name: 'phone',
    label: 'Teléfono',
    type: FieldType.PHONE,
    icon: 'phone',
    placeholder: 'Ej: +1234567890',
    helpText: 'Teléfono de contacto',
    validation: { required: false, maxLength: 20 },
    formOrder: 2,
    formWidth: 'half',
    gridConfig: { showInGrid: true, gridOrder: 2, sortable: false, filterable: false },
    isActive: true,
    isSystem: true,
    isDefault: true
  },
  {
    name: 'position',
    label: 'Cargo',
    type: FieldType.TEXT,
    icon: 'work',
    placeholder: 'Ej: Ingeniero de Software',
    helpText: 'Puesto o cargo del trabajador',
    validation: { required: false, maxLength: 100 },
    formOrder: 3,
    formWidth: 'full',
    gridConfig: { showInGrid: true, gridOrder: 3, sortable: true, filterable: true },
    isActive: true,
    isSystem: true,
    isDefault: false
  }
];
