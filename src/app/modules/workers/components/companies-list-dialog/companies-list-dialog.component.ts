import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

import { CompaniesService } from '../../companies/services/companies.service';
import { Company } from '../../companies/models';
import { WorkersService } from '../../services/workers.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CreateCompanyDialogComponent } from '../create-company-dialog/create-company-dialog.component';
import { EditCompanyDialogComponent } from '../edit-company-dialog/edit-company-dialog.component';

@Component({
  selector: 'app-companies-list-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <div class="dialog-container">
      <!-- Header -->
      <div class="dialog-header">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <mat-icon class="text-white !text-2xl">business</mat-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-800 m-0">Empresas Subcontratistas</h2>
            <p class="text-sm text-slate-500 m-0">{{ companies().length }} empresa(s) registrada(s)</p>
          </div>
        </div>
        <button mat-icon-button (click)="close()" class="!text-slate-400">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Search -->
      <div class="px-6 py-3 border-b border-slate-200 bg-slate-50">
        <div class="flex items-center gap-3">
          <mat-icon class="text-slate-400">search</mat-icon>
          <input
            type="text"
            [(ngModel)]="searchTerm"
            placeholder="Buscar por nombre, Tax ID, email..."
            class="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none">
          @if (searchTerm) {
            <button mat-icon-button (click)="searchTerm = ''" matTooltip="Limpiar">
              <mat-icon>close</mat-icon>
            </button>
          }
          <button
            mat-raised-button
            color="primary"
            (click)="createCompany()"
            class="!bg-purple-600">
            <mat-icon>add</mat-icon>
            Nueva
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        @if (isLoading()) {
          <div class="flex flex-col items-center justify-center py-12">
            <div class="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-sm text-slate-500 mt-3">Cargando empresas...</p>
          </div>
        } @else if (filteredCompanies().length === 0) {
          <div class="empty-state py-12">
            <mat-icon class="!text-6xl text-slate-300 mb-4">business</mat-icon>
            <h3 class="text-lg font-semibold text-slate-700 mb-2">
              {{ searchTerm ? 'No se encontraron empresas' : 'No hay empresas registradas' }}
            </h3>
            <p class="text-sm text-slate-500 mb-6">
              {{ searchTerm ? 'Intenta con otra búsqueda' : 'Comienza agregando tu primera empresa subcontratista' }}
            </p>
            @if (!searchTerm) {
              <button
                mat-raised-button
                color="primary"
                (click)="createCompany()"
                class="!bg-purple-600">
                <mat-icon>add_business</mat-icon>
                Crear Primera Empresa
              </button>
            }
          </div>
        } @else {
          <div class="companies-list">
            @for (company of filteredCompanies(); track company.id) {
              <div class="company-card" [class.inactive]="!company.isActive">
                <div class="flex items-start gap-4">
                  <div class="company-avatar">
                    {{ (company.legalName || 'E').charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="font-semibold text-slate-800 truncate">{{ company.legalName }}</p>
                      @if (!company.isActive) {
                        <span class="badge-inactive">Inactiva</span>
                      }
                    </div>
                    <p class="text-sm text-slate-500 font-mono">{{ company.taxId }}</p>
                    <div class="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      @if (company.email) {
                        <span class="flex items-center gap-1">
                          <mat-icon class="!text-sm">email</mat-icon>
                          {{ company.email }}
                        </span>
                      }
                      @if (company.phone) {
                        <span class="flex items-center gap-1">
                          <mat-icon class="!text-sm">phone</mat-icon>
                          {{ company.phone }}
                        </span>
                      }
                    </div>
                    <div class="mt-2">
                      <span class="text-xs text-purple-600 font-medium">
                        {{ getWorkerCount(company.id) }} trabajador(es)
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1">
                    <button
                      mat-icon-button
                      [matMenuTriggerFor]="companyMenu"
                      matTooltip="Opciones"
                      class="!text-slate-400">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #companyMenu="matMenu">
                      <button mat-menu-item (click)="editCompany(company)">
                        <mat-icon>edit</mat-icon>
                        <span>Editar</span>
                      </button>
                      <button mat-menu-item (click)="viewWorkers(company)">
                        <mat-icon>groups</mat-icon>
                        <span>Ver Trabajadores</span>
                      </button>
                      <button mat-menu-item (click)="addWorkerToCompany(company)">
                        <mat-icon>person_add</mat-icon>
                        <span>Agregar Trabajador</span>
                      </button>
                      <mat-divider></mat-divider>
                      @if (company.isActive) {
                        <button mat-menu-item (click)="toggleActive(company)">
                          <mat-icon class="text-orange-600">visibility_off</mat-icon>
                          <span>Inactivar</span>
                        </button>
                      } @else {
                        <button mat-menu-item (click)="toggleActive(company)">
                          <mat-icon class="text-green-600">visibility</mat-icon>
                          <span>Activar</span>
                        </button>
                      }
                      <button mat-menu-item (click)="deleteCompany(company)" class="text-red-600">
                        <mat-icon class="text-red-600">delete</mat-icon>
                        <span>Eliminar</span>
                      </button>
                    </mat-menu>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        <button mat-stroked-button (click)="close()">
          Cerrar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      width: 700px;
      max-width: 95vw;
      max-height: 85vh;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 1.5rem;
      min-height: 300px;
      max-height: 50vh;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .companies-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .company-card {
      padding: 1rem;
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 0.75rem;
      transition: all 0.2s;
    }

    .company-card:hover {
      border-color: #a855f7;
      box-shadow: 0 2px 8px rgba(168, 85, 247, 0.1);
    }

    .company-card.inactive {
      opacity: 0.6;
      background: #f8fafc;
    }

    .company-avatar {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #a855f7, #6366f1);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .badge-inactive {
      padding: 0.125rem 0.5rem;
      background: #fef2f2;
      color: #dc2626;
      font-size: 0.625rem;
      font-weight: 600;
      border-radius: 0.375rem;
      text-transform: uppercase;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
  `]
})
export class CompaniesListDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<CompaniesListDialogComponent>);
  private dialog = inject(MatDialog);
  private companiesService = inject(CompaniesService);
  private workersService = inject(WorkersService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  isLoading = signal(true);
  searchTerm = '';

  companies = this.companiesService.companies;
  workers = this.workersService.workers;

  filteredCompanies = computed(() => {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.companies();

    return this.companies().filter(company =>
      company.legalName.toLowerCase().includes(term) ||
      company.taxId.toLowerCase().includes(term) ||
      (company.email && company.email.toLowerCase().includes(term)) ||
      (company.phone && company.phone.includes(term))
    );
  });

  async ngOnInit() {
    await this.loadData();
  }

  private async loadData() {
    this.isLoading.set(true);
    try {
      await Promise.all([
        this.companiesService.initialize(),
        this.workersService.initialize()
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  getWorkerCount(companyId: string): number {
    return this.workers().filter(w => w.companyId === companyId).length;
  }

  createCompany() {
    const dialogRef = this.dialog.open(CreateCompanyDialogComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.companyId) {
        await this.companiesService.forceReload();
        this.snackBar.open('Empresa creada exitosamente', 'Cerrar', { duration: 3000 });
      }
    });
  }

  editCompany(company: Company) {
    const dialogRef = this.dialog.open(EditCompanyDialogComponent, {
      width: '600px',
      disableClose: true,
      data: { company }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.updated) {
        await this.companiesService.forceReload();
        this.snackBar.open('Empresa actualizada exitosamente', 'Cerrar', { duration: 3000 });
      }
    });
  }

  viewWorkers(company: Company) {
    // Close this dialog and navigate to workers filtered by company
    this.dialogRef.close();
    this.router.navigate(['/modules/workers'], {
      queryParams: { companyId: company.id }
    });
  }

  addWorkerToCompany(company: Company) {
    this.dialogRef.close();
    this.router.navigate(['/modules/workers/new'], {
      queryParams: { companyId: company.id }
    });
  }

  async toggleActive(company: Company) {
    const currentUser = this.authService.authorizedUser();
    const result = await this.companiesService.toggleActive(
      company.id,
      !company.isActive,
      currentUser?.uid || ''
    );

    if (result.success) {
      this.snackBar.open(result.message, 'Cerrar', { duration: 3000 });
    } else {
      this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
    }
  }

  deleteCompany(company: Company) {
    const workersCount = this.getWorkerCount(company.id);

    let message = `¿Estás seguro de eliminar la empresa "${company.legalName}"?`;
    if (workersCount > 0) {
      message += `\n\nEsta empresa tiene ${workersCount} trabajador(es) asignado(s). Se eliminará la asociación pero los trabajadores se mantendrán.`;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar Empresa',
        message,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        type: 'danger'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed) {
        const result = await this.companiesService.deleteCompany(company.id);
        if (result.success) {
          this.snackBar.open('Empresa eliminada exitosamente', 'Cerrar', { duration: 3000 });
        } else {
          this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  close() {
    this.dialogRef.close();
  }
}
