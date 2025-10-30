// src/app/shared/modules/dynamic-form-builder/models/module-config.interface.ts

import { Timestamp } from 'firebase/firestore';
import { FieldConfig } from './field-config.interface';

/**
 * Vista por defecto del grid/tabla
 */
export type GridView = 'table' | 'grid' | 'cards';

/**
 * Configuración del Grid/Tabla
 */
export interface GridConfiguration {
  defaultView: GridView;           // Vista por defecto
  itemsPerPage: number;            // Elementos por página
  sortBy: string;                  // Campo por defecto para ordenar
  sortOrder: 'asc' | 'desc';       // Orden por defecto
  enableSearch: boolean;           // Habilitar búsqueda global
  enableFilters: boolean;          // Habilitar filtros
  enableExport: boolean;           // Habilitar exportar
  enableBulkActions: boolean;      // Habilitar acciones masivas
  showThumbnails: boolean;         // Mostrar miniaturas (si aplica)
  compactMode: boolean;            // Modo compacto
}

/**
 * Permisos específicos del módulo
 */
export interface ModulePermissions {
  canView: boolean;                // Ver elementos
  canCreate: boolean;              // Crear elementos
  canEdit: boolean;                // Editar elementos
  canDelete: boolean;              // Eliminar elementos
  canExport: boolean;              // Exportar datos
  canImport: boolean;              // Importar datos
  canConfigure: boolean;           // Configurar módulo (solo admin)
  canViewStats: boolean;           // Ver estadísticas
  canAssign: boolean;              // Asignar elementos a usuarios
}

/**
 * Configuración de notificaciones
 */
export interface NotificationConfig {
  notifyOnCreate: boolean;         // Notificar al crear
  notifyOnUpdate: boolean;         // Notificar al actualizar
  notifyOnDelete: boolean;         // Notificar al eliminar
  notifyAssignedUser: boolean;     // Notificar al usuario asignado
  emailNotifications: boolean;     // Enviar notificaciones por email
}

/**
 * Posición de un campo en el layout del formulario
 */
export interface FieldPosition {
  row: number;                     // Fila en el grid
  col: number;                     // Columna en el grid
  colSpan: number;                 // Cuántas columnas ocupa (1-4)
  order: number;                   // Orden dentro de la fila
}

/**
 * Configuración de botones del formulario
 */
export interface FormButtonsConfig {
  position: 'left' | 'center' | 'right';  // Alineación de los botones
  order: string[];                 // Orden de los botones ['save', 'cancel', 'reset']
  style: 'inline' | 'stacked';     // Estilo: en línea o apilados
  showLabels: boolean;             // Mostrar labels en botones
}

/**
 * Configuración del layout visual del formulario
 */
export interface FormLayoutConfig {
  columns: 2 | 3 | 4;              // Número de columnas del grid
  fields: {                        // Posicionamiento de cada campo
    [fieldId: string]: FieldPosition;
  };
  buttons: FormButtonsConfig;      // Configuración de botones
  spacing: 'compact' | 'normal' | 'spacious';  // Espaciado entre campos
  showSections: boolean;           // Mostrar secciones/grupos
}

/**
 * Configuración genérica de un módulo dinámico
 * Esta interfaz es reutilizable para cualquier módulo (clientes, productos, ventas, etc.)
 */
export interface ModuleConfig<TModuleId extends string = string> {
  // Identificación
  id: string;                      // ID de la configuración (único)
  moduleId: TModuleId;             // ID del módulo (ej: 'clients', 'products', 'sales')

  // Configuración de campos
  fields: FieldConfig[];           // Lista de campos (por defecto + personalizados)

  // Configuración del layout del formulario
  formLayout?: FormLayoutConfig;   // Layout visual del formulario (opcional)

  // Configuración del grid
  gridConfig: GridConfiguration;

  // Permisos
  permissions: ModulePermissions;

  // Notificaciones
  notifications: NotificationConfig;

  // Configuración adicional (específica por módulo, puede ser extendida)
  settings?: Record<string, any>;

  // Metadata
  version: string;                 // Versión de la configuración
  isActive: boolean;               // Módulo activo
  lastModified: Timestamp;         // Última modificación
  modifiedBy: string;              // UID del usuario que modificó
  createdAt?: Timestamp;           // Fecha de creación
  createdBy?: string;              // Usuario que creó la configuración
}

/**
 * Configuración por defecto para cualquier módulo
 * Cada módulo puede personalizar estos valores
 */
export function getDefaultModuleConfig<T extends string>(moduleId: T): Omit<ModuleConfig<T>, 'id' | 'fields' | 'lastModified' | 'modifiedBy'> {
  return {
    moduleId,

    gridConfig: {
      defaultView: 'table',
      itemsPerPage: 25,
      sortBy: 'name',
      sortOrder: 'asc',
      enableSearch: true,
      enableFilters: true,
      enableExport: true,
      enableBulkActions: true,
      showThumbnails: false,
      compactMode: false
    },

    permissions: {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
      canImport: true,
      canConfigure: false,  // Solo admin
      canViewStats: true,
      canAssign: true
    },

    notifications: {
      notifyOnCreate: false,
      notifyOnUpdate: false,
      notifyOnDelete: false,
      notifyAssignedUser: true,
      emailNotifications: false
    },

    settings: {},

    version: '1.0.0',
    isActive: true
  };
}
