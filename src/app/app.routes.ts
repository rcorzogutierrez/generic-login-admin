// src/app/app.routes.ts - VERSIÓN FINAL
import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AccessDeniedComponent } from './shared/access-denied.component';
import { AdminPanelComponent } from './admin/admin-panel.component';
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
    path: 'admin',
    component: AdminPanelComponent,
    canActivate: [roleGuard(['admin'])],
    title: 'Panel de Administración',
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