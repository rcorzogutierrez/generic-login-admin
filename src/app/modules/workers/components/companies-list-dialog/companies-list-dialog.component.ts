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
import { CompanyFormDialogComponent, CompanyFormDialogData, CompanyFormDialogResult } from '../company-form-dialog/company-form-dialog.component';

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
      <!-- Header Compacto -->
      <div class="dialog-header">
        <div class="flex items-center gap-3">
          <div class="header-icon-box">
            <mat-icon>business</mat-icon>
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-800 m-0">Empresas Subcontratistas</h2>
            <p class="text-xs text-slate-500 m-0">{{ companies().length }} empresa(s) registrada(s)</p>
          </div>
        </div>
        <button type="button" class="close-btn" (click)="close()" title="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Search Compacto -->
      <div class="search-bar">
        <div class="flex items-center gap-3">
          <mat-icon class="text-slate-400 !text-lg">search</mat-icon>
          <input
            type="text"
            [(ngModel)]="searchTerm"
            placeholder="Buscar por nombre, Tax ID, email..."
            class="search-input">
          @if (searchTerm) {
            <button type="button" class="icon-btn-sm" (click)="searchTerm = ''" title="Limpiar">
              <mat-icon>close</mat-icon>
            </button>
          }
          <button type="button" class="btn-primary" (click)="createCompany()">
            <mat-icon>add</mat-icon>
            <span>Nueva</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        @if (isLoading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Cargando empresas...</p>
          </div>
        } @else if (filteredCompanies().length === 0) {
          <div class="empty-state">
            <mat-icon>business</mat-icon>
            <h3>{{ searchTerm ? 'No se encontraron empresas' : 'No hay empresas registradas' }}</h3>
            <p>{{ searchTerm ? 'Intenta con otra búsqueda' : 'Comienza agregando tu primera empresa subcontratista' }}</p>
            @if (!searchTerm) {
              <button type="button" class="btn-primary" (click)="createCompany()">
                <mat-icon>add_business</mat-icon>
                <span>Crear Primera Empresa</span>
              </button>
            }
          </div>
        } @else {
          <div class="companies-list">
            @for (company of filteredCompanies(); track company.id) {
              <div class="company-card" [class.inactive]="!company.isActive">
                <div class="company-avatar">
                  {{ (company.legalName || 'E').charAt(0).toUpperCase() }}
                </div>
                <div class="company-info">
                  <div class="company-header">
                    <span class="company-name">{{ company.legalName }}</span>
                    @if (!company.isActive) {
                      <span class="badge-inactive">Inactiva</span>
                    }
                  </div>
                  <p class="company-taxid">{{ company.taxId }}</p>
                  <div class="company-contact">
                    @if (company.email) {
                      <span><mat-icon>email</mat-icon> {{ company.email }}</span>
                    }
                    @if (company.phone) {
                      <span><mat-icon>phone</mat-icon> {{ company.phone }}</span>
                    }
                  </div>
                  <div class="company-workers">
                    <mat-icon>groups</mat-icon>
                    {{ getWorkerCount(company.id) }} trabajador(es)
                  </div>
                </div>
                <div class="company-actions">
                  <button type="button" class="icon-btn" [matMenuTriggerFor]="companyMenu" title="Opciones">
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
            }
          </div>
        }
      </div>

      <!-- Footer Compacto -->
      <div class="dialog-footer">
        <button type="button" class="btn-secondary" (click)="close()">
          Cerrar
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* Container */
    .dialog-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-height: 85vh;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }

    /* Header Compacto */
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid #e2e8f0;
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    }

    .header-icon-box {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    }

    .header-icon-box mat-icon {
      color: white;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      transition: all 0.15s;
    }

    .close-btn:hover {
      background: #fee2e2;
      color: #dc2626;
    }

    .close-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Search Bar */
    .search-bar {
      padding: 12px 18px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .search-input {
      flex: 1;
      padding: 8px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      transition: all 0.15s;
    }

    .search-input:focus {
      border-color: #f59e0b;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
    }

    .search-input::placeholder {
      color: #94a3b8;
    }

    .icon-btn-sm {
      width: 32px;
      height: 32px;
      border: none;
      background: #f1f5f9;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      transition: all 0.15s;
    }

    .icon-btn-sm:hover {
      background: #e2e8f0;
      color: #475569;
    }

    .icon-btn-sm mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Content */
    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 14px 18px;
      min-height: 250px;
      max-height: 50vh;
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 0;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #fef3c7;
      border-top-color: #f59e0b;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-state p {
      margin-top: 12px;
      font-size: 13px;
      color: #64748b;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 40px 20px;
    }

    .empty-state mat-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      color: #cbd5e1;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      font-size: 15px;
      font-weight: 600;
      color: #475569;
      margin: 0 0 8px;
    }

    .empty-state p {
      font-size: 13px;
      color: #64748b;
      margin: 0 0 20px;
    }

    /* Companies List */
    .companies-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .company-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px;
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      transition: all 0.2s;
    }

    .company-card:hover {
      border-color: #f59e0b;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
    }

    .company-card.inactive {
      opacity: 0.6;
      background: #f8fafc;
    }

    .company-avatar {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      flex-shrink: 0;
    }

    .company-info {
      flex: 1;
      min-width: 0;
    }

    .company-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .company-name {
      font-weight: 600;
      font-size: 14px;
      color: #1e293b;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .badge-inactive {
      padding: 2px 6px;
      background: #fef2f2;
      color: #dc2626;
      font-size: 10px;
      font-weight: 600;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .company-taxid {
      font-size: 12px;
      color: #64748b;
      font-family: monospace;
      margin: 2px 0 0;
    }

    .company-contact {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 6px;
    }

    .company-contact span {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #64748b;
    }

    .company-contact mat-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
    }

    .company-workers {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 8px;
      padding: 3px 8px;
      background: #fef3c7;
      color: #d97706;
      font-size: 11px;
      font-weight: 600;
      border-radius: 4px;
    }

    .company-workers mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .company-actions {
      display: flex;
      align-items: center;
    }

    .icon-btn {
      width: 34px;
      height: 34px;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      transition: all 0.15s;
    }

    .icon-btn:hover {
      background: #f1f5f9;
      color: #475569;
    }

    .icon-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Footer Compacto */
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 18px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    /* Buttons */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }

    .btn-primary mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: white;
      color: #475569;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-secondary:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
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
    const dialogRef = this.dialog.open(CompanyFormDialogComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(async (result: CompanyFormDialogResult | undefined) => {
      if (result?.companyId) {
        await this.companiesService.forceReload();
      }
    });
  }

  editCompany(company: Company) {
    const dialogRef = this.dialog.open(CompanyFormDialogComponent, {
      width: '600px',
      disableClose: true,
      data: { company } as CompanyFormDialogData
    });

    dialogRef.afterClosed().subscribe(async (result: CompanyFormDialogResult | undefined) => {
      if (result?.updated) {
        await this.companiesService.forceReload();
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
