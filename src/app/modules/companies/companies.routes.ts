// src/app/modules/companies/companies.routes.ts

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { moduleGuard } from '../../core/guards/module.guard';

export const COMPANIES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(['admin', 'user']), moduleGuard('companies')],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/companies-list/companies-list.component').then(
            m => m.CompaniesListComponent
          ),
        title: 'Empresas Subcontratistas'
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./components/company-form/company-form.component').then(
            m => m.CompanyFormComponent
          ),
        title: 'Nueva Empresa'
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./components/company-form/company-form.component').then(
            m => m.CompanyFormComponent
          ),
        data: { mode: 'view' },
        title: 'Ver Empresa'
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./components/company-form/company-form.component').then(
            m => m.CompanyFormComponent
          ),
        data: { mode: 'edit' },
        title: 'Editar Empresa'
      }
    ]
  }
];
