// src/app/modules/clients/models/field-config.interface.ts

import { Timestamp } from 'firebase/firestore';

/**
 * Tipos de campos soportados
 */
export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  EMAIL = 'email',
  PHONE = 'phone',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  DATE = 'date',
  DATETIME = 'datetime',
  CHECKBOX = 'checkbox',
  TEXTAREA = 'textarea',
  URL = 'url',
  CURRENCY = 'currency'
}

/**
 * Opción para campos de tipo select/multiselect
 */
export interface FieldOption {
  value: string;
  label: string;
  color?: string;  // Color opcional para el badge/chip
}

/**
 * Configuración de validación de un campo
 */
export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;        // RegEx para validación personalizada
  min?: number;            // Valor mínimo (para números)
  max?: number;            // Valor máximo (para números)
  email?: boolean;         // Validar formato email
  url?: boolean;           // Validar formato URL
  customMessage?: string;  // Mensaje de error personalizado
}

/**
 * Configuración de visualización en el grid/tabla
 */
export interface FieldGridConfig {
  showInGrid: boolean;     // Mostrar en la tabla
  gridOrder: number;       // Orden en la tabla (0 = primero)
  gridWidth?: string;      // Ancho de columna (ej: '150px', '20%')
  sortable?: boolean;      // Permitir ordenamiento
  filterable?: boolean;    // Permitir filtrado
}

/**
 * Configuración completa de un campo
 */
export interface FieldConfig {
  // Identificación
  id: string;              // ID único del campo
  name: string;            // Nombre interno (ej: 'customer_type')
  label: string;           // Etiqueta visible (ej: 'Tipo de Cliente')
  type: FieldType;         // Tipo de campo

  // Validaciones
  validation: FieldValidation;

  // Opciones (para select/multiselect)
  options?: FieldOption[];

  // Configuración de visualización
  placeholder?: string;
  defaultValue?: any;
  helpText?: string;       // Texto de ayuda debajo del campo
  icon?: string;           // Icono de Material Icons

  // Grid/Tabla
  gridConfig: FieldGridConfig;

  // Formulario
  formOrder: number;       // Orden en el formulario (0 = primero)
  formWidth?: 'full' | 'half' | 'third';  // Ancho en el formulario

  // Metadata
  isDefault: boolean;      // Campo por defecto vs personalizado
  isActive: boolean;       // Campo activo o desactivado
  isSystem: boolean;       // Campo del sistema (no editable/eliminable)

  // Auditoría
  createdAt?: Timestamp;
  createdBy?: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

/**
 * Campos por defecto del módulo de clientes
 */
export const DEFAULT_CLIENT_FIELDS: Partial<FieldConfig>[] = [
  {
    name: 'name',
    label: 'Nombre',
    type: FieldType.TEXT,
    validation: { required: true, minLength: 2, maxLength: 100 },
    placeholder: 'Nombre completo del cliente',
    icon: 'person',
    gridConfig: { showInGrid: true, gridOrder: 0, gridWidth: '200px', sortable: true, filterable: true },
    formOrder: 0,
    formWidth: 'half',
    isDefault: true,
    isActive: true,
    isSystem: true
  },
  {
    name: 'email',
    label: 'Correo Electrónico',
    type: FieldType.EMAIL,
    validation: { email: true, maxLength: 100 },
    placeholder: 'correo@ejemplo.com',
    icon: 'email',
    gridConfig: { showInGrid: true, gridOrder: 1, gridWidth: '200px', sortable: true, filterable: true },
    formOrder: 1,
    formWidth: 'half',
    isDefault: true,
    isActive: true,
    isSystem: false
  },
  {
    name: 'phone',
    label: 'Teléfono',
    type: FieldType.PHONE,
    validation: { pattern: '^[+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$' },
    placeholder: '+1 234 567 8900',
    icon: 'phone',
    gridConfig: { showInGrid: true, gridOrder: 2, gridWidth: '150px', sortable: false, filterable: false },
    formOrder: 2,
    formWidth: 'half',
    isDefault: true,
    isActive: true,
    isSystem: false
  },
  {
    name: 'company',
    label: 'Empresa',
    type: FieldType.TEXT,
    validation: { maxLength: 100 },
    placeholder: 'Nombre de la empresa',
    icon: 'business',
    gridConfig: { showInGrid: true, gridOrder: 3, gridWidth: '180px', sortable: true, filterable: true },
    formOrder: 3,
    formWidth: 'half',
    isDefault: true,
    isActive: true,
    isSystem: false
  },
  {
    name: 'address',
    label: 'Dirección',
    type: FieldType.TEXTAREA,
    validation: { maxLength: 250 },
    placeholder: 'Calle, número, ciudad, código postal',
    icon: 'location_on',
    gridConfig: { showInGrid: false, gridOrder: 10, sortable: false, filterable: false },
    formOrder: 4,
    formWidth: 'full',
    isDefault: true,
    isActive: false,
    isSystem: false
  },
  {
    name: 'city',
    label: 'Ciudad',
    type: FieldType.TEXT,
    validation: { maxLength: 100 },
    placeholder: 'Ciudad',
    icon: 'location_city',
    gridConfig: { showInGrid: false, gridOrder: 11, sortable: true, filterable: true },
    formOrder: 5,
    formWidth: 'half',
    isDefault: true,
    isActive: false,
    isSystem: false
  },
  {
    name: 'country',
    label: 'País',
    type: FieldType.TEXT,
    validation: { maxLength: 100 },
    placeholder: 'País',
    icon: 'public',
    gridConfig: { showInGrid: false, gridOrder: 12, sortable: true, filterable: true },
    formOrder: 6,
    formWidth: 'half',
    isDefault: true,
    isActive: false,
    isSystem: false
  },
  {
    name: 'notes',
    label: 'Notas',
    type: FieldType.TEXTAREA,
    validation: { maxLength: 500 },
    placeholder: 'Notas adicionales sobre el cliente',
    icon: 'notes',
    gridConfig: { showInGrid: false, gridOrder: 13, sortable: false, filterable: false },
    formOrder: 7,
    formWidth: 'full',
    isDefault: true,
    isActive: true,
    isSystem: false
  }
];
