// src/app/dashboard/dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { UserDashboardService, UserDashboardData, DashboardAction, UserActivity } from './services/user-dashboard.service';
import { Subject, takeUntil } from 'rxjs';

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
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  user = this.authService.authorizedUser;
  appInfo = this.authService.getAppInfo();
  
  // Datos personales del usuario
  userDashboard: UserDashboardData | null = null;
  loading = true;
  error: string | null = null;
  
  // Para manejo de subscripciones
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService, 
    private router: Router,
    private userDashboardService: UserDashboardService
  ) {}

  ngOnInit() {
    console.log('📊 Dashboard cargado para usuario:', this.user()?.email);
    this.updateUserLastLogin();
    this.loadUserDashboard();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Actualiza el último acceso del usuario al cargar el dashboard
   */
  private async updateUserLastLogin() {
    const currentUser = this.user();
    if (currentUser?.uid) {
      await this.userDashboardService.updateCurrentUserLastLogin(currentUser.uid);
    }
  }

  /**
   * Carga los datos personales del dashboard del usuario
   */
  private loadUserDashboard() {
    const currentUser = this.user();
    console.log('👤 Usuario actual completo:', currentUser);
    console.log('🆔 UID del usuario:', currentUser?.uid);
    console.log('📧 Email del usuario:', currentUser?.email);

    if (!currentUser?.uid) {
      console.error('❌ No se pudo identificar al usuario actual');
      this.error = 'No se pudo identificar al usuario actual';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;

    // Intentar con diferentes IDs posibles
    const possibleIds = [
      currentUser.uid,
      currentUser.email
    ].filter(id => id); // Filtrar valores falsy

    console.log('🔍 IDs posibles a probar:', possibleIds);

    // Intentar con el primer ID (uid)
    this.userDashboardService.getUserDashboardData(currentUser.uid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.userDashboard = data;
          this.loading = false;
          console.log('📈 Dashboard personal cargado exitosamente:', data);
        },
        error: (error) => {
          console.error('💥 Error cargando dashboard personal:', error);
          this.error = 'Error al cargar tu información personal. Revisa la consola para más detalles.';
          this.loading = false;
        }
      });
  }

  /**
   * Recarga los datos del dashboard
   */
  refreshData() {
    this.loadUserDashboard();
  }

  /**
   * Ejecuta una acción del dashboard
   */
  executeAction(action: DashboardAction) {
    if (action.route) {
      this.router.navigate([action.route]);
    } else if (action.action) {
      this.handleCustomAction(action.action);
    }
    console.log('🎯 Ejecutando acción:', action.title);
  }

  /**
   * Maneja acciones personalizadas
   */
  private handleCustomAction(actionId: string) {
    switch (actionId) {
      case 'logout':
        this.logout();
        break;
      case 'refresh':
        this.refreshData();
        break;
      default:
        console.warn('⚠️ Acción no reconocida:', actionId);
    }
  }

  /**
   * Obtiene información detallada del último acceso
   */
  getLastLoginInfo() {
    if (!this.userDashboard?.userInfo.lastLogin) {
      return {
        formatted: 'Nunca',
        timeAgo: 'Sin registros de acceso',
        isRecent: false
      };
    }
    return this.userDashboardService.getLastLoginInfo(this.userDashboard.userInfo.lastLogin);
  }

  /**
   * Obtiene el mensaje de último acceso con estilo
   */
  getLastAccessMessage(): string {
    const loginInfo = this.getLastLoginInfo();
    
    if (loginInfo.isRecent) {
      return `Acceso reciente (${loginInfo.timeAgo})`;
    }
    
    return `${loginInfo.timeAgo}`;
  }

  /**
   * Verifica si el último acceso es reciente (para styling)
   */
  isRecentAccess(): boolean {
    return this.getLastLoginInfo().isRecent;
  }

  /**
   * Obtiene el color del chip según el rol
   */
  getRoleColor(role: string | undefined): string {
    switch (role) {
      case 'admin':
        return 'warn';
      case 'user':
        return 'primary';
      case 'viewer':
        return 'accent';
      default:
        return '';
    }
  }

  /**
   * Obtiene el color de la acción según su tipo
   */
  getActionClass(action: DashboardAction): string {
    return `action-button ${action.color}`;
  }

  /**
   * Obtiene el icono según el tipo de actividad
   */
  getActivityIcon(type: string): string {
    switch (type) {
      case 'login': return 'login';
      case 'permission_granted': return 'security';
      case 'module_assigned': return 'apps';
      case 'profile_updated': return 'person';
      default: return 'info';
    }
  }

  /**
   * Obtiene el color del icono según el tipo de actividad
   */
  getActivityIconColor(type: string): string {
    switch (type) {
      case 'login': return 'primary';
      case 'permission_granted': return 'accent';
      case 'module_assigned': return 'warn';
      case 'profile_updated': return 'primary';
      default: return '';
    }
  }

  /**
   * Formatea fechas usando el servicio
   */
  formatDate(timestamp: any): string {
    return this.userDashboardService.formatDate(timestamp);
  }

  /**
   * Obtiene el icono según el permiso
   */
  getPermissionIcon(permission: string): string {
    switch (permission) {
      case 'read': return 'visibility';
      case 'write': return 'edit';
      case 'delete': return 'delete';
      case 'manage_users': return 'group';
      default: return 'verified';
    }
  }

  /**
   * Obtiene un mensaje personalizado según los días desde creación
   */
  getMembershipMessage(): string {
    if (!this.userDashboard?.userStats.daysSinceCreation) return '';
    
    const days = this.userDashboard.userStats.daysSinceCreation;
    if (days === 0) return 'Te uniste hoy';
    if (days === 1) return 'Te uniste ayer';
    if (days < 7) return `Te uniste hace ${days} días`;
    if (days < 30) return `Te uniste hace ${Math.floor(days / 7)} semanas`;
    if (days < 365) return `Te uniste hace ${Math.floor(days / 30)} meses`;
    return `Te uniste hace ${Math.floor(days / 365)} años`;
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  hasPermission(permission: string): boolean {
    return this.userDashboard?.userInfo.permissions?.includes(permission) || false;
  }

  /**
   * Verifica si el usuario es administrador
   */
  isAdmin(): boolean {
    return this.userDashboard?.userInfo.role === 'admin' || this.hasPermission('manage_users');
  }

  /**
   * Verifica si el usuario tiene acceso a un módulo específico
   */
  hasModuleAccess(moduleId: string): boolean {
    return this.userDashboard?.userInfo.modules?.includes(moduleId) || this.isAdmin();
  }

  /**
   * Obtiene la cantidad de módulos asignados al usuario
   */
  getModuleCount(): number {
    return this.userDashboard?.userStats.totalModules || 0;
  }

  /**
   * Obtiene la lista de módulos del usuario
   */
  getUserModules(): string[] {
    return this.userDashboard?.userInfo.modules || [];
  }

  /**
   * Cierra sesión del usuario
   */
  async logout() {
    try {
      await this.authService.logout();
      console.log('👋 Sesión cerrada desde dashboard');
    } catch (error) {
      console.error('💥 Error cerrando sesión:', error);
    }
  }

  /**
   * Navega al panel de administración
   */
  goToAdmin() {
    if (this.isAdmin()) {
      this.router.navigate(['/admin']);
    } else {
      console.warn('🚫 Sin permisos de administrador');
    }
  }

  /**
   * Navega a la gestión de usuarios
   */
  manageUsers() {
    if (this.isAdmin()) {
      this.router.navigate(['/admin']);
    } else {
      console.warn('🚫 Sin permisos para gestionar usuarios');
    }
  }

  /**
   * Navega a los módulos del usuario
   */
  viewModules() {
    console.log('📱 Ver módulos...');
    this.router.navigate(['/modules']);
  }

  /**
   * Ver perfil del usuario
   */
  viewProfile() {
    console.log('👤 Ver perfil...');
    // Implementar vista de perfil
  }

  /**
   * Ver actividad detallada
   */
  viewActivity() {
    console.log('📈 Ver actividad...');
    // Implementar vista de actividad completa
  }

  /**
   * Ver configuración del sistema
   */
  viewSettings() {
    console.log('⚙️ Configuración...');
    // Implementar configuración
  }
}