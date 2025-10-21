// src/app/modules/user-modules/user-modules.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../core/services/auth.service';
import { ModulesService } from '../../admin/services/modules.service';
import { AdminService } from '../../admin/services/admin.service';
import { SystemModule } from '../../admin/models/system-module.interface';

@Component({
  selector: 'app-user-modules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './user-modules.component.html',
  styleUrls: ['./user-modules.component.css']
})
export class UserModulesComponent implements OnInit {
  currentUser = this.authService.authorizedUser;
  userModules: SystemModule[] = [];
  filteredModules: SystemModule[] = [];
  isLoading = false;
  searchTerm = '';
  viewMode: 'grid' | 'list' = 'grid';

  // Mapeo de rutas de módulos predefinidas
  private readonly MODULE_ROUTES: Record<string, string> = {
    'dashboard': '/dashboard',
    'user-management': '/admin',
    'analytics': '/analytics',
    'settings': '/admin/config',
    'notifications': '/notifications',
    'audit-logs': '/admin/logs',
    'profile': '/profile',
    'reports': '/reports',
    'inventory': '/inventory',
    'sales': '/sales',
    'hr': '/hr',
    'finance': '/finance'
  };

  constructor(
    private authService: AuthService,
    private modulesService: ModulesService,
    private adminService: AdminService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    await this.loadUserModules();
  }

  /**
   * Carga los módulos asignados al usuario
   */
  async loadUserModules() {
    this.isLoading = true;

    try {
      // Obtener email del usuario actual
      const userEmail = this.currentUser()?.email;
      if (!userEmail) {
        this.snackBar.open('No se pudo identificar al usuario', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/dashboard']);
        return;
      }

      // Cargar todos los usuarios para encontrar el actual
      await this.adminService.loadUsers();
      const users = this.adminService.users();
      const currentUserData = users.find(u => u.email === userEmail);

      if (!currentUserData) {
        this.snackBar.open('No se encontró información del usuario', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/dashboard']);
        return;
      }

      // Cargar todos los módulos del sistema
      await this.modulesService.loadModules();
      const allModules = this.modulesService.modules();

      // Filtrar solo los módulos asignados al usuario
      const userModuleValues = currentUserData.modules || [];
      this.userModules = allModules.filter(module => 
        userModuleValues.includes(module.value) && module.isActive
      );

      // Ordenar por orden
      this.userModules.sort((a, b) => a.order - b.order);

      // Inicializar módulos filtrados
      this.filteredModules = [...this.userModules];

      console.log(`📊 ${this.userModules.length} módulos cargados para ${userEmail}`);

    } catch (error) {
      console.error('Error cargando módulos:', error);
      this.snackBar.open('Error al cargar tus módulos', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Navega a un módulo específico
   */
  navigateToModule(module: SystemModule) {
    if (!module.isActive) {
      this.snackBar.open('Este módulo está temporalmente deshabilitado', 'Cerrar', { 
        duration: 3000 
      });
      return;
    }

    // Primero intentar con la ruta definida en el módulo
    if (module.route) {
      this.router.navigate([module.route]);
      return;
    }

    // Si no tiene ruta, intentar con el mapeo predefinido
    const mappedRoute = this.MODULE_ROUTES[module.value];
    if (mappedRoute) {
      this.router.navigate([mappedRoute]);
      return;
    }

    // Si no hay ruta disponible, mostrar mensaje
    this.snackBar.open(
      `El módulo "${module.label}" no tiene una ruta definida. Contacta al administrador.`, 
      'Cerrar', 
      { duration: 4000 }
    );
  }

  /**
   * Filtra módulos según el término de búsqueda
   */
  filterModules() {
    if (!this.searchTerm.trim()) {
      this.filteredModules = [...this.userModules];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredModules = this.userModules.filter(module =>
      module.label.toLowerCase().includes(term) ||
      module.description.toLowerCase().includes(term) ||
      module.value.toLowerCase().includes(term)
    );
  }

  /**
   * Limpia la búsqueda
   */
  clearSearch() {
    this.searchTerm = '';
    this.filterModules();
  }

  /**
   * Cambia el modo de vista
   */
  setViewMode(mode: 'grid' | 'list') {
    this.viewMode = mode;
  }

  /**
   * Refresca los módulos
   */
  async refreshModules() {
    await this.loadUserModules();
    this.snackBar.open('Módulos actualizados', '', { duration: 2000 });
  }

  /**
   * Obtiene el conteo de módulos
   */
  getModulesCount(): number {
    return this.userModules.length;
  }

  /**
   * Vuelve atrás
   */
  goBack() {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Va al dashboard
   */
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}