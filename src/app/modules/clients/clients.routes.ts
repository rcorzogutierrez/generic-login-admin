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
      {
        path: 'new',
        loadComponent: () =>
          import('./components/client-form/client-form.component').then(
            m => m.ClientFormComponent
          ),
        title: 'Nuevo Cliente'
      },
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
