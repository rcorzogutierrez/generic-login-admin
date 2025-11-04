/**
 * Configuración de usuarios para diálogos genéricos de eliminación
 * Mantiene los campos fijos del módulo Admin (sin form builder)
 */

import { GenericModuleConfig } from '../../shared/models/generic-entity.interface';
import { User } from '../services/admin.service';

/**
 * Obtiene el icono del rol
 */
function getRoleIcon(role: string): string {
  const icons: Record<string, string> = {
    admin: '🛡️',
    user: '👤',
    viewer: '👁️'
  };
  return icons[role] || '👤';
}

/**
 * Formatea el rol con icono
 */
function formatRole(role: string): string {
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    user: 'Usuario',
    viewer: 'Visor'
  };
  return `${getRoleIcon(role)} ${roleLabels[role] || role}`;
}

/**
 * Configuración del módulo de usuarios para Admin
 * Se usa con los diálogos genéricos de eliminación
 */
export const ADMIN_USERS_CONFIG: GenericModuleConfig = {
  collection: 'users',
  entityName: 'Usuario',
  entityNamePlural: 'Usuarios',
  deleteDialogFieldsCount: 3,

  fields: [
    {
      name: 'displayName',
      label: 'Nombre',
      type: 'text',
      isDefault: true,
      showInDelete: true,
      showInGrid: true
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      isDefault: true,
      showInDelete: true,
      showInGrid: true
    },
    {
      name: 'role',
      label: 'Rol',
      type: 'select',
      showInDelete: true,
      showInGrid: true,
      options: [
        { value: 'admin', label: 'Administrador' },
        { value: 'user', label: 'Usuario' },
        { value: 'viewer', label: 'Visor' }
      ],
      format: formatRole
    },
    {
      name: 'modules',
      label: 'Módulos',
      type: 'multiselect',
      showInDelete: false,
      showInGrid: true,
      format: (modules: string[]) => {
        if (!modules || modules.length === 0) return 'Sin módulos';
        return `${modules.length} módulo(s)`;
      }
    },
    {
      name: 'isActive',
      label: 'Estado',
      type: 'checkbox',
      showInDelete: false,
      showInGrid: true,
      format: (isActive: boolean) => isActive ? '✓ Activo' : '✗ Inactivo'
    },
    {
      name: 'createdAt',
      label: 'Fecha de creación',
      type: 'datetime',
      showInDelete: false,
      showInGrid: false
    },
    {
      name: 'lastLogin',
      label: 'Último acceso',
      type: 'datetime',
      showInDelete: false,
      showInGrid: true
    }
  ]
};

/**
 * Adapta un User al formato GenericEntity
 * Mapea uid → id para compatibilidad con GenericEntity
 */
export function adaptUserToGenericEntity(user: User): any {
  return {
    ...user,
    id: user.uid || user.email // GenericEntity requiere 'id'
  };
}
