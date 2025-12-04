import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

import { CompaniesService } from '../../services';
import { Company } from '../../models';
import { GenericDeleteDialogComponent } from '../../../../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericDeleteMultipleDialogComponent } from '../../../../shared/components/generic-delete-multiple-dialog/generic-delete-multiple-dialog.component';
import { AuthService } from '../../../../core/services/auth.service';
import { GenericModuleConfig } from '../../../../shared/models/generic-entity.interface';
import { CompanyWorkersDialogComponent } from '../company-workers-dialog/company-workers-dialog.component';

@Component({
  selector: 'app-companies-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    MatMenuModule,
    MatCheckboxModule,
    MatDividerModule
  ],
  templateUrl: './companies-list.component.html',
  styleUrl: './companies-list.component.css'
})
export class CompaniesListComponent implements OnInit {
  searchTerm = signal<string>('');
  selectedCompanies = signal<string[]>([]);
  isLoading = false;

  // Paginación
  currentPage = signal<number>(0);
  itemsPerPage = signal<number>(25);

  // Math para templates
  Math = Math;

  companies = this.companiesService.companies;

  // Companies filtrados
  filteredCompanies = computed(() => {
    const companies = this.companies();
    const search = this.searchTerm().toLowerCase();

    if (!search) return companies;

    return companies.filter(company => {
      if (company.legalName?.toLowerCase().includes(search)) return true;
      if (company.taxId?.toLowerCase().includes(search)) return true;
      if (company.email?.toLowerCase().includes(search)) return true;
      if (company.phone?.includes(search)) return true;
      if (company.address?.toLowerCase().includes(search)) return true;
      return false;
    });
  });

  // Companies paginados
  paginatedCompanies = computed(() => {
    const companies = this.filteredCompanies();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = page * perPage;
    const end = start + perPage;

    return companies.slice(start, end);
  });

  totalPages = computed(() => {
    const total = this.filteredCompanies().length;
    const perPage = this.itemsPerPage();
    return Math.ceil(total / perPage);
  });

  // Config para diálogos de eliminación
  genericConfig: GenericModuleConfig = {
    collection: 'companies',
    entityName: 'Empresa',
    entityNamePlural: 'Empresas',
    fields: [
      { name: 'legalName', label: 'Nombre Legal', showInGrid: true, showInDelete: true },
      { name: 'taxId', label: 'Tax ID', showInGrid: true, showInDelete: true },
      { name: 'email', label: 'Email', type: 'email', showInGrid: true, showInDelete: true },
      { name: 'phone', label: 'Teléfono', type: 'phone', showInGrid: true },
      { name: 'address', label: 'Dirección', showInGrid: true }
    ],
    searchFields: ['legalName', 'taxId', 'email', 'phone'],
    deleteDialogFieldsCount: 3
  };

  constructor(
    private companiesService: CompaniesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    await this.companiesService.initialize();
    this.isLoading = false;
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.currentPage.set(0);
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  createCompany() {
    this.router.navigate(['/modules/companies/new']);
  }

  editCompany(company: Company) {
    this.router.navigate(['/modules/companies', company.id, 'edit']);
  }

  viewCompany(company: Company) {
    this.router.navigate(['/modules/companies', company.id]);
  }

  async toggleActive(company: Company) {
    const currentUser = this.authService.authorizedUser();
    if (!currentUser?.uid) {
      this.snackBar.open('Usuario no autenticado', 'Cerrar', { duration: 3000 });
      return;
    }

    const newStatus = !company.isActive;
    const result = await this.companiesService.toggleActive(company.id, newStatus, currentUser.uid);

    if (result.success) {
      this.snackBar.open(result.message, 'Cerrar', { duration: 3000 });
    } else {
      this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
    }
  }

  async deleteCompany(company: Company) {
    const dialogRef = this.dialog.open(GenericDeleteDialogComponent, {
      width: '600px',
      data: {
        entity: company as any,
        config: this.genericConfig
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        const deleteResult = await this.companiesService.deleteCompany(company.id);
        if (deleteResult.success) {
          this.snackBar.open('Empresa eliminada exitosamente', 'Cerrar', { duration: 3000 });
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  async deleteSelectedCompanies() {
    const selectedIds = this.selectedCompanies();
    if (selectedIds.length === 0) {
      this.snackBar.open('Selecciona al menos una empresa', 'Cerrar', { duration: 3000 });
      return;
    }

    const selectedList = this.companies().filter(c => selectedIds.includes(c.id));

    const dialogRef = this.dialog.open(GenericDeleteMultipleDialogComponent, {
      width: '700px',
      data: {
        entities: selectedList as any[],
        count: selectedList.length,
        config: this.genericConfig
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        const deleteResult = await this.companiesService.deleteMultipleCompanies(selectedIds);

        if (deleteResult.success) {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 3000 });
          this.selectedCompanies.set([]);
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  toggleSelection(companyId: string) {
    const selected = this.selectedCompanies();
    if (selected.includes(companyId)) {
      this.selectedCompanies.set(selected.filter(id => id !== companyId));
    } else {
      this.selectedCompanies.set([...selected, companyId]);
    }
  }

  isSelected(companyId: string): boolean {
    return this.selectedCompanies().includes(companyId);
  }

  toggleSelectAll() {
    const selected = this.selectedCompanies();
    const paginated = this.paginatedCompanies();

    if (selected.length === paginated.length) {
      this.clearSelection();
    } else {
      this.selectedCompanies.set(paginated.map(company => company.id));
    }
  }

  isAllSelected(): boolean {
    const selected = this.selectedCompanies();
    const paginated = this.paginatedCompanies();
    return paginated.length > 0 && selected.length === paginated.length;
  }

  isIndeterminate(): boolean {
    const selected = this.selectedCompanies();
    const paginated = this.paginatedCompanies();
    return selected.length > 0 && selected.length < paginated.length;
  }

  clearSelection() {
    this.selectedCompanies.set([]);
  }

  async refreshData() {
    this.isLoading = true;
    await this.companiesService.forceReload();
    this.isLoading = false;
    this.snackBar.open('Datos actualizados', 'Cerrar', { duration: 2000 });
  }

  trackById(index: number, company: Company): string {
    return company.id;
  }

  getActiveCompanies(): Company[] {
    return this.companies().filter(c => c.isActive);
  }

  getActiveCompaniesCount(): number {
    return this.getActiveCompanies().length;
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  viewWorkers(company: Company) {
    this.dialog.open(CompanyWorkersDialogComponent, {
      width: '900px',
      maxHeight: '80vh',
      data: { company }
    });
  }
}
