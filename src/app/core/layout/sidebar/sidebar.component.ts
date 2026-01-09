// src/app/core/layout/sidebar/sidebar.component.ts
import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { filter } from 'rxjs/operators';

import { SidebarService } from '../services/sidebar.service';
import { AuthService } from '../../services/auth.service';
import { AppConfigService } from '../../services/app-config.service';
import { AdminService } from '../../../admin/services/admin.service';
import { ModulesService } from '../../../admin/services/modules.service';
import { NavGroup, NavItem, NavigationConfig } from '../models/nav-item.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTooltipModule,
    MatRippleModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  // Servicios
  public sidebarService = inject(SidebarService);
  private authService = inject(AuthService);
  private appConfigService = inject(AppConfigService);
  private adminService = inject(AdminService);
  private modulesService = inject(ModulesService);
  private router = inject(Router);

  // Estado del usuario
  user = this.authService.authorizedUser;

  // Configuración de la app
  appName = this.appConfigService.appName;
  logoUrl = this.appConfigService.logoUrl;
  logoBackgroundColor = this.appConfigService.logoBackgroundColor;

  // Módulos del usuario
  userModules = signal<string[]>([]);

  // Ruta activa actual
  activeRoute = signal<string>('');

  // Items expandidos (para submenús)
  expandedItems = signal<Set<string>>(new Set());

  /**
   * Genera la configuración de navegación dinámicamente desde Firestore
   * Combina grupos estáticos (main, admin) con módulos dinámicos
   */
  private dynamicNavigation = computed<NavigationConfig>(() => {
    const systemModules = this.modulesService.modules();

    // Convertir SystemModule[] a NavItem[]
    const moduleNavItems: NavItem[] = systemModules
      .filter(m => m.isActive)
      .sort((a, b) => a.order - b.order)
      .map(m => ({
        id: m.value,
        label: m.label,
        icon: m.icon,
        route: m.route || `/modules/${m.value}`,
        module: m.value,
        tooltip: m.description
      }));

    return {
      groups: [
        // GRUPO PRINCIPAL (estático)
        {
          id: 'main',
          title: 'Principal',
          items: [
            {
              id: 'dashboard',
              label: 'Dashboard',
              icon: 'dashboard',
              route: '/dashboard',
              tooltip: 'Panel principal'
            }
          ]
        },
        // GRUPO MÓDULOS (dinámico desde Firestore)
        {
          id: 'modules',
          title: 'Módulos',
          items: moduleNavItems
        },
        // GRUPO ADMINISTRACIÓN (estático, solo admins)
        {
          id: 'admin',
          title: 'Administración',
          adminOnly: true,
          items: [
            {
              id: 'admin-panel',
              label: 'Panel Admin',
              icon: 'admin_panel_settings',
              route: '/admin',
              adminOnly: true,
              tooltip: 'Panel de administración'
            },
            {
              id: 'admin-users',
              label: 'Usuarios',
              icon: 'people',
              route: '/admin/users',
              adminOnly: true,
              tooltip: 'Gestión de usuarios'
            },
            {
              id: 'admin-roles',
              label: 'Roles',
              icon: 'security',
              route: '/admin/roles',
              adminOnly: true,
              tooltip: 'Gestión de roles'
            },
            {
              id: 'admin-modules',
              label: 'Módulos',
              icon: 'extension',
              route: '/admin/modules',
              adminOnly: true,
              tooltip: 'Configurar módulos'
            },
            {
              id: 'admin-config',
              label: 'Configuración',
              icon: 'settings',
              route: '/admin/config',
              adminOnly: true,
              tooltip: 'Configuración del sistema'
            },
            {
              id: 'admin-logs',
              label: 'Logs',
              icon: 'history',
              route: '/admin/logs',
              adminOnly: true,
              tooltip: 'Registros del sistema'
            },
            {
              id: 'admin-business',
              label: 'Empresa',
              icon: 'business',
              route: '/admin/business',
              adminOnly: true,
              tooltip: 'Información de la empresa'
            }
          ]
        }
      ]
    };
  });

  // Navegación filtrada según permisos del usuario
  filteredNavigation = computed(() => {
    const isAdmin = this.isAdmin();
    const modules = this.userModules();
    const navigation = this.dynamicNavigation();

    return navigation.groups
      .filter(group => {
        // Filtrar grupos solo-admin
        if (group.adminOnly && !isAdmin) return false;
        return true;
      })
      .map(group => ({
        ...group,
        items: group.items.filter(item => this.canShowItem(item, isAdmin, modules))
      }))
      .filter(group => group.items.length > 0); // Solo grupos con items visibles
  });

  ngOnInit() {
    // Cargar módulos del usuario
    this.loadUserModules();

    // Escuchar cambios de ruta
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.activeRoute.set(event.urlAfterRedirects);
        // Cerrar sidebar móvil al navegar
        if (this.sidebarService.isMobile()) {
          this.sidebarService.closeMobile();
        }
      });

    // Establecer ruta inicial
    this.activeRoute.set(this.router.url);
  }

  /**
   * Atajos de teclado
   */
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent) {
    // Ctrl+B para toggle sidebar
    if (event.ctrlKey && event.key === 'b') {
      event.preventDefault();
      this.sidebarService.toggle();
    }
    // Escape para cerrar en móvil
    if (event.key === 'Escape' && this.sidebarService.isMobileOpen()) {
      this.sidebarService.closeMobile();
    }
  }

  /**
   * Cargar módulos del usuario
   */
  async loadUserModules() {
    try {
      const currentUser = this.user();
      if (!currentUser?.email) return;

      if (currentUser.role === 'admin') {
        await this.modulesService.initialize();
        const allModules = this.modulesService.getActiveModules().map(m => m.value);
        this.userModules.set(allModules);
        return;
      }

      await this.adminService.initialize(true);
      await this.modulesService.initialize();

      const users = this.adminService.users();
      const currentUserData = users.find(u => u.email === currentUser.email);

      if (currentUserData?.modules) {
        this.userModules.set(currentUserData.modules);
      }
    } catch (error) {
      console.error('Error cargando módulos:', error);
    }
  }

  /**
   * Verifica si un item debe mostrarse según permisos
   */
  private canShowItem(item: NavItem, isAdmin: boolean, modules: string[]): boolean {
    // Items solo-admin
    if (item.adminOnly && !isAdmin) return false;

    // Items que requieren un módulo específico
    if (item.module) {
      if (isAdmin) return true; // Admins ven todo
      return modules.includes(item.module);
    }

    return true;
  }

  /**
   * Verifica si el usuario es admin
   */
  isAdmin(): boolean {
    return this.user()?.role === 'admin';
  }

  /**
   * Verifica si una ruta está activa
   */
  isActive(route: string | undefined): boolean {
    if (!route) return false;
    const currentRoute = this.activeRoute();
    // Coincidencia exacta o inicio de ruta
    return currentRoute === route || currentRoute.startsWith(route + '/');
  }

  /**
   * Verifica si un item tiene hijos expandidos
   */
  isExpanded(itemId: string): boolean {
    return this.expandedItems().has(itemId);
  }

  /**
   * Toggle de expansión de submenú
   */
  toggleExpand(itemId: string) {
    const expanded = new Set(this.expandedItems());
    if (expanded.has(itemId)) {
      expanded.delete(itemId);
    } else {
      expanded.add(itemId);
    }
    this.expandedItems.set(expanded);
  }

  /**
   * Navegar a una ruta
   */
  navigateTo(item: NavItem) {
    if (item.disabled) return;

    if (item.children && item.children.length > 0) {
      // Si tiene hijos, toggle expansión
      this.toggleExpand(item.id);
    } else if (item.route) {
      // Navegar a la ruta
      this.router.navigate([item.route]);
    }
  }

  /**
   * Obtener tooltip para modo colapsado
   */
  getTooltip(item: NavItem): string {
    if (!this.sidebarService.isCollapsed()) return '';
    return item.tooltip || item.label;
  }

  /**
   * Toggle del sidebar
   */
  toggleSidebar() {
    this.sidebarService.toggle();
  }

  /**
   * Cerrar overlay en móvil
   */
  closeOverlay() {
    this.sidebarService.closeMobile();
  }

  /**
   * Navegar al dashboard
   */
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Trackby para ngFor
   */
  trackByGroup(index: number, group: NavGroup): string {
    return group.id;
  }

  trackByItem(index: number, item: NavItem): string {
    return item.id;
  }
}
