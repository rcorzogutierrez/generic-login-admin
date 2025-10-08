// src/app/shared/navbar/navbar.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
// src/app/shared/navbar/navbar.component.ts

export class NavbarComponent implements OnInit {
    user = this.authService.authorizedUser;
    appInfo = this.authService.getAppInfo();
  
    constructor(
      public authService: AuthService,
      private router: Router
    ) {}
  
    ngOnInit() {
      console.log('🧭 Navbar cargado para:', this.user()?.email);
    }
  
    /**
     * Obtiene iniciales del usuario
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
     * ✅ NUEVO: Obtiene el rol del usuario en mayúsculas
     */
    getUserRole(): string {
      return this.user()?.role?.toUpperCase() || 'USER';
    }
  
    /**
     * ✅ NUEVO: Obtiene el label del rol
     */
    getRoleLabel(role?: string): string {
      if (!role) return 'Usuario';
      
      const labels: Record<string, string> = {
        'admin': 'Administrador',
        'user': 'Usuario',
        'viewer': 'Visualizador'
      };
      
      return labels[role] || role;
    }
  
    /**
     * Obtiene color del avatar basado en el email
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
     * Verifica si el usuario es admin
     */
    isAdmin(): boolean {
      return this.user()?.role === 'admin';
    }
  
    /**
     * Navega al dashboard
     */
    goToDashboard() {
      this.router.navigate(['/dashboard']);
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
     * Navega al perfil
     */
    goToProfile() {
      this.router.navigate(['/profile']);
    }
  
    /**
     * Navega a configuración
     */
    goToSettings() {
      this.router.navigate(['/settings']);
    }
  
    /**
     * Cierra sesión
     */
    async logout() {
      try {
        await this.authService.logout();
      } catch (error) {
        console.error('Error cerrando sesión:', error);
      }
    }
  }