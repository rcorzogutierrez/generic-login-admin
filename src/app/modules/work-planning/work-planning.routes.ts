// src/app/modules/work-planning/work-planning.routes.ts

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { moduleGuard } from '../../core/guards/module.guard';

export const WORK_PLANNING_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(['admin', 'user']), moduleGuard('work-planning')],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/work-plans-list/work-plans-list.component').then(
            m => m.WorkPlansListComponent
          ),
        title: 'Planificación de Trabajo'
      }
    ]
  }
];
