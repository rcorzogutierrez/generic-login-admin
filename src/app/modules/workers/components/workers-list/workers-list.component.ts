import { Component, OnInit, signal } from '@angular/core';
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
import { Router } from '@angular/router';

import { WorkersService } from '../../services';
import { Worker } from '../../models';
import { GenericDeleteDialogComponent } from '../../../../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericDeleteMultipleDialogComponent } from '../../../../shared/components/generic-delete-multiple-dialog/generic-delete-multiple-dialog.component';
import { WORKERS_CONFIG, adaptWorkerToGenericEntity } from '../../config/workers.config';

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
    MatCheckboxModule
  ],
  templateUrl: './workers-list.component.html',
  styleUrl: './workers-list.component.css'
})
export class WorkersListComponent implements OnInit {
  searchTerm = '';
  selectedWorkers = new Set<string>();
  isLoading = false;

  workers = this.workersService.workers;
  filteredWorkers = signal<Worker[]>([]);
  displayedWorkers = signal<Worker[]>([]);

  constructor(
    private workersService: WorkersService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    await this.workersService.initialize();
    this.applyFilters();
    this.isLoading = false;
  }

  applyFilters() {
    const term = this.searchTerm.toLowerCase().trim();
    const workers = this.workers();

    if (!term) {
      this.filteredWorkers.set(workers);
    } else {
      this.filteredWorkers.set(
        workers.filter(w =>
          w.name.toLowerCase().includes(term) ||
          w.email.toLowerCase().includes(term) ||
          (w.position && w.position.toLowerCase().includes(term)) ||
          (w.phone && w.phone.toLowerCase().includes(term))
        )
      );
    }

    this.displayedWorkers.set(this.filteredWorkers().slice(0, 50));
  }

  createWorker() {
    this.router.navigate(['/workers/new']);
  }

  editWorker(worker: Worker) {
    this.router.navigate(['/workers/edit', worker.id]);
  }

  async deleteWorker(worker: Worker) {
    const dialogRef = this.dialog.open(GenericDeleteDialogComponent, {
      width: '600px',
      data: {
        entity: adaptWorkerToGenericEntity(worker),
        config: WORKERS_CONFIG
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        const deleteResult = await this.workersService.deleteWorker(worker.id);
        if (deleteResult.success) {
          this.snackBar.open('Trabajador eliminado exitosamente', 'Cerrar', { duration: 3000 });
          this.applyFilters();
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  async deleteSelectedWorkers() {
    if (this.selectedWorkers.size === 0) {
      this.snackBar.open('Selecciona al menos un trabajador', 'Cerrar', { duration: 3000 });
      return;
    }

    const selectedList = this.workers().filter(w => this.selectedWorkers.has(w.id));

    const dialogRef = this.dialog.open(GenericDeleteMultipleDialogComponent, {
      width: '700px',
      data: {
        entities: selectedList.map(adaptWorkerToGenericEntity),
        count: selectedList.length,
        config: WORKERS_CONFIG
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        const deleteResult = await this.workersService.deleteMultipleWorkers(
          Array.from(this.selectedWorkers)
        );

        if (deleteResult.success) {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 3000 });
          this.selectedWorkers.clear();
          this.applyFilters();
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  toggleSelection(workerId: string) {
    if (this.selectedWorkers.has(workerId)) {
      this.selectedWorkers.delete(workerId);
    } else {
      this.selectedWorkers.add(workerId);
    }
  }

  isSelected(workerId: string): boolean {
    return this.selectedWorkers.has(workerId);
  }

  toggleSelectAll() {
    if (this.selectedWorkers.size === this.displayedWorkers().length) {
      this.clearSelection();
    } else {
      this.displayedWorkers().forEach(worker => {
        this.selectedWorkers.add(worker.id);
      });
    }
  }

  clearSelection() {
    this.selectedWorkers.clear();
  }

  goToConfig() {
    this.router.navigate(['/workers/config']);
  }

  async refreshData() {
    this.isLoading = true;
    await this.workersService.initialize();
    this.applyFilters();
    this.isLoading = false;
    this.snackBar.open('Datos actualizados', 'Cerrar', { duration: 2000 });
  }

  trackById(index: number, worker: Worker): string {
    return worker.id;
  }
}
