import { Component, Inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { Company } from '../../models';
import { WorkersService } from '../../../workers/services/workers.service';
import { Worker } from '../../../workers/models';

export interface CompanyWorkersDialogData {
  company: Company;
}

@Component({
  selector: 'app-company-workers-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="dialog-container">
      <!-- Header -->
      <div class="dialog-header">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <mat-icon class="text-white !text-2xl">groups</mat-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-800 m-0">Trabajadores de {{ data.company.legalName }}</h2>
            <p class="text-sm text-slate-500 m-0">{{ companyWorkers().length }} trabajador(es) asignado(s)</p>
          </div>
        </div>
        <button mat-icon-button (click)="close()" class="!text-slate-400">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        @if (isLoading()) {
          <div class="flex flex-col items-center justify-center py-12">
            <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-sm text-slate-500 mt-3">Cargando trabajadores...</p>
          </div>
        } @else if (companyWorkers().length === 0) {
          <div class="empty-state py-12">
            <mat-icon class="!text-6xl text-slate-300 mb-4">person_off</mat-icon>
            <h3 class="text-lg font-semibold text-slate-700 mb-2">No hay trabajadores asignados</h3>
            <p class="text-sm text-slate-500 mb-6">Esta empresa aún no tiene trabajadores registrados</p>
            <button
              mat-raised-button
              color="primary"
              (click)="addWorker()"
              class="!bg-indigo-600">
              <mat-icon>person_add</mat-icon>
              Agregar Trabajador
            </button>
          </div>
        } @else {
          <!-- Lista de trabajadores -->
          <div class="workers-list">
            @for (worker of companyWorkers(); track worker.id) {
              <div class="worker-card" [class.inactive]="!worker.isActive">
                <div class="flex items-center gap-3">
                  <div class="worker-avatar">
                    {{ worker.fullName?.charAt(0)?.toUpperCase() || 'T' }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-slate-800 truncate">{{ worker.fullName }}</p>
                    <p class="text-sm text-slate-500 truncate">{{ worker.phone || 'Sin teléfono' }}</p>
                  </div>
                  @if (!worker.isActive) {
                    <span class="badge-inactive">Inactivo</span>
                  }
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
        <button
          mat-raised-button
          color="primary"
          (click)="addWorker()"
          class="!bg-indigo-600">
          <mat-icon>person_add</mat-icon>
          Agregar Trabajador
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      max-height: 80vh;
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
      padding: 1.5rem;
      min-height: 200px;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .workers-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .worker-card {
      padding: 1rem;
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 0.75rem;
      transition: all 0.2s;
    }

    .worker-card:hover {
      border-color: #6366f1;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
    }

    .worker-card.inactive {
      opacity: 0.6;
      background: #f8fafc;
    }

    .worker-avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
    }

    .badge-inactive {
      padding: 0.25rem 0.5rem;
      background: #fef2f2;
      color: #dc2626;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 0.375rem;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
  `]
})
export class CompanyWorkersDialogComponent implements OnInit {
  isLoading = signal(true);
  allWorkers = signal<Worker[]>([]);

  companyWorkers = computed(() => {
    return this.allWorkers().filter(w => w.companyId === this.data.company.id);
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: CompanyWorkersDialogData,
    private dialogRef: MatDialogRef<CompanyWorkersDialogComponent>,
    private workersService: WorkersService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadWorkers();
  }

  private async loadWorkers() {
    this.isLoading.set(true);
    try {
      await this.workersService.initialize();
      this.allWorkers.set(this.workersService.workers());
    } finally {
      this.isLoading.set(false);
    }
  }

  close() {
    this.dialogRef.close();
  }

  addWorker() {
    this.dialogRef.close();
    this.router.navigate(['/modules/workers/new'], {
      queryParams: { companyId: this.data.company.id }
    });
  }
}
