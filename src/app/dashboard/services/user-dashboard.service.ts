// src/app/dashboard/services/user-dashboard.service.ts - REFACTORIZADO
import { Injectable } from '@angular/core';
import { FirestoreUserService, FirestoreUser } from '../../core/services/firestore-user.service';

export interface UserDashboardData {
  userInfo: {
    email: string;
    displayName: string;
    role: string;
    permissions: string[];
    modules: string[];
    isActive: boolean;
    lastLogin: any;
    createdAt: any;
  };
  userStats: {
    totalPermissions: number;
    totalModules: number;
    daysSinceCreation: number;
    lastLoginFormatted: string;
    isRecentLogin: boolean;
    lastLoginTimestamp: any;
  };
  availableActions: DashboardAction[];
  recentActivity: UserActivity[];
}

export interface DashboardAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  route?: string;
  action?: string;
  color: 'primary' | 'secondary' | 'default';
  visible: boolean;
}

export interface UserActivity {
  id: string;
  type: 'login' | 'permission_granted' | 'module_assigned' | 'profile_updated';
  description: string;
  timestamp: any;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class UserDashboardService {

  constructor(private firestoreUserService: FirestoreUserService) {}

  /**
   * Obtiene datos del dashboard por email (identificador más confiable)
   */
  async getUserDashboardData(email: string): Promise<UserDashboardData> {
    try {
      const result = await this.firestoreUserService.findUserByEmail(email);
      if (!result) {
        throw new Error('Usuario no encontrado');
      }
      return this.buildDashboardData(result.data);
    } catch (error) {
      console.error('Error obteniendo datos del dashboard:', error);
      return this.getDefaultDashboardData();
    }
  }

  /**
   * Construye los datos del dashboard a partir de los datos del usuario
   */
  private buildDashboardData(userData: FirestoreUser): UserDashboardData {
    return {
      userInfo: {
        email: userData.email,
        displayName: userData.displayName || userData.email,
        role: userData.role,
        permissions: userData.permissions || [],
        modules: userData.modules || [],
        isActive: userData.isActive,
        lastLogin: userData.lastLogin,
        createdAt: userData.createdAt
      },
      userStats: this.calculateUserStats(userData),
      availableActions: this.getAvailableActions(userData),
      recentActivity: this.generateUserActivity(userData)
    };
  }

  /**
   * Calcula estadísticas del usuario
   */
  private calculateUserStats(userData: FirestoreUser): UserDashboardData['userStats'] {
    const now = new Date();
    
    let daysSinceCreation = 0;
    if (userData.createdAt) {
      const createdDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
      daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    let lastLoginFormatted = 'Nunca';
    let isRecentLogin = false;
    
    if (userData.lastLogin) {
      try {
        const lastLoginDate = userData.lastLogin.toDate ? userData.lastLogin.toDate() : new Date(userData.lastLogin);
        lastLoginFormatted = lastLoginDate.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const hoursDiff = (now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60);
        isRecentLogin = hoursDiff < 1;
      } catch {
        lastLoginFormatted = 'Fecha no válida';
      }
    }

    return {
      totalPermissions: userData.permissions?.length || 0,
      totalModules: userData.modules?.length || 0,
      daysSinceCreation,
      lastLoginFormatted,
      isRecentLogin,
      lastLoginTimestamp: userData.lastLogin
    };
  }

  /**
   * Determina acciones disponibles según el rol
   */
  private getAvailableActions(userData: FirestoreUser): DashboardAction[] {
    const actions: DashboardAction[] = [];
    const isAdmin = userData.role === 'admin' || userData.permissions?.includes('manage_users');

    // Acciones de admin
    if (isAdmin) {
      actions.push(
        {
          id: 'admin_panel',
          title: 'Panel Admin',
          description: 'Gestión administrativa del sistema',
          icon: 'admin_panel_settings',
          route: '/admin',
          color: 'primary',
          visible: true
        },
        {
          id: 'manage_users',
          title: 'Gestionar Usuarios',
          description: 'Administrar cuentas de usuario',
          icon: 'group',
          route: '/admin',
          color: 'secondary',
          visible: true
        }
      );
    }

    // Acciones comunes
    actions.push(
      {
        id: 'modules',
        title: 'Mis Módulos',
        description: 'Acceder a módulos asignados',
        icon: 'apps',
        route: '/modules',
        color: 'default',
        visible: userData.modules && userData.modules.length > 0
      },
      {
        id: 'profile',
        title: 'Mi Perfil',
        description: 'Ver y editar información personal',
        icon: 'account_circle',
        route: '/profile',
        color: 'default',
        visible: true
      },
      {
        id: 'activity',
        title: 'Mi Actividad',
        description: 'Ver historial de acciones',
        icon: 'history',
        route: '/activity',
        color: 'default',
        visible: true
      },
      {
        id: 'settings',
        title: 'Configuración',
        description: 'Preferencias de la cuenta',
        icon: 'settings',
        route: '/settings',
        color: 'default',
        visible: true
      }
    );

    return actions.filter(action => action.visible);
  }

  /**
   * Genera actividad reciente del usuario
   */
  private generateUserActivity(userData: FirestoreUser): UserActivity[] {
    const activities: UserActivity[] = [];

    if (userData.createdAt) {
      activities.push({
        id: 'account_created',
        type: 'profile_updated',
        description: 'Cuenta creada exitosamente',
        timestamp: userData.createdAt,
        details: { role: userData.role }
      });
    }

    if (userData.lastLogin) {
      activities.push({
        id: 'last_login',
        type: 'login',
        description: 'Último inicio de sesión',
        timestamp: userData.lastLogin
      });
    }

    if (userData.permissions && userData.permissions.length > 0) {
      activities.push({
        id: 'permissions_granted',
        type: 'permission_granted',
        description: `${userData.permissions.length} permisos asignados`,
        timestamp: userData.createdAt || new Date(),
        details: { permissions: userData.permissions }
      });
    }

    if (userData.modules && userData.modules.length > 0) {
      activities.push({
        id: 'modules_assigned',
        type: 'module_assigned',
        description: `Asignado a ${userData.modules.length} módulos`,
        timestamp: userData.createdAt || new Date(),
        details: { modules: userData.modules }
      });
    }

    return activities.sort((a, b) => {
      const timestampA = a.timestamp?.seconds || 0;
      const timestampB = b.timestamp?.seconds || 0;
      return timestampB - timestampA;
    });
  }

  /**
   * Obtiene información detallada del último login
   */
  getLastLoginInfo(lastLogin: any): { formatted: string, timeAgo: string, isRecent: boolean } {
    if (!lastLogin) {
      return {
        formatted: 'Nunca',
        timeAgo: 'Sin registros de acceso',
        isRecent: false
      };
    }

    try {
      const loginDate = lastLogin.toDate ? lastLogin.toDate() : new Date(lastLogin);
      const now = new Date();
      const diffMs = now.getTime() - loginDate.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let timeAgo = '';
      if (diffMins < 1) {
        timeAgo = 'Ahora mismo';
      } else if (diffMins < 60) {
        timeAgo = `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
      } else if (diffHours < 24) {
        timeAgo = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
      } else {
        timeAgo = `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
      }

      return {
        formatted: loginDate.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        timeAgo,
        isRecent: diffMins < 60
      };
    } catch {
      return {
        formatted: 'Fecha no válida',
        timeAgo: 'Error al calcular tiempo',
        isRecent: false
      };
    }
  }

  /**
   * Formatea fechas para mostrar
   */
  formatDate(timestamp: any): string {
    if (!timestamp) return 'No disponible';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha no válida';
    }
  }

  /**
   * Datos por defecto en caso de error
   */
  private getDefaultDashboardData(): UserDashboardData {
    return {
      userInfo: {
        email: '',
        displayName: 'Usuario',
        role: 'user',
        permissions: [],
        modules: [],
        isActive: true,
        lastLogin: null,
        createdAt: null
      },
      userStats: {
        totalPermissions: 0,
        totalModules: 0,
        daysSinceCreation: 0,
        lastLoginFormatted: 'No disponible',
        isRecentLogin: false,
        lastLoginTimestamp: null
      },
      availableActions: [
        {
          id: 'profile',
          title: 'Mi Perfil',
          description: 'Ver información personal',
          icon: 'account_circle',
          color: 'default',
          visible: true
        }
      ],
      recentActivity: []
    };
  }
}