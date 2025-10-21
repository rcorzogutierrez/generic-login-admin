// src/app/app.routes.ts - AGREGAR RUTA DE GESTIÓN DE MÓDULOS
import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AccessDeniedComponent } from './shared/access-denied.component';
import { AdminPanelComponent } from './admin/admin-panel.component';
import { UserModulesComponent } from './modules/user-modules/user-modules.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { loginGuard } from './core/guards/login.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },

  {
    path: 'login',
    component: LoginComponent,
    canActivate: [loginGuard],
    title: 'Iniciar Sesión',
  },

  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    title: 'Dashboard',
  },
  {
    path: 'modules',
    component: UserModulesComponent,
    canActivate: [authGuard],
    title: 'Mis Módulos'
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
        path: 'config',
        loadComponent: () =>
          import('./admin/components/system-config/system-config.component')
            .then(m => m.SystemConfigComponent),
        title: 'Configuración del Sistema',
      },
      // ✅ NUEVA RUTA: Gestión de Módulos
      {
        path: 'modules',
        loadComponent: () =>
          import('./admin/components/manage-modules/manage-modules.component')
            .then(m => m.ManageModulesComponent),
        title: 'Gestión de Módulos',
      },
    ],
  },

  {
    path: 'access-denied',
    component: AccessDeniedComponent,
    title: 'Acceso Denegado',
  },

  {
    path: '**',
    redirectTo: '/dashboard',
  },
];