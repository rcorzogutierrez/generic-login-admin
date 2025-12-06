// src/app/core/layout/header/header.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';

import { SidebarService } from '../services/sidebar.service';
import { AuthService } from '../../services/auth.service';
import { AppConfigService } from '../../services/app-config.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    MatBadgeModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  // Servicios
  public sidebarService = inject(SidebarService);
  public authService = inject(AuthService);
  private appConfigService = inject(AppConfigService);
  private router = inject(Router);

  // Estado del usuario
  user = this.authService.authorizedUser;

  // Configuración de la app
  appName = this.appConfigService.appName;

  // Notificaciones (placeholder para futuro)
  notifications = signal<number>(0);

  /**
   * Toggle del sidebar (para móvil)
   */
  toggleSidebar() {
    this.sidebarService.toggle();
  }

  /**
   * Obtener iniciales del usuario
   */
  getUserInitials(): string {
    const name = this.user()?.displayName || this.user()?.email || '';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  /**
   * Obtener rol del usuario formateado
   */
  getUserRole(): string {
    return this.user()?.role?.toUpperCase() || 'USER';
  }

  /**
   * Obtener color del avatar basado en email
   */
  getAvatarColor(): string {
    const email = this.user()?.email || '';
    const colors = [
      'linear-gradient(135deg, #3b82f6, #2563eb)',
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #ef4444, #dc2626)',
      'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'linear-gradient(135deg, #06b6d4, #0891b2)',
      'linear-gradient(135deg, #ec4899, #db2777)'
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Verifica si es admin
   */
  isAdmin(): boolean {
    return this.user()?.role === 'admin';
  }

  /**
   * Navegar a dashboard
   */
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Navegar a admin
   */
  goToAdmin() {
    if (this.isAdmin()) {
      this.router.navigate(['/admin']);
    }
  }

  /**
   * Navegar a perfil
   */
  goToProfile() {
    this.router.navigate(['/profile']);
  }

  /**
   * Navegar a configuración
   */
  goToSettings() {
    this.router.navigate(['/settings']);
  }

  /**
   * Cerrar sesión
   */
  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  }
}
