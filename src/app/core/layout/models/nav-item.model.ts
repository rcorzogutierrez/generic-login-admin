// src/app/core/layout/models/nav-item.model.ts

/**
 * Representa un item de navegación en el sidebar
 */
export interface NavItem {
  /** Identificador único del item */
  id: string;
  /** Texto a mostrar */
  label: string;
  /** Icono de Material Icons */
  icon: string;
  /** Ruta de navegación */
  route?: string;
  /** Items hijos (para submenús) */
  children?: NavItem[];
  /** Si requiere rol de admin */
  adminOnly?: boolean;
  /** Nombre del módulo requerido (para verificar permisos) */
  module?: string;
  /** Badge o contador a mostrar */
  badge?: number | string;
  /** Color del badge */
  badgeColor?: 'primary' | 'accent' | 'warn';
  /** Si está deshabilitado */
  disabled?: boolean;
  /** Tooltip personalizado */
  tooltip?: string;
  /** Si es un divisor (separator) */
  divider?: boolean;
}

/**
 * Grupo de navegación con título
 */
export interface NavGroup {
  /** Identificador único del grupo */
  id: string;
  /** Título del grupo (se oculta en modo colapsado) */
  title: string;
  /** Items de navegación del grupo */
  items: NavItem[];
  /** Si requiere rol de admin para ver el grupo */
  adminOnly?: boolean;
}

/**
 * Configuración completa de navegación
 */
export interface NavigationConfig {
  /** Grupos de navegación */
  groups: NavGroup[];
}
