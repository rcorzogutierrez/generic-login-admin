import { Component, OnInit, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';
import { AppConfigService } from '../../core/services/app-config.service';

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
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  user = this.authService.authorizedUser;
  appInfo = this.authService.getAppInfo();
  appName: Signal<string | null> = this.appConfigService.appName; // Tipo explícito
  logoUrl = this.appConfigService.logoUrl;
  logoBackgroundColor = this.appConfigService.logoBackgroundColor;

  constructor(
    public authService: AuthService,
    private appConfigService: AppConfigService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('🔍 NavbarComponent - Valores actuales:', {
      appName: this.appName(),
      logoUrl: this.logoUrl()
    });
    console.log('🧭 Navbar cargado para:', this.user()?.email);
  }

  getUserInitials(): string {
    const name = this.user()?.displayName || this.user()?.email || '';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getUserRole(): string {
    return this.user()?.role?.toUpperCase() || 'USER';
  }

  getRoleLabel(role?: string): string {
    if (!role) return 'Usuario';
    const labels: Record<string, string> = {
      admin: 'Administrador',
      user: 'Usuario',
      viewer: 'Visualizador'
    };
    return labels[role.toLowerCase()] || role;
  }

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

  isAdmin(): boolean {
    return this.user()?.role === 'admin';
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  goToAdmin() {
    if (this.isAdmin()) {
      this.router.navigate(['/admin']);
    }
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  goToSettings() {
    this.router.navigate(['/settings']);
    // Ejemplo: Simular configuración del nombre
    // this.appConfigService.setAppName('Nombre Personalizado');
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  }
}