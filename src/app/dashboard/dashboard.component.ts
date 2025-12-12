// src/app/dashboard/dashboard.component.ts
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { UserDashboardService, UserDashboardData } from './services/user-dashboard.service';
import { AppConfigService } from '../core/services/app-config.service';
import { getPermissionIcon, fromFirestoreTimestamp } from '../shared/utils';

/**
 * Acción rápida del dashboard
 */
interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  route?: string;
  badge?: string;
  color: string;
}

/**
 * Métrica clave del dashboard
 */
interface KeyMetric {
  label: string;
  value: string;
  change: string;
  icon: string;
}

/**
 * Dashboard principal del usuario
 *
 * Componente optimizado que muestra información personalizada del usuario,
 * métricas clave, acciones rápidas y actividad reciente.
 *
 * @example
 * ```html
 * <app-dashboard></app-dashboard>
 * ```
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  // ============================================
  // DEPENDENCY INJECTION (Angular 20 pattern)
  // ============================================
  private authService = inject(AuthService);
  private appConfigService = inject(AppConfigService);
  private router = inject(Router);
  private userDashboardService = inject(UserDashboardService);
  private cdr = inject(ChangeDetectorRef);

  // ============================================
  // STATE (Signals - Angular 20)
  // ============================================

  /**
   * Usuario autenticado actual
   */
  user = this.authService.authorizedUser;

  /**
   * Datos del dashboard del usuario
   */
  userDashboard = signal<UserDashboardData | null>(null);

  /**
   * Nombre de la aplicación
   */
  appName = this.appConfigService.appName;

  /**
   * URL del logo de la aplicación
   */
  logoUrl = this.appConfigService.logoUrl;

  /**
   * Estado de carga
   */
  loading = signal(true);

  /**
   * Mensaje de error si ocurre algún problema
   */
  error = signal<string | null>(null);

  /**
   * Acciones rápidas disponibles
   */
  quickActions = signal<QuickAction[]>([]);

  /**
   * Métricas clave del usuario
   */
  keyMetrics = signal<KeyMetric[]>([]);

  // ============================================
  // COMPUTED SIGNALS (Angular 20)
  // ============================================

  /**
   * Verifica si el usuario es administrador
   */
  readonly isAdminUser = computed(() => {
    const dashboard = this.userDashboard();
    return dashboard?.userInfo.role === 'admin' ||
           dashboard?.userInfo.permissions.includes('manage_users') ||
           false;
  });

  /**
   * Contador de notificaciones (placeholder para futura implementación)
   */
  readonly notificationCount = computed(() => 0);

  // ============================================
  // SHARED UTILITIES (Angular 20 pattern)
  // ============================================

  /**
   * Utilidad compartida para obtener iconos de permisos
   */
  readonly getPermissionIcon = getPermissionIcon;

  // ============================================
  // LIFECYCLE
  // ============================================

  ngOnInit() {
    this.loadUserDashboard();
  }

  // ============================================
  // DATA LOADING
  // ============================================

  /**
   * Carga los datos del dashboard del usuario
   *
   * Obtiene la información del usuario desde el servicio y construye
   * los datos optimizados para la vista (acciones, métricas, actividades).
   *
   * @example
   * ```typescript
   * this.loadUserDashboard();
   * ```
   */
  private async loadUserDashboard() {
    const currentUser = this.user();

    if (!currentUser?.email) {
      this.error.set('No se pudo identificar al usuario actual');
      this.loading.set(false);
      this.cdr.markForCheck();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.cdr.markForCheck();

    try {
      const data = await this.userDashboardService.getUserDashboardData(currentUser.email);
      this.userDashboard.set(data);
      this.buildOptimizedData(data);
      this.loading.set(false);
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      this.error.set('Error al cargar tu información personal');
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Construye datos optimizados para la vista
   *
   * Procesa los datos del usuario y genera las estructuras necesarias
   * para acciones rápidas y métricas clave.
   *
   * @param data - Datos del dashboard del usuario
   */
  private buildOptimizedData(data: UserDashboardData) {
    // Quick Actions - Solo las relevantes
    this.quickActions.set(this.buildQuickActions(data));

    // Key Metrics - Solo 4 métricas esenciales
    this.keyMetrics.set(this.buildKeyMetrics(data));
  }

  /**
   * Construye las acciones rápidas basadas en permisos del usuario
   *
   * Genera un máximo de 4 acciones rápidas según el rol y permisos
   * del usuario autenticado.
   *
   * @param data - Datos del dashboard del usuario
   * @returns Array de acciones rápidas (máximo 4)
   *
   * @example
   * ```typescript
   * const actions = this.buildQuickActions(dashboardData);
   * // Retorna: [{ id: 'admin', title: 'Panel Admin', ... }, ...]
   * ```
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
   * Construye las 4 métricas clave del usuario
   *
   * Genera métricas esenciales basadas en los datos del usuario:
   * permisos, módulos, antigüedad de la cuenta y estado.
   *
   * @param data - Datos del dashboard del usuario
   * @returns Array de 4 métricas clave
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

  // ============================================
  // FORMATTING METHODS
  // ============================================

  /**
   * Formatea días desde la creación de la cuenta
   *
   * Convierte un número de días en una representación legible
   * (días, meses o años).
   *
   * @param days - Número de días desde la creación
   * @returns Texto formateado (ej: "Hoy", "5 días", "2 meses", "1 año")
   *
   * @example
   * ```typescript
   * formatDaysSince(0);   // "Hoy"
   * formatDaysSince(15);  // "15 días"
   * formatDaysSince(45);  // "1 meses"
   * formatDaysSince(400); // "1 años"
   * ```
   */
  formatDaysSince(days: number): string {
    if (days === 0) return 'Hoy';
    if (days === 1) return '1 día';
    if (days < 30) return `${days} días`;
    if (days < 365) return `${Math.floor(days / 30)} meses`;
    return `${Math.floor(days / 365)} años`;
  }

  /**
   * Formatea fecha de creación de la cuenta
   *
   * Convierte un timestamp de Firestore a formato legible en español.
   *
   * @param timestamp - Timestamp de Firestore o Date
   * @returns Fecha formateada (ej: "15 ene 2024")
   *
   * @example
   * ```typescript
   * formatCreationDate(firestoreTimestamp); // "15 ene 2024"
   * ```
   */
  private formatCreationDate(timestamp: any): string {
    if (!timestamp) return 'Fecha desconocida';
    try {
      const date = fromFirestoreTimestamp(timestamp);
      if (!date) return 'Fecha inválida';
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  /**
   * Obtiene la última sesión del usuario
   *
   * Retorna el tiempo transcurrido desde el último login
   * en formato legible (ej: "Hace 2 horas").
   *
   * @returns Texto con el tiempo transcurrido
   *
   * @example
   * ```typescript
   * getLastSession(); // "Hace 2 horas"
   * ```
   */
  getLastSession(): string {
    const dashboard = this.userDashboard();
    if (!dashboard) return 'Sin información';

    const loginInfo = this.userDashboardService.getLastLoginInfo(
      dashboard.userInfo.lastLogin
    );
    return loginInfo.timeAgo;
  }

  /**
   * Verifica si la sesión es reciente (menos de 1 hora)
   *
   * @returns true si el último login fue hace menos de 1 hora
   */
  isRecentSession(): boolean {
    const dashboard = this.userDashboard();
    if (!dashboard) return false;

    return this.userDashboardService.getLastLoginInfo(
      dashboard.userInfo.lastLogin
    ).isRecent;
  }

  /**
   * Obtiene etiqueta amigable para permisos
   *
   * Convierte el valor técnico del permiso en un texto legible en español.
   *
   * @param permission - Valor técnico del permiso (ej: 'read', 'write')
   * @returns Etiqueta en español
   *
   * @example
   * ```typescript
   * getPermissionLabel('read');         // 'Lectura'
   * getPermissionLabel('manage_users'); // 'Gestión usuarios'
   * ```
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

  // ============================================
  // USER ACTIONS
  // ============================================

  /**
   * Ejecuta una acción rápida
   *
   * Navega a la ruta especificada en la acción rápida seleccionada.
   *
   * @param action - Acción rápida a ejecutar
   *
   * @example
   * ```typescript
   * const action = { id: 'admin', route: '/admin', ... };
   * executeQuickAction(action); // Navega a /admin
   * ```
   */
  executeQuickAction(action: QuickAction) {
    if (action.route) {
      this.router.navigate([action.route]);
    } else if (action.id === 'modules') {
      // Navegación específica para módulos
      this.router.navigate(['/modules']);
    }
  }

  /**
   * Genera mensaje de insight inteligente
   *
   * Crea un mensaje personalizado basado en el rol, permisos
   * y antigüedad del usuario.
   *
   * @returns Mensaje de insight personalizado
   *
   * @example
   * ```typescript
   * getInsightMessage();
   * // "Has iniciado sesión regularmente en los últimos 30 días.
   * //  Tienes acceso completo al sistema con rol de administrador."
   * ```
   */
  getInsightMessage(): string {
    const dashboard = this.userDashboard();
    if (!dashboard) return '';

    const days = dashboard.userStats.daysSinceCreation;
    const isAdmin = dashboard.userInfo.role === 'admin';
    const hasFullAccess = dashboard.userStats.totalPermissions === 4;

    let message = `Has iniciado sesión regularmente en los últimos ${days} días. `;

    if (isAdmin && hasFullAccess) {
      message += 'Tienes acceso completo al sistema con rol de administrador.';
    } else if (hasFullAccess) {
      message += 'Tienes acceso completo al sistema.';
    } else {
      message += `Tienes ${dashboard.userStats.totalPermissions} permisos asignados.`;
    }

    return message;
  }

  /**
   * Verifica si es administrador (método público para el template)
   *
   * @returns true si el usuario es administrador
   */
  isAdmin(): boolean {
    return this.isAdminUser();
  }

  /**
   * Obtiene badge count para notificaciones (método público para el template)
   *
   * @returns Número de notificaciones
   */
  getNotificationCount(): number {
    return this.notificationCount();
  }

  /**
   * Refresca los datos del dashboard
   *
   * Recarga toda la información del usuario desde el servidor.
   *
   * @example
   * ```typescript
   * refreshData(); // Recarga el dashboard
   * ```
   */
  refreshData() {
    this.loadUserDashboard();
  }

  /**
   * Navega al panel de administración
   *
   * Solo permite la navegación si el usuario es administrador.
   *
   * @example
   * ```typescript
   * goToAdmin(); // Navega a /admin si es admin
   * ```
   */
  goToAdmin() {
    if (this.isAdmin()) {
      this.router.navigate(['/admin']);
    }
  }

  /**
   * Navega a la página de notificaciones
   *
   * @example
   * ```typescript
   * goToNotifications(); // Navega a /notifications
   * ```
   */
  goToNotifications() {
    this.router.navigate(['/notifications']);
  }
}
