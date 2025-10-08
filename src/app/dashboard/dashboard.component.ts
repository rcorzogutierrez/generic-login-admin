// src/app/dashboard/dashboard.component.ts - OPTIMIZADO PARA TAILWIND + MATERIAL
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { UserDashboardService, UserDashboardData, DashboardAction } from './services/user-dashboard.service';
import { Subject, takeUntil } from 'rxjs';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  route?: string;
  badge?: string;
  color: string;
}

interface KeyMetric {
  label: string;
  value: string;
  change: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatMenuModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  user = this.authService.authorizedUser;
  userDashboard: UserDashboardData | null = null;
  loading = true;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();

  // Propiedades optimizadas
  quickActions: QuickAction[] = [];
  keyMetrics: KeyMetric[] = [];
  recentActivities: any[] = [];

  constructor(
    private authService: AuthService, 
    private router: Router,
    private userDashboardService: UserDashboardService
  ) {}

  ngOnInit() {
    this.loadUserDashboard();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga datos y construye información optimizada
   */
  private loadUserDashboard() {
    const currentUser = this.user();
    
    if (!currentUser?.email) {
      this.error = 'No se pudo identificar al usuario actual';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;

    this.userDashboardService.getUserDashboardData(currentUser.email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.userDashboard = data;
          this.buildOptimizedData(data);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando dashboard:', error);
          this.error = 'Error al cargar tu información personal';
          this.loading = false;
        }
      });
  }

  /**
   * Construye datos optimizados para la vista
   */
  private buildOptimizedData(data: UserDashboardData) {
    // Quick Actions - Solo las relevantes
    this.quickActions = this.buildQuickActions(data);
    
    // Key Metrics - Solo 4 métricas esenciales
    this.keyMetrics = this.buildKeyMetrics(data);
    
    // Recent Activities - Limitado a 4 últimas
    this.recentActivities = data.recentActivity.slice(0, 4);
  }

  /**
   * Construye quick actions basadas en permisos
   */
  private buildQuickActions(data: UserDashboardData): QuickAction[] {
    const actions: QuickAction[] = [];
    const isAdmin = data.userInfo.role === 'admin';

    if (isAdmin || data.userInfo.permissions.includes('manage_users')) {
      actions.push({
        id: 'admin',
        title: 'Panel Admin',
        description: 'Gestionar sistema',
        icon: 'admin_panel_settings',
        route: '/admin',
        color: 'primary'
      });
      
      actions.push({
        id: 'users',
        title: 'Usuarios',
        description: 'Ver y editar usuarios',
        icon: 'group',
        route: '/admin',
        color: 'primary'
      });
    }

    if (data.userInfo.modules.length > 0) {
      actions.push({
        id: 'modules',
        title: 'Mis Módulos',
        description: `${data.userInfo.modules.length} módulos activos`,
        icon: 'apps',
        route: '/modules',
        badge: data.userInfo.modules.length.toString(),
        color: 'accent'
      });
    }

    actions.push({
      id: 'reports',
      title: 'Reportes',
      description: 'Ver estadísticas',
      icon: 'bar_chart',
      route: '/reports',
      color: 'default'
    });

    return actions.slice(0, 4); // Máximo 4 quick actions
  }

  /**
   * Construye métricas clave - Solo 4 esenciales
   */
  private buildKeyMetrics(data: UserDashboardData): KeyMetric[] {
    return [
      {
        label: 'Permisos activos',
        value: data.userStats.totalPermissions.toString(),
        change: data.userStats.totalPermissions === 4 ? '↑ Acceso completo' : '↑ Acceso limitado',
        icon: 'security'
      },
      {
        label: 'Módulos asignados',
        value: data.userStats.totalModules.toString(),
        change: data.userInfo.modules.join(' + ') || 'Sin módulos',
        icon: 'apps'
      },
      {
        label: 'Cuenta creada',
        value: this.formatDaysSince(data.userStats.daysSinceCreation),
        change: this.formatCreationDate(data.userInfo.createdAt),
        icon: 'calendar_today'
      },
      {
        label: 'Estado cuenta',
        value: data.userInfo.isActive ? '✓ Activo' : '✗ Inactivo',
        change: data.userInfo.isActive ? 'Todo operativo' : 'Requiere atención',
        icon: 'check_circle'
      }
    ];
  }

  /**
   * Formatea días desde creación
   */
  private formatDaysSince(days: number): string {
    if (days === 0) return 'Hoy';
    if (days === 1) return '1 día';
    if (days < 30) return `${days} días`;
    if (days < 365) return `${Math.floor(days / 30)} meses`;
    return `${Math.floor(days / 365)} años`;
  }

  /**
   * Formatea fecha de creación
   */
  private formatCreationDate(timestamp: any): string {
    if (!timestamp) return 'Fecha desconocida';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'Fecha inválida';
    }
  }

  /**
   * Obtiene última sesión de forma simplificada
   */
  getLastSession(): string {
    const loginInfo = this.userDashboardService.getLastLoginInfo(
      this.userDashboard?.userInfo.lastLogin
    );
    return loginInfo.timeAgo;
  }

  /**
   * Verifica si la sesión es reciente (menos de 1 hora)
   */
  isRecentSession(): boolean {
    return this.userDashboardService.getLastLoginInfo(
      this.userDashboard?.userInfo.lastLogin
    ).isRecent;
  } 

  /**
   * Formatea fecha de actividad
   */
  formatActivityDate(timestamp: any): string {
    return this.userDashboardService.formatDate(timestamp);
  }

  /**
   * Obtiene tiempo relativo para actividad (ej: "Hace 5 minutos")
   */
  getRelativeTime(timestamp: any): string {
    if (!timestamp) return 'Fecha desconocida';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Ahora mismo';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours}h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch {
      return 'Fecha inválida';
    }
  }

  /**
   * Obtiene icono para cada tipo de actividad
   */
  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      login: 'login',
      logout: 'logout',
      permission_granted: 'security',
      permission_revoked: 'block',
      module_assigned: 'apps',
      module_removed: 'remove_circle',
      profile_updated: 'person',
      status_changed: 'sync',
      created: 'add_circle',
      deleted: 'delete'
    };
    return icons[type] || 'info';
  }

  /**
   * Obtiene color para el icono de actividad
   * MODIFICADO: Retorna valores que coinciden con las clases CSS
   * - '' (vacío) = azul (primary)
   * - 'accent' = verde (success)
   * - 'warn' = ámbar (warning)
   */
  getActivityColor(type: string): '' | 'accent' | 'warn' {
    // Tipos que usan verde (success)
    const successTypes = ['login', 'permission_granted', 'module_assigned', 'created'];
    
    // Tipos que usan ámbar (warning)
    const warningTypes = ['logout', 'permission_revoked', 'module_removed', 'status_changed'];
    
    if (successTypes.includes(type)) {
      return 'accent'; // Usará .activity-icon-success (verde)
    }
    
    if (warningTypes.includes(type)) {
      return 'warn'; // Usará .activity-icon-warning (ámbar)
    }
    
    return ''; // Usará .activity-icon-primary (azul) por defecto
  }

  /**
   * Obtiene icono para cada permiso
   */
  getPermissionIcon(permission: string): string {
    const icons: Record<string, string> = {
      read: 'visibility',
      write: 'edit',
      delete: 'delete',
      manage_users: 'group'
    };
    return icons[permission] || 'verified';
  }

  /**
   * Obtiene etiqueta amigable para permisos
   */
  getPermissionLabel(permission: string): string {
    const labels: Record<string, string> = {
      read: 'Lectura',
      write: 'Escritura',
      delete: 'Eliminación',
      manage_users: 'Gestión usuarios'
    };
    return labels[permission] || permission;
  }

  /**
   * Ejecuta una quick action
   */
  executeQuickAction(action: QuickAction) {
    if (action.route) {
      this.router.navigate([action.route]);
    }
  }

  /**
   * Genera mensaje de insight inteligente
   */
  getInsightMessage(): string {
    if (!this.userDashboard) return '';
    
    const days = this.userDashboard.userStats.daysSinceCreation;
    const isAdmin = this.userDashboard.userInfo.role === 'admin';
    const hasFullAccess = this.userDashboard.userStats.totalPermissions === 4;

    let message = `Has iniciado sesión regularmente en los últimos ${days} días. `;
    
    if (isAdmin && hasFullAccess) {
      message += 'Tienes acceso completo al sistema con rol de administrador.';
    } else if (hasFullAccess) {
      message += 'Tienes acceso completo al sistema.';
    } else {
      message += `Tienes ${this.userDashboard.userStats.totalPermissions} permisos asignados.`;
    }

    return message;
  }

  /**
   * Verifica si es administrador
   */
  isAdmin(): boolean {
    return this.userDashboard?.userInfo.role === 'admin' || 
           this.userDashboard?.userInfo.permissions.includes('manage_users') || false;
  }

  /**
   * Obtiene badge count para notificaciones
   */
  getNotificationCount(): number {
    // TODO: Implementar lógica real de notificaciones
    // Por ahora retorna 0, pero podrías conectarlo con un servicio
    return 0;
  }

  /**
   * Refresca los datos del dashboard
   */
  refreshData() {
    this.loadUserDashboard();
  }

  /**
   * Navega al panel de admin
   */
  goToAdmin() {
    if (this.isAdmin()) {
      this.router.navigate(['/admin']);
    }
  }

  /**
   * Navega a notificaciones
   */
  goToNotifications() {
    this.router.navigate(['/notifications']);
  }


}