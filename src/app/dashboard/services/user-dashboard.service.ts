// src/app/dashboard/services/user-dashboard.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  getFirestore, 
  doc, 
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp 
} from 'firebase/firestore';

export interface UserDashboardData {
  userInfo: {
    email: string;
    displayName: string;
    role: string;
    permissions: string[];
    projects: string[];
    isActive: boolean;
    lastLogin: any;
    createdAt: any;
  };
  userStats: {
    totalPermissions: number;
    totalProjects: number;
    daysSinceCreation: number;
    lastLoginFormatted: string;
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
  type: 'login' | 'permission_granted' | 'project_assigned' | 'profile_updated';
  description: string;
  timestamp: any;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class UserDashboardService {
  private db = getFirestore();

  constructor() {}

  /**
   * Obtiene todos los datos del dashboard para el usuario actual
   */
  getUserDashboardData(userId: string): Observable<UserDashboardData> {
    console.log('🔍 Buscando datos para userId:', userId);
    
    return from(this.fetchUserData(userId)).pipe(
      map(userData => {
        console.log('📊 Datos obtenidos de Firebase:', userData);
        
        if (!userData) {
          console.warn('⚠️ No se encontró usuario con ID:', userId);
          throw new Error('Usuario no encontrado');
        }

        const dashboardData = {
          userInfo: {
            email: userData.email || '',
            displayName: userData.displayName || userData.email || 'Usuario',
            role: userData.role || 'user',
            permissions: userData.permissions || [],
            projects: userData.projects || [],
            isActive: userData.isActive !== false,
            lastLogin: userData.lastLogin,
            createdAt: userData.createdAt
          },
          userStats: this.calculateUserStats(userData),
          availableActions: this.getAvailableActions(userData),
          recentActivity: this.generateUserActivity(userData)
        };

        console.log('✅ Dashboard data procesada:', dashboardData);
        return dashboardData;
      }),
      catchError(error => {
        console.error('💥 Error obteniendo datos del dashboard del usuario:', error);
        return of(this.getDefaultDashboardData());
      })
    );
  }

  /**
   * Obtiene los datos del usuario desde Firebase
   */
  private async fetchUserData(userId: string): Promise<any> {
    console.log('🔍 Consultando Firebase para userId:', userId);
    
    try {
      const userRef = doc(this.db, 'authorized_users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = { id: userSnap.id, ...userSnap.data() };
        console.log('✅ Usuario encontrado en Firebase:', userData);
        return userData;
      } else {
        console.warn('⚠️ Documento no existe para userId:', userId);
        
        // Intentar buscar por email como fallback
        const usersRef = collection(this.db, 'authorized_users');
        const querySnapshot = await getDocs(usersRef);
        
        console.log('🔍 Buscando en toda la colección authorized_users...');
        let foundUser = null;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('📄 Usuario encontrado:', { id: doc.id, ...data });
          
          // Si coincide con algún criterio, usar este usuario
          if (doc.id === userId || data['uid'] === userId) {
            foundUser = { id: doc.id, ...data };
            console.log('✅ Usuario coincidente encontrado:', foundUser);
          }
        });
        
        return foundUser;
      }
    } catch (error) {
      console.error('💥 Error consultando Firebase:', error);
      throw error;
    }
  }

  /**
   * Calcula estadísticas del usuario
   */
  private calculateUserStats(userData: any): any {
    const createdAt = userData.createdAt;
    const now = new Date();
    
    let daysSinceCreation = 0;
    if (createdAt) {
      const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
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
        
        // Verificar si el login es reciente (menos de 1 hora)
        const hoursDiff = (now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60);
        isRecentLogin = hoursDiff < 1;
        
      } catch (e) {
        lastLoginFormatted = 'Fecha no válida';
      }
    }

    return {
      totalPermissions: userData.permissions?.length || 0,
      totalProjects: userData.projects?.length || 0,
      daysSinceCreation,
      lastLoginFormatted,
      isRecentLogin,
      lastLoginTimestamp: userData.lastLogin
    };
  }

  /**
   * Actualiza el último acceso del usuario actual
   */
  async updateCurrentUserLastLogin(userId: string): Promise<void> {
    try {
      const userRef = doc(this.db, 'authorized_users', userId);
      const now = Timestamp.now();
      
      await updateDoc(userRef, {
        lastLogin: now,
        lastLoginDate: new Date().toISOString()
      });
      
      console.log('✅ Último acceso actualizado para usuario:', userId);
    } catch (error) {
      console.error('❌ Error actualizando último acceso:', error);
    }
  }

  /**
   * Obtiene información detallada sobre el último acceso
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
        timeAgo = `Hace ${diffMins} minutos`;
      } else if (diffHours < 24) {
        timeAgo = `Hace ${diffHours} horas`;
      } else {
        timeAgo = `Hace ${diffDays} días`;
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
        isRecent: diffMins < 60 // Consideramos reciente si es menos de 1 hora
      };
    } catch (e) {
      return {
        formatted: 'Fecha no válida',
        timeAgo: 'Error al calcular tiempo',
        isRecent: false
      };
    }
  }

  /**
   * Determina las acciones disponibles según el rol del usuario
   */
  private getAvailableActions(userData: any): DashboardAction[] {
    const role = userData.role || 'user';
    const permissions = userData.permissions || [];
    
    const actions: DashboardAction[] = [
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
    ];

    // Acciones específicas para administradores
    if (role === 'admin' || permissions.includes('manage_users')) {
      actions.unshift(
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
          route: '/admin/users',
          color: 'secondary',
          visible: true
        }
      );
    }

    // Acciones para usuarios con permisos de escritura
    if (permissions.includes('write') || role === 'admin') {
      actions.splice(3, 0, {
        id: 'projects',
        title: 'Mis Proyectos',
        description: 'Acceder a proyectos asignados',
        icon: 'work',
        route: '/projects',
        color: 'default',
        visible: userData.projects?.length > 0
      });
    }

    return actions.filter(action => action.visible);
  }

  /**
   * Genera actividad reciente del usuario
   */
  private generateUserActivity(userData: any): UserActivity[] {
    const activities: UserActivity[] = [];

    // Actividad de creación de cuenta
    if (userData.createdAt) {
      activities.push({
        id: 'account_created',
        type: 'profile_updated',
        description: 'Cuenta creada exitosamente',
        timestamp: userData.createdAt,
        details: { role: userData.role }
      });
    }

    // Último login
    if (userData.lastLogin) {
      activities.push({
        id: 'last_login',
        type: 'login',
        description: 'Último inicio de sesión',
        timestamp: userData.lastLogin
      });
    }

    // Permisos asignados
    if (userData.permissions && userData.permissions.length > 0) {
      activities.push({
        id: 'permissions_granted',
        type: 'permission_granted',
        description: `${userData.permissions.length} permisos asignados`,
        timestamp: userData.createdAt || new Date(),
        details: { permissions: userData.permissions }
      });
    }

    // Proyectos asignados
    if (userData.projects && userData.projects.length > 0) {
      activities.push({
        id: 'projects_assigned',
        type: 'project_assigned',
        description: `Asignado a ${userData.projects.length} proyectos`,
        timestamp: userData.createdAt || new Date(),
        details: { projects: userData.projects }
      });
    }

    // Ordenar por timestamp descendente
    return activities.sort((a, b) => {
      const timestampA = a.timestamp?.seconds || 0;
      const timestampB = b.timestamp?.seconds || 0;
      return timestampB - timestampA;
    });
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
        projects: [],
        isActive: true,
        lastLogin: null,
        createdAt: null
      },
      userStats: {
        totalPermissions: 0,
        totalProjects: 0,
        daysSinceCreation: 0,
        lastLoginFormatted: 'No disponible'
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

  /**
   * Obtiene las actividades específicas del usuario desde Firebase (opcional)
   */
  getUserActivities(userId: string, limit: number = 10): Observable<UserActivity[]> {
    // Esta función podría consultar una colección de logs específica del usuario
    // Por ahora devolvemos actividad basada en los datos del usuario
    return this.getUserDashboardData(userId).pipe(
      map(data => data.recentActivity.slice(0, limit))
    );
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
}