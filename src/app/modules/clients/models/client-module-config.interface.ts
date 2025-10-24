// src/app/modules/clients/models/client-module-config.interface.ts

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
  canView: boolean;                // Ver clientes
  canCreate: boolean;              // Crear clientes
  canEdit: boolean;                // Editar clientes
  canDelete: boolean;              // Eliminar clientes
  canExport: boolean;              // Exportar datos
  canImport: boolean;              // Importar datos
  canConfigure: boolean;           // Configurar módulo (solo admin)
  canViewStats: boolean;           // Ver estadísticas
  canAssign: boolean;              // Asignar clientes a usuarios
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
 * Configuración completa del módulo de clientes
 */
export interface ClientModuleConfig {
  // Identificación
  id: string;                      // ID de la configuración (único)
  moduleId: 'clients';             // ID del módulo

  // Configuración de campos
  fields: FieldConfig[];           // Lista de campos (por defecto + personalizados)

  // Configuración del grid
  gridConfig: GridConfiguration;

  // Permisos
  permissions: ModulePermissions;

  // Notificaciones
  notifications: NotificationConfig;

  // Configuración adicional
  settings: {
    enableTags: boolean;           // Habilitar sistema de tags
    enableAssignment: boolean;     // Habilitar asignación de clientes
    enableStatus: boolean;         // Habilitar estados personalizados
    requireApproval: boolean;      // Requerir aprobación para crear/editar
    autoArchive: boolean;          // Archivar automáticamente clientes inactivos
    autoArchiveDays: number;       // Días de inactividad para auto-archivar
  };

  // Metadata
  version: string;                 // Versión de la configuración
  isActive: boolean;               // Módulo activo
  lastModified: Timestamp;         // Última modificación
  modifiedBy: string;              // UID del usuario que modificó
  createdAt?: Timestamp;           // Fecha de creación
  createdBy?: string;              // Usuario que creó la configuración
}

/**
 * Configuración por defecto del módulo
 */
export const DEFAULT_MODULE_CONFIG: Omit<ClientModuleConfig, 'id' | 'fields' | 'lastModified' | 'modifiedBy'> = {
  moduleId: 'clients',

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

  settings: {
    enableTags: true,
    enableAssignment: true,
    enableStatus: true,
    requireApproval: false,
    autoArchive: false,
    autoArchiveDays: 365
  },

  version: '1.0.0',
  isActive: true
};
