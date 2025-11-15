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
import { BusinessInfoService } from '../../admin/services/business-info.service';
import { AdminService } from '../../admin/services/admin.service';
import { ModulesService } from '../../admin/services/modules.service';

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
export class NavbarComponent implements OnInit {
  user = this.authService.authorizedUser;
  appInfo = this.authService.getAppInfo();

  // Información de la empresa (nombre comercial)
  businessInfo = this.businessInfoService.businessInfo;

  // Logo de la aplicación
  logoUrl = this.appConfigService.logoUrl;
  logoBackgroundColor = this.appConfigService.logoBackgroundColor;

  // Módulos asignados al usuario
  userModules = signal<string[]>([]);

  constructor(
    public authService: AuthService,
    private appConfigService: AppConfigService,
    private businessInfoService: BusinessInfoService,
    private adminService: AdminService,
    private modulesService: ModulesService,
    private router: Router
  ) {}

  async ngOnInit() {
    // ✅ Inicializar configuración de la app y de la empresa en paralelo
    await Promise.all([
      this.appConfigService.initialize(),
      this.businessInfoService.getBusinessInfo()
    ]);

    console.log('🔍 NavbarComponent - Valores actuales:', {
      businessName: this.businessInfo()?.businessName,
      logoUrl: this.logoUrl()
    });
    console.log('🧭 Navbar cargado para:', this.user()?.email);

    // Cargar módulos del usuario
    await this.loadUserModules();
  }

  /**
   * Carga los módulos asignados al usuario
   */
  async loadUserModules() {
    try {
      const currentUser = this.user();
      if (!currentUser?.email) return;

      // Si es admin, tiene acceso a todos los módulos automáticamente
      if (currentUser.role === 'admin') {
        // Los admins ven todos los módulos disponibles
        await this.modulesService.initialize();
        const allModules = this.modulesService.getActiveModules().map(m => m.value);
        this.userModules.set(allModules);
        console.log('📦 Admin - Todos los módulos cargados para navbar:', allModules);
        return;
      }

      // Para usuarios normales, cargar módulos asignados con datos frescos
      // IMPORTANTE: Usar forceRefresh para obtener permisos actualizados
      await this.adminService.initialize(true);
      await this.modulesService.initialize();

      // Obtener datos del usuario
      const users = this.adminService.users();
      const currentUserData = users.find(u => u.email === currentUser.email);

      if (currentUserData?.modules) {
        this.userModules.set(currentUserData.modules);
        console.log('📦 Módulos cargados para navbar:', currentUserData.modules);
      } else {
        console.warn('⚠️ Usuario sin módulos asignados');
        this.userModules.set([]);
      }
    } catch (error) {
      console.error('❌ Error cargando módulos del usuario:', error);
    }
  }

  /**
   * Verifica si el usuario tiene un módulo específico asignado
   * Los admins tienen acceso a todos los módulos automáticamente
   */
  hasModule(moduleName: string): boolean {
    // Los admins ven todos los módulos
    if (this.isAdmin()) {
      return true;
    }
    // Usuarios normales solo ven módulos asignados
    return this.userModules().includes(moduleName);
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

  /**
   * Obtiene el nombre a mostrar en el navbar
   * Prioridad: Nombre de la empresa > Nombre por defecto
   */
  getDisplayName(): string {
    return this.businessInfo()?.businessName || 'Mi Empresa';
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  }
}