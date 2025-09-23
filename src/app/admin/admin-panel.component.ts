// src/app/admin/admin-panel.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatChipsModule,
    MatMenuModule,
    MatBadgeModule,
  ],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css'],
})
export class AdminPanelComponent implements OnInit {
  currentUser = this.authService.authorizedUser;

  // Mock data para demonstration
  totalUsers = 15;
  activeUsers = 12;
  totalProjects = 3;
  adminUsers = 2;

  displayedColumns: string[] = [
    'email',
    'role',
    'status',
    'lastLogin',
    'actions',
  ];

  // Agregar estos métodos a tu admin-panel.component.ts

  trackByEmail(index: number, user: any): string {
    return user.email;
  }

  getUserIcon(role: string): string {
    switch (role) {
      case 'admin': return 'shield';
      case 'user': return 'person';
      case 'viewer': return 'visibility';
      default: return 'person';
    }
  }

  mockUsers = [
    {
      email: 'rcorzogutierrez@gmail.com',
      role: 'admin',
      isActive: true,
      lastLogin: new Date(),
    },
    {
      email: 'usuario@example.com',
      role: 'user',
      isActive: true,
      lastLogin: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    },
    {
      email: 'viewer@example.com',
      role: 'viewer',
      isActive: false,
      lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    },
  ];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    console.log('🔧 Panel Admin cargado para:', this.currentUser()?.email);
  }

  getRoleColor(role: string): string {
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

  formatDate(date: Date): string {
    if (!date) return 'Nunca';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Hace pocos minutos';
    } else if (diffHours < 24) {
      return `Hace ${diffHours} horas`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  async logout() {
    await this.authService.logout();
  }

  // Admin Actions
  addUser() {
    console.log('➕ Agregar nuevo usuario...');
    // Implementar modal o navegación
  }

  manageRoles() {
    console.log('👥 Gestionar roles...');
    // Implementar gestión de roles
  }

  viewLogs() {
    console.log('📋 Ver logs del sistema...');
    // Implementar vista de logs
  }

  systemSettings() {
    console.log('⚙️ Configuración del sistema...');
    // Implementar configuración
  }

  editUser(user: any) {
    console.log('✏️ Editar usuario:', user.email);
    // Implementar edición de usuario
  }

  toggleUserStatus(user: any) {
    console.log('🔄 Cambiar estado usuario:', user.email);
    user.isActive = !user.isActive;
    // Implementar cambio de estado en Firebase
  }
}
