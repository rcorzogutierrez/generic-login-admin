// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AccessDeniedComponent } from './shared/access-denied.component';
import { AdminPanelComponent } from './admin/admin-panel.component';
import { LayoutComponent } from './core/layout/layout.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { loginGuard } from './core/guards/login.guard';

export const routes: Routes = [
  // ============================================
  // RUTAS SIN LAYOUT (Login, errores, etc.)
  // ============================================
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [loginGuard],
    title: 'Iniciar Sesión',
  },
  {
    path: 'access-denied',
    component: AccessDeniedComponent,
    title: 'Acceso Denegado',
  },

  // ============================================
  // RUTAS CON LAYOUT (Autenticadas)
  // ============================================
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
        title: 'Dashboard',
      },
      {
        path: 'modules',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      // RUTAS DE MÓDULOS DINÁMICOS
      {
        path: 'modules/clients',
        loadChildren: () =>
          import('./modules/clients/clients.routes').then(m => m.CLIENTS_ROUTES),
      },
      {
        path: 'modules/materials',
        loadChildren: () =>
          import('./modules/materials/materials.routes').then(m => m.MATERIALS_ROUTES),
      },
      {
        path: 'modules/workers',
        loadChildren: () =>
          import('./modules/workers/workers.routes').then(m => m.WORKERS_ROUTES),
      },
      {
        path: 'modules/projects',
        loadChildren: () =>
          import('./modules/projects/projects.routes').then(m => m.PROJECTS_ROUTES),
      },
      {
        path: 'modules/treasury',
        loadChildren: () =>
          import('./modules/treasury/treasury.routes').then(m => m.TREASURY_ROUTES),
      },
      {
        path: 'modules/work-planning',
        loadChildren: () =>
          import('./modules/work-planning/work-planning.routes').then(m => m.WORK_PLANNING_ROUTES),
      },

      // RUTAS DE ADMINISTRACIÓN
      {
        path: 'admin',
        canActivate: [roleGuard(['admin'])],
        children: [
          {
            path: '',
            component: AdminPanelComponent,
            title: 'Panel de Administración',
          },
          {
            path: 'logs',
            loadComponent: () =>
              import('./admin/components/admin-logs/admin-logs.component')
                .then(m => m.AdminLogsComponent),
            title: 'Logs de Auditoría',
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./admin/components/manage-users/manage-users.component')
                .then(m => m.ManageUsersComponent),
            title: 'Gestión de Usuarios',
          },
          {
            path: 'config',
            loadComponent: () =>
              import('./admin/components/system-config/system-config.component')
                .then(m => m.SystemConfigComponent),
            title: 'Configuración del Sistema',
          },
          {
            path: 'modules',
            loadComponent: () =>
              import('./admin/components/manage-modules/manage-modules.component')
                .then(m => m.ManageModulesComponent),
            title: 'Gestión de Módulos',
          },
          {
            path: 'roles',
            loadComponent: () =>
              import('./admin/components/manage-roles/manage-roles.component')
                .then(m => m.ManageRolesComponent),
            title: 'Gestión de Roles',
          },
          {
            path: 'business',
            loadComponent: () =>
              import('./admin/components/business-info/business-info.component')
                .then(m => m.BusinessInfoComponent),
            title: 'Mi Empresa',
          },
        ],
      },
    ],
  },

  // Wildcard - redirige al dashboard
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
