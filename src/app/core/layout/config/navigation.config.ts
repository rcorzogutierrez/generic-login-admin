// src/app/core/layout/config/navigation.config.ts
import { NavigationConfig } from '../models/nav-item.model';

/**
 * Configuración de navegación del sistema
 *
 * Estructura modular que permite agregar nuevos módulos fácilmente.
 * Los módulos se muestran según los permisos del usuario.
 */
export const NAVIGATION_CONFIG: NavigationConfig = {
  groups: [
    // ============================================
    // GRUPO PRINCIPAL
    // ============================================
    {
      id: 'main',
      title: 'Principal',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: 'dashboard',
          route: '/dashboard',
          tooltip: 'Panel principal'
        }
      ]
    },

    // ============================================
    // MÓDULOS CORE DEL NEGOCIO
    // ============================================
    {
      id: 'modules',
      title: 'Módulos',
      items: [
        {
          id: 'clients',
          label: 'Clientes',
          icon: 'group',
          route: '/modules/clients',
          module: 'clients',
          tooltip: 'Gestión de clientes'
        },
        {
          id: 'materials',
          label: 'Materiales',
          icon: 'inventory_2',
          route: '/modules/materials',
          module: 'materials',
          tooltip: 'Inventario de materiales'
        },
        {
          id: 'workers',
          label: 'Trabajadores',
          icon: 'engineering',
          route: '/modules/workers',
          module: 'workers',
          tooltip: 'Gestión de personal'
        },
        {
          id: 'projects',
          label: 'Proyectos',
          icon: 'assignment',
          route: '/modules/projects',
          module: 'projects',
          tooltip: 'Gestión de proyectos'
        },
        {
          id: 'work-planning',
          label: 'Planificación',
          icon: 'event_note',
          route: '/modules/work-planning',
          module: 'work-planning',
          tooltip: 'Planificación de trabajo'
        },
        {
          id: 'treasury',
          label: 'Tesorería',
          icon: 'account_balance_wallet',
          route: '/modules/treasury',
          module: 'treasury',
          tooltip: 'Cobros y pagos'
        }
      ]
    },

    // ============================================
    // ADMINISTRACIÓN (Solo admins)
    // ============================================
    {
      id: 'admin',
      title: 'Administración',
      adminOnly: true,
      items: [
        {
          id: 'admin-panel',
          label: 'Panel Admin',
          icon: 'admin_panel_settings',
          route: '/admin',
          adminOnly: true,
          tooltip: 'Panel de administración'
        },
        {
          id: 'admin-users',
          label: 'Usuarios',
          icon: 'people',
          route: '/admin/users',
          adminOnly: true,
          tooltip: 'Gestión de usuarios'
        },
        {
          id: 'admin-roles',
          label: 'Roles',
          icon: 'security',
          route: '/admin/roles',
          adminOnly: true,
          tooltip: 'Gestión de roles'
        },
        {
          id: 'admin-modules',
          label: 'Módulos',
          icon: 'extension',
          route: '/admin/modules',
          adminOnly: true,
          tooltip: 'Configurar módulos'
        },
        {
          id: 'admin-config',
          label: 'Configuración',
          icon: 'settings',
          route: '/admin/config',
          adminOnly: true,
          tooltip: 'Configuración del sistema'
        },
        {
          id: 'admin-logs',
          label: 'Logs',
          icon: 'history',
          route: '/admin/logs',
          adminOnly: true,
          tooltip: 'Registros del sistema'
        },
        {
          id: 'admin-business',
          label: 'Empresa',
          icon: 'business',
          route: '/admin/business',
          adminOnly: true,
          tooltip: 'Información de la empresa'
        }
      ]
    }
  ]
};
