import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { moduleGuard } from '../../core/guards/module.guard';

export const TREASURY_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(['admin', 'user']), moduleGuard('treasury')],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/treasury-dashboard/treasury-dashboard.component')
            .then(m => m.TreasuryDashboardComponent),
        title: 'Tesorería'
      },
      {
        path: 'cobros',
        loadComponent: () =>
          import('./components/cobros-list/cobros-list.component')
            .then(m => m.CobrosListComponent),
        title: 'Cobros'
      },
      {
        path: 'pagos',
        loadComponent: () =>
          import('./components/pagos-list/pagos-list.component')
            .then(m => m.PagosListComponent),
        title: 'Pagos'
      }
    ]
  }
];
