// src/app/dashboard/dashboard.component.ts - REFACTORIZADO
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
import { UserDashboardService, UserDashboardData, DashboardAction } from './services/user-dashboard.service';
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
  
  userDashboard: UserDashboardData | null = null;
  loading = true;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();

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
   * Carga los datos del dashboard usando el email del usuario
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

    // Usar email como identificador principal (más confiable)
    this.userDashboardService.getUserDashboardData(currentUser.email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.userDashboard = data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando dashboard:', error);
          this.error = 'Error al cargar tu información personal';
          this.loading = false;
        }
      });
  }

  refreshData() {
    this.loadUserDashboard();
  }

  executeAction(action: DashboardAction) {
    if (action.route) {
      this.router.navigate([action.route]);
    } else if (action.action) {
      this.handleCustomAction(action.action);
    }
  }

  private handleCustomAction(actionId: string) {
    switch (actionId) {
      case 'logout':
        this.logout();
        break;
      case 'refresh':
        this.refreshData();
        break;
      default:
        console.warn('Acción no reconocida:', actionId);
    }
  }

  getLastLoginInfo() {
    if (!this.userDashboard?.userInfo.lastLogin) {
      return { formatted: 'Nunca', timeAgo: 'Sin registros de acceso', isRecent: false };
    }
    return this.userDashboardService.getLastLoginInfo(this.userDashboard.userInfo.lastLogin);
  }

  getLastAccessMessage(): string {
    const loginInfo = this.getLastLoginInfo();
    return loginInfo.isRecent ? `Acceso reciente (${loginInfo.timeAgo})` : loginInfo.timeAgo;
  }

  isRecentAccess(): boolean {
    return this.getLastLoginInfo().isRecent;
  }

  getRoleColor(role: string | undefined): string {
    const colors: Record<string, string> = {
      admin: 'warn',
      user: 'primary',
      viewer: 'accent'
    };
    return colors[role || ''] || '';
  }

  getActionClass(action: DashboardAction): string {
    return `action-button ${action.color}`;
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      login: 'login',
      permission_granted: 'security',
      module_assigned: 'apps',
      profile_updated: 'person'
    };
    return icons[type] || 'info';
  }

  getActivityIconColor(type: string): string {
    const colors: Record<string, string> = {
      login: 'primary',
      permission_granted: 'accent',
      module_assigned: 'warn',
      profile_updated: 'primary'
    };
    return colors[type] || '';
  }

  formatDate(timestamp: any): string {
    return this.userDashboardService.formatDate(timestamp);
  }

  getPermissionIcon(permission: string): string {
    const icons: Record<string, string> = {
      read: 'visibility',
      write: 'edit',
      delete: 'delete',
      manage_users: 'group'
    };
    return icons[permission] || 'verified';
  }

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

  hasPermission(permission: string): boolean {
    return this.userDashboard?.userInfo.permissions?.includes(permission) || false;
  }

  isAdmin(): boolean {
    return this.userDashboard?.userInfo.role === 'admin' || this.hasPermission('manage_users');
  }

  hasModuleAccess(moduleId: string): boolean {
    return this.userDashboard?.userInfo.modules?.includes(moduleId) || this.isAdmin();
  }

  getModuleCount(): number {
    return this.userDashboard?.userStats.totalModules || 0;
  }

  getUserModules(): string[] {
    return this.userDashboard?.userInfo.modules || [];
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  }

  goToAdmin() {
    if (this.isAdmin()) {
      this.router.navigate(['/admin']);
    }
  }

  manageUsers() {
    if (this.isAdmin()) {
      this.router.navigate(['/admin']);
    }
  }

  viewModules() {
    this.router.navigate(['/modules']);
  }

  viewProfile() {
    // TODO: Implementar vista de perfil
  }

  viewActivity() {
    // TODO: Implementar vista de actividad
  }

  viewSettings() {
    // TODO: Implementar configuración
  }
}