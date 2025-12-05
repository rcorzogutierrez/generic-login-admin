// src/app/modules/workers/workers.routes.ts

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { moduleGuard } from '../../core/guards/module.guard';

export const WORKERS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(['admin', 'user']), moduleGuard('workers')],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/workers-list/workers-list.component').then(
            m => m.WorkersListComponent
          ),
        title: 'Gestión de Trabajadores'
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./components/worker-form/worker-form.component').then(
            m => m.WorkerFormComponent
          ),
        title: 'Nuevo Trabajador'
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./components/worker-form/worker-form.component').then(
            m => m.WorkerFormComponent
          ),
        data: { mode: 'view' },
        title: 'Ver Trabajador'
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./components/worker-form/worker-form.component').then(
            m => m.WorkerFormComponent
          ),
        data: { mode: 'edit' },
        title: 'Editar Trabajador'
      }
    ]
  }
];
