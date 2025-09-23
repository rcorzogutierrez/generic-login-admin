// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService, ProjectConfig } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Loading Global -->
      <div *ngIf="authService.loading()" 
           class="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Cargando aplicación...</p>
        </div>
      </div>

      <!-- Router Outlet -->
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [
    `
    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
  ],
})
export class AppComponent implements OnInit {
  title = 'Generic Admin Login System';

  constructor(public authService: AuthService) {}

  ngOnInit() {
    console.log('🚀 App iniciada correctamente');

    // Configurar proyecto específico basado en la URL o configuración
    const currentProject = this.getCurrentProjectConfig();
    if (currentProject) {
      this.authService.setCurrentProject(currentProject);
    }
  }

  private getCurrentProjectConfig(): ProjectConfig | null {
    // Determinar el proyecto de diferentes maneras:

    // 1. Por subdomain
    const hostname = window.location.hostname;
    if (hostname.includes('crm.')) {
      return {
        projectId: 'crm-system',
        name: 'CRM Corporativo',
        description: 'Sistema de gestión de clientes',
        allowedRoles: ['admin', 'user'],
        redirectUrl: '/crm',
      };
    } else if (hostname.includes('admin.')) {
      return {
        projectId: 'admin-panel',
        name: 'Panel Administrativo',
        description: 'Gestión completa del sistema',
        allowedRoles: ['admin'],
        redirectUrl: '/admin',
      };
    }

    // 2. Por parámetro de URL
    const urlParams = new URLSearchParams(window.location.search);
    const projectParam = urlParams.get('project');

    if (projectParam === 'inventory') {
      return {
        projectId: 'inventory-system',
        name: 'Sistema de Inventario',
        description: 'Control de productos y stock',
        allowedRoles: ['admin', 'user'],
        redirectUrl: '/inventory',
      };
    }

    // 3. Por path de la URL
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/crm')) {
      return {
        projectId: 'crm-system',
        name: 'CRM Corporativo',
        description: 'Sistema de gestión de clientes',
        allowedRoles: ['admin', 'user'],
        redirectUrl: '/crm',
      };
    }

    // 4. Configuración por defecto (Generic Admin)
    return {
      projectId: 'generic-admin',
      name: 'Generic Admin Login',
      description: 'Sistema de login reutilizable para múltiples proyectos',
      allowedRoles: ['admin', 'user', 'viewer'],
      redirectUrl: '/dashboard',
    };
  }
}
