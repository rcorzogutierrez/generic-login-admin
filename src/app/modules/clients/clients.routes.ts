// src/app/modules/clients/clients.routes.ts

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const CLIENTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(['admin', 'user'])],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/clients-list/clients-list.component').then(
            m => m.ClientsListComponent
          ),
        title: 'Gestión de Clientes'
      },
      // Rutas específicas DEBEN ir antes de las rutas dinámicas (:id)
      {
        path: 'config',
        loadComponent: () =>
          import('./components/client-config/client-config.component').then(
            m => m.ClientConfigComponent
          ),
        // Hereda el guard del parent: roleGuard(['admin', 'user'])
        title: 'Configuración del Módulo'
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./components/client-form/client-form.component').then(
            m => m.ClientFormComponent
          ),
        title: 'Nuevo Cliente'
      },
      // Rutas dinámicas van al final
      {
        path: ':id',
        loadComponent: () =>
          import('./components/client-form/client-form.component').then(
            m => m.ClientFormComponent
          ),
        data: { mode: 'view' },
        title: 'Ver Cliente'
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./components/client-form/client-form.component').then(
            m => m.ClientFormComponent
          ),
        data: { mode: 'edit' },
        title: 'Editar Cliente'
      }
    ]
  }
];
