// src/app/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

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
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  user = this.authService.authorizedUser;
  appInfo = this.authService.getAppInfo();

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    console.log('📊 Dashboard cargado para usuario:', this.user()?.email);
  }

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
      return 'No disponible';
    }
  }

 
  getPermissionIcon(permission: string): string {
    switch (permission) {
      case 'read': return 'visibility';
      case 'write': return 'edit';
      case 'delete': return 'delete';
      case 'manage_users': return 'group';
      default: return 'verified';
    }
  }

  async logout() {
    try {
      await this.authService.logout();
      console.log('👋 Sesión cerrada desde dashboard');
    } catch (error) {
      console.error('💥 Error cerrando sesión:', error);
    }
  }

  goToAdmin() {
    if (this.authService.hasPermission('manage_users')) {
      this.router.navigate(['/admin']);
    } else {
      console.warn('🚫 Sin permisos de administrador');
    }
  }

  manageUsers() {
    console.log('👥 Gestionar usuarios...');
    // Implementar navegación a gestión de usuarios
  }

  viewProfile() {
    console.log('👤 Ver perfil...');
    // Implementar vista de perfil
  }

  viewActivity() {
    console.log('📈 Ver actividad...');
    // Implementar vista de actividad
  }

  viewSettings() {
    console.log('⚙️ Configuración...');
    // Implementar configuración
  }
}
