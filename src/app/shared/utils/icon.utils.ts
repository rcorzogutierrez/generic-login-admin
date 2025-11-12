// src/app/shared/utils/icon.utils.ts

/**
 * Utilidades para gestión de iconos de Material Icons
 *
 * Este archivo centraliza las funciones relacionadas con la obtención de iconos
 * para diferentes entidades del sistema (roles, permisos, módulos).
 *
 * @example
 * ```typescript
 * import { getRoleIcon, getPermissionIcon } from '@shared/utils';
 *
 * const icon = getRoleIcon('admin'); // 'shield'
 * const permIcon = getPermissionIcon('read'); // 'visibility'
 * ```
 */

/**
 * Obtiene el icono de Material correspondiente a un rol
 *
 * @param roleValue - El valor del rol (admin, user, viewer, etc)
 * @returns El nombre del icono de Material Icons
 *
 * @example
 * ```typescript
 * getRoleIcon('admin'); // 'shield'
 * getRoleIcon('user'); // 'person'
 * getRoleIcon('viewer'); // 'visibility'
 * getRoleIcon('unknown'); // 'person' (fallback)
 * ```
 */
export function getRoleIcon(roleValue: string): string {
  const icons: Record<string, string> = {
    admin: 'shield',
    user: 'person',
    viewer: 'visibility',
    moderator: 'verified_user',
    editor: 'edit',
    contributor: 'group_add'
  };
  return icons[roleValue] || 'person';
}

/**
 * Obtiene el icono de Material correspondiente a un permiso
 *
 * @param permission - El valor del permiso (read, write, delete, etc)
 * @returns El nombre del icono de Material Icons
 *
 * @example
 * ```typescript
 * getPermissionIcon('read'); // 'visibility'
 * getPermissionIcon('write'); // 'edit'
 * getPermissionIcon('delete'); // 'delete'
 * getPermissionIcon('manage_users'); // 'people'
 * ```
 */
export function getPermissionIcon(permission: string): string {
  const icons: Record<string, string> = {
    read: 'visibility',
    write: 'edit',
    delete: 'delete',
    manage_users: 'people',
    admin: 'admin_panel_settings',
    create: 'add_circle',
    update: 'update',
    view: 'visibility',
    export: 'download',
    import: 'upload'
  };
  return icons[permission] || 'check_circle';
}

/**
 * Obtiene el icono de Material correspondiente a un módulo
 *
 * Busca en un objeto de configuración de módulos. Si no encuentra el módulo,
 * devuelve un icono genérico.
 *
 * @param moduleValue - El valor del módulo
 * @param moduleOptions - Opcional: Array de opciones de módulos con iconos personalizados
 * @returns El nombre del icono de Material Icons
 *
 * @example
 * ```typescript
 * // Sin opciones personalizadas
 * getModuleIcon('dashboard'); // 'dashboard'
 *
 * // Con opciones personalizadas
 * const modules = [
 *   { value: 'users', icon: 'people', label: 'Usuarios' },
 *   { value: 'reports', icon: 'assessment', label: 'Reportes' }
 * ];
 * getModuleIcon('users', modules); // 'people'
 * getModuleIcon('unknown', modules); // 'extension' (fallback)
 * ```
 */
export function getModuleIcon(
  moduleValue: string,
  moduleOptions?: Array<{ value: string; icon: string; label: string }>
): string {
  // Si se proporcionan opciones personalizadas, buscar ahí primero
  if (moduleOptions && moduleOptions.length > 0) {
    const module = moduleOptions.find(m => m.value === moduleValue);
    if (module?.icon) {
      return module.icon;
    }
  }

  // Iconos por defecto para módulos comunes
  const defaultIcons: Record<string, string> = {
    dashboard: 'dashboard',
    users: 'people',
    admin: 'admin_panel_settings',
    settings: 'settings',
    reports: 'assessment',
    analytics: 'analytics',
    inventory: 'inventory',
    clients: 'business',
    workers: 'engineering',
    materials: 'inventory_2',
    projects: 'work',
    tasks: 'task',
    calendar: 'calendar_today',
    messages: 'email',
    notifications: 'notifications'
  };

  return defaultIcons[moduleValue] || 'extension';
}

/**
 * Obtiene el color asociado a un rol
 *
 * Útil para badges, chips, y otros elementos visuales que necesiten
 * diferenciación por color según el rol.
 *
 * @param roleValue - El valor del rol
 * @returns Un código de color CSS (palabra clave o hex)
 *
 * @example
 * ```typescript
 * getRoleColor('admin'); // 'red'
 * getRoleColor('user'); // 'blue'
 * getRoleColor('viewer'); // 'green'
 * ```
 */
export function getRoleColor(roleValue: string): string {
  const colors: Record<string, string> = {
    admin: 'red',
    user: 'blue',
    viewer: 'green',
    moderator: 'orange',
    editor: 'purple',
    contributor: 'teal'
  };
  return colors[roleValue] || 'gray';
}

/**
 * Obtiene el badge color class de Tailwind para un rol
 *
 * Devuelve clases de Tailwind CSS para estilizar badges según el rol.
 *
 * @param roleValue - El valor del rol
 * @returns String con clases de Tailwind CSS
 *
 * @example
 * ```typescript
 * getRoleBadgeClass('admin'); // 'bg-red-100 text-red-800'
 * getRoleBadgeClass('user'); // 'bg-blue-100 text-blue-800'
 * ```
 */
export function getRoleBadgeClass(roleValue: string): string {
  const classes: Record<string, string> = {
    admin: 'bg-red-100 text-red-800',
    user: 'bg-blue-100 text-blue-800',
    viewer: 'bg-green-100 text-green-800',
    moderator: 'bg-orange-100 text-orange-800',
    editor: 'bg-purple-100 text-purple-800',
    contributor: 'bg-teal-100 text-teal-800'
  };
  return classes[roleValue] || 'bg-gray-100 text-gray-800';
}

/**
 * Formatea el nombre de una acción de log para mostrarlo de forma legible
 *
 * Convierte snake_case a Title Case y maneja casos especiales.
 *
 * @param action - La acción en formato snake_case
 * @returns La acción formateada en Title Case
 *
 * @example
 * ```typescript
 * formatActionName('user_created'); // 'User Created'
 * formatActionName('password_reset'); // 'Password Reset'
 * formatActionName('delete_multiple'); // 'Delete Multiple'
 * ```
 */
export function formatActionName(action: string): string {
  if (!action) return '';

  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Obtiene el icono correspondiente a una acción de log
 *
 * @param action - La acción del log
 * @returns El nombre del icono de Material Icons
 *
 * @example
 * ```typescript
 * getActionIcon('user_created'); // 'person_add'
 * getActionIcon('user_deleted'); // 'person_remove'
 * getActionIcon('login'); // 'login'
 * ```
 */
export function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    user_created: 'person_add',
    user_updated: 'edit',
    user_deleted: 'person_remove',
    role_changed: 'swap_horiz',
    login: 'login',
    logout: 'logout',
    password_reset: 'lock_reset',
    permissions_updated: 'security',
    module_assigned: 'add_box',
    module_removed: 'remove_circle',
    account_activated: 'check_circle',
    account_deactivated: 'cancel'
  };

  return icons[action] || 'info';
}
