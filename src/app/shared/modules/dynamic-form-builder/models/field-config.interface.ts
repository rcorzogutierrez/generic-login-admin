// src/app/shared/modules/dynamic-form-builder/models/field-config.interface.ts

import { Timestamp } from 'firebase/firestore';

/**
 * Tipos de campos soportados en el form builder dinámico
 */
export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  EMAIL = 'email',
  PHONE = 'phone',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  DICTIONARY = 'dictionary',
  DATE = 'date',
  DATETIME = 'datetime',
  CHECKBOX = 'checkbox',
  TEXTAREA = 'textarea',
  URL = 'url',
  CURRENCY = 'currency'
}

/**
 * Opción para campos de tipo select/multiselect/dictionary
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
 * Esta interfaz es reutilizable para cualquier módulo
 */
export interface FieldConfig {
  // Identificación
  id: string;              // ID único del campo
  name: string;            // Nombre interno (ej: 'customer_type', 'product_code')
  label: string;           // Etiqueta visible (ej: 'Tipo de Cliente', 'Código de Producto')
  type: FieldType;         // Tipo de campo

  // Validaciones
  validation: FieldValidation;

  // Opciones (para select/multiselect/dictionary)
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
