// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AccessDeniedComponent } from './shared/access-denied.component';
import { AdminPanelComponent } from './admin/admin-panel.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Ruta raíz - redirige a login
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },

  // Ruta de login - acceso público
  {
    path: 'login',
    component: LoginComponent,
    title: 'Iniciar Sesión',
  },

  // Dashboard - requiere autenticación
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    title: 'Dashboard',
  },

  // Panel de administración - solo admins
  {
    path: 'admin',
    component: AdminPanelComponent,
    canActivate: [roleGuard(['admin'])],
    title: 'Panel de Administración',
  },

  // Acceso denegado
  {
    path: 'access-denied',
    component: AccessDeniedComponent,
    title: 'Acceso Denegado',
  },

  // Ruta comodín - cualquier ruta no encontrada va a login
  {
    path: '**',
    redirectTo: '/login',
  },
];
