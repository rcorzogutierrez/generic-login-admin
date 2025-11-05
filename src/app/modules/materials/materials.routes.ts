// src/app/modules/materials/materials.routes.ts

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const MATERIALS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(['admin', 'user'])],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/materials-list/materials-list.component').then(
            m => m.MaterialsListComponent
          ),
        title: 'Gestión de Materiales'
      },
      // Rutas específicas DEBEN ir antes de las rutas dinámicas (:id)
      {
        path: 'config',
        loadComponent: () =>
          import('../clients/components/client-config/client-config.component').then(
            m => m.ClientConfigComponent
          ),
        canActivate: [roleGuard(['admin'])],
        title: 'Configuración de Materiales'
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./components/material-form/material-form.component').then(
            m => m.MaterialFormComponent
          ),
        title: 'Nuevo Material'
      },
      // Rutas dinámicas van al final
      {
        path: ':id',
        loadComponent: () =>
          import('./components/material-form/material-form.component').then(
            m => m.MaterialFormComponent
          ),
        data: { mode: 'view' },
        title: 'Ver Material'
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./components/material-form/material-form.component').then(
            m => m.MaterialFormComponent
          ),
        data: { mode: 'edit' },
        title: 'Editar Material'
      }
    ]
  }
];
