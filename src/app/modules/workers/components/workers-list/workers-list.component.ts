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

import { WorkersService, WorkersConfigService } from '../../services';
import { Worker } from '../../models';
import { GenericDeleteDialogComponent } from '../../../../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericDeleteMultipleDialogComponent } from '../../../../shared/components/generic-delete-multiple-dialog/generic-delete-multiple-dialog.component';
import { createGenericConfig } from '../../config/workers.config';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-workers-list',
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
  templateUrl: './workers-list.component.html',
  styleUrl: './workers-list.component.css'
})
export class WorkersListComponent implements OnInit {
  searchTerm = signal<string>('');
  selectedWorkers = signal<string[]>([]);
  isLoading = false;

  // Paginación
  currentPage = signal<number>(0);
  itemsPerPage = signal<number>(25);

  // Math para templates
  Math = Math;

  workers = this.workersService.workers;

  // Workers filtrados
  filteredWorkers = computed(() => {
    const workers = this.workers();
    const search = this.searchTerm().toLowerCase();

    if (!search) return workers;

    return workers.filter(w =>
      w.name.toLowerCase().includes(search) ||
      w.email.toLowerCase().includes(search) ||
      (w.position && w.position.toLowerCase().includes(search)) ||
      (w.phone && w.phone.toLowerCase().includes(search))
    );
  });

  // Workers paginados
  paginatedWorkers = computed(() => {
    const workers = this.filteredWorkers();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = page * perPage;
    const end = start + perPage;

    return workers.slice(start, end);
  });

  totalPages = computed(() => {
    const total = this.filteredWorkers().length;
    const perPage = this.itemsPerPage();
    return Math.ceil(total / perPage);
  });

  config = this.configService.config;
  gridFields = computed(() => this.configService.getGridFields());

  // Generic config for delete dialogs
  genericConfig = computed(() => {
    const workerConfig = this.config();
    return workerConfig ? createGenericConfig(workerConfig) : null;
  });

  constructor(
    private workersService: WorkersService,
    private configService: WorkersConfigService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    await Promise.all([
      this.configService.initialize(),
      this.workersService.initialize()
    ]);

    // Cargar configuración de paginación
    const config = this.config();
    if (config && config.gridConfig) {
      this.itemsPerPage.set(config.gridConfig.itemsPerPage || 25);
    }

    this.isLoading = false;
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.currentPage.set(0); // Reset a primera página al buscar
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  createWorker() {
    this.router.navigate(['/modules/workers/new']);
  }

  editWorker(worker: Worker) {
    this.router.navigate(['/modules/workers', worker.id, 'edit']);
  }

  async toggleActive(worker: Worker) {
    const currentUser = this.authService.authorizedUser();
    if (!currentUser?.uid) {
      this.snackBar.open('Usuario no autenticado', 'Cerrar', { duration: 3000 });
      return;
    }

    const newStatus = !worker.isActive;
    const result = await this.workersService.toggleActive(worker.id, newStatus, currentUser.uid);

    if (result.success) {
      this.snackBar.open(result.message, 'Cerrar', { duration: 3000 });
    } else {
      this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
    }
  }

  async deleteWorker(worker: Worker) {
    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(GenericDeleteDialogComponent, {
      width: '600px',
      data: {
        entity: worker as any,
        config: config
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        const deleteResult = await this.workersService.deleteWorker(worker.id);
        if (deleteResult.success) {
          this.snackBar.open('Trabajador eliminado exitosamente', 'Cerrar', { duration: 3000 });
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  async deleteSelectedWorkers() {
    const selectedIds = this.selectedWorkers();
    if (selectedIds.length === 0) {
      this.snackBar.open('Selecciona al menos un trabajador', 'Cerrar', { duration: 3000 });
      return;
    }

    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const selectedList = this.workers().filter(w => selectedIds.includes(w.id));

    const dialogRef = this.dialog.open(GenericDeleteMultipleDialogComponent, {
      width: '700px',
      data: {
        entities: selectedList as any[],
        count: selectedList.length,
        config: config
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        const deleteResult = await this.workersService.deleteMultipleWorkers(selectedIds);

        if (deleteResult.success) {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 3000 });
          this.selectedWorkers.set([]);
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  toggleSelection(workerId: string) {
    const selected = this.selectedWorkers();
    if (selected.includes(workerId)) {
      this.selectedWorkers.set(selected.filter(id => id !== workerId));
    } else {
      this.selectedWorkers.set([...selected, workerId]);
    }
  }

  isSelected(workerId: string): boolean {
    return this.selectedWorkers().includes(workerId);
  }

  toggleSelectAll() {
    const selected = this.selectedWorkers();
    const paginated = this.paginatedWorkers();

    if (selected.length === paginated.length) {
      this.clearSelection();
    } else {
      this.selectedWorkers.set(paginated.map(worker => worker.id));
    }
  }

  isAllSelected(): boolean {
    const selected = this.selectedWorkers();
    const paginated = this.paginatedWorkers();
    return paginated.length > 0 && selected.length === paginated.length;
  }

  isIndeterminate(): boolean {
    const selected = this.selectedWorkers();
    const paginated = this.paginatedWorkers();
    return selected.length > 0 && selected.length < paginated.length;
  }

  clearSelection() {
    this.selectedWorkers.set([]);
  }

  goToConfig() {
    this.router.navigate(['/modules/workers/config']);
  }

  async refreshData() {
    this.isLoading = true;
    await this.workersService.initialize();
    this.isLoading = false;
    this.snackBar.open('Datos actualizados', 'Cerrar', { duration: 2000 });
  }

  trackById(index: number, worker: Worker): string {
    return worker.id;
  }

  /**
   * Helper methods to avoid arrow functions in templates
   */
  getActiveWorkers(): Worker[] {
    return this.workers().filter(w => w.isActive);
  }

  getActiveWorkersCount(): number {
    return this.getActiveWorkers().length;
  }

  getFilteredActiveWorkers(): Worker[] {
    return this.filteredWorkers().filter(w => w.isActive);
  }

  /**
   * Obtener valor del campo
   */
  getFieldValue(worker: Worker, fieldName: string): any {
    if (fieldName in worker) {
      return (worker as any)[fieldName];
    }
    return worker.customFields?.[fieldName];
  }

  /**
   * Formatear valor del campo
   */
  formatFieldValue(value: any, field: any): string {
    if (value === null || value === undefined) {
      return '-';
    }

    const fieldType = field.type;

    switch (fieldType) {
      case 'date':
        return new Date(value).toLocaleDateString();

      case 'datetime':
        return new Date(value).toLocaleString();

      case 'checkbox':
        return value ? 'Sí' : 'No';

      case 'currency':
        return new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: 'USD'
        }).format(value);

      case 'select':
        if (field.options && Array.isArray(field.options)) {
          const option = field.options.find((opt: any) => opt.value === value);
          return option ? option.label : String(value);
        }
        return String(value);

      case 'multiselect':
        if (Array.isArray(value) && field.options) {
          const labels = value.map((val: string) => {
            const option = field.options.find((opt: any) => opt.value === val);
            return option ? option.label : val;
          });
          return labels.join(', ');
        }
        return String(value);

      case 'dictionary':
        if (typeof value === 'object' && value !== null) {
          const entries = Object.entries(value);
          if (entries.length === 0) {
            return '-';
          }
          const display = entries.slice(0, 2).map(([key, val]) => {
            let displayKey = key;
            if (field.options && Array.isArray(field.options)) {
              const option = field.options.find((opt: any) => opt.value === key);
              if (option) {
                displayKey = option.label;
              }
            }
            return `${displayKey}: ${val}`;
          }).join(', ');
          return entries.length > 2 ? `${display}, ...` : display;
        }
        return String(value);

      default:
        return String(value);
    }
  }
}
