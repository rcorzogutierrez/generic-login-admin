import { Component, OnInit, signal } from '@angular/core';
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

  // Nombre de la aplicación (configuración del sistema)
  appName = this.appConfigService.appName;

  // Logo de la aplicación
  logoUrl = this.appConfigService.logoUrl;
  logoBackgroundColor = this.appConfigService.logoBackgroundColor;

  // Módulos asignados al usuario
  userModules = signal<string[]>([]);

  constructor(
    public authService: AuthService,
    private appConfigService: AppConfigService,
    private adminService: AdminService,
    private modulesService: ModulesService,
    private router: Router
  ) {}

  async ngOnInit() {
    // ✅ Inicializar configuración de la aplicación
    await this.appConfigService.initialize();

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

      // Inicializar servicio de módulos
      await this.modulesService.initialize();

      // Si es admin, agregar módulos faltantes automáticamente
      if (currentUser.role === 'admin') {
        // Agregar módulos faltantes sin borrar los existentes
        await this.modulesService.addMissingModules(currentUser.uid);

        // Los admins ven todos los módulos disponibles
        const allModules = this.modulesService.getActiveModules().map(m => m.value);
        console.log('📋 [DEBUG] Módulos activos desde Firestore:', allModules);
        console.log('📋 [DEBUG] ¿Incluye work-planning?', allModules.includes('work-planning'));
        this.userModules.set(allModules);

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

      } else {

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
    const isAdminUser = this.isAdmin();
    const hasInModules = this.userModules().includes(moduleName);

    // Debug para work-planning
    if (moduleName === 'work-planning') {
      console.log('🔍 [DEBUG hasModule] work-planning:', {
        moduleName,
        isAdminUser,
        userModules: this.userModules(),
        hasInModules,
        willShow: isAdminUser || hasInModules
      });
    }

    // Los admins ven todos los módulos
    if (isAdminUser) {
      return true;
    }
    // Usuarios normales solo ven módulos asignados
    return hasInModules;
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
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  }
}