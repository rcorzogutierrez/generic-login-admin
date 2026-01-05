// src/app/admin/components/delete-logs-dialog/delete-logs-dialog.component.ts
import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminLogsService } from '../../services/admin-logs.service';
import { validateConfirmation } from '../../../shared/utils/confirmation.utils';

export type DeleteOption = 'all' | 'older_than' | 'by_days';

@Component({
  selector: 'app-delete-logs-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './delete-logs-dialog.component.html',
  styleUrl: './delete-logs-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteLogsDialogComponent implements OnInit {
  // ============================================
  // DEPENDENCY INJECTION (Angular 20 pattern)
  // ============================================
  public dialogRef = inject(MatDialogRef<DeleteLogsDialogComponent>);
  private logsService = inject(AdminLogsService);
  private cdr = inject(ChangeDetectorRef);

  // ============================================
  // STATE
  // ============================================
  selectedOption: DeleteOption = 'older_than';
  daysInput: number = 30;
  confirmationText = '';
  isDeleting = false;
  totalLogs = 0;
  isLoadingCount = true;

  async ngOnInit() {
    await this.loadTotalCount();
  }

  async loadTotalCount() {
    try {
      this.isLoadingCount = true;
      this.totalLogs = await this.logsService.getTotalLogsCount();
    } catch (error) {
      console.error('Error cargando conteo:', error);
      this.totalLogs = 0;
    } finally {
      this.isLoadingCount = false;
      this.cdr.markForCheck();
    }
  }

  getEstimatedDeleteCount(): number {
    // Esta es una estimación - en producción podrías hacer una query para obtener el count real
    if (this.selectedOption === 'all') {
      return this.totalLogs;
    } else if (this.selectedOption === 'older_than') {
      // Estimación: asumimos que el 70% de los logs tienen más de X días
      return Math.floor(this.totalLogs * 0.7);
    }
    return 0;
  }

  canConfirm(): boolean {
    const keyword = this.getRequiredKeyword();
    return validateConfirmation(this.confirmationText, keyword);
  }

  getRequiredKeyword(): string {
    if (this.selectedOption === 'all') {
      return 'ELIMINAR TODO';
    }
    return 'ELIMINAR';
  }

  getWarningMessage(): string {
    if (this.selectedOption === 'all') {
      return `Se eliminarán TODOS los ${this.totalLogs} logs del sistema`;
    } else if (this.selectedOption === 'older_than') {
      return `Se eliminarán todos los logs con más de ${this.daysInput} días`;
    }
    return '';
  }

  async onConfirm() {
    if (!this.canConfirm() || this.isDeleting) return;

    this.isDeleting = true;

    try {
      let result;

      if (this.selectedOption === 'all') {
        result = await this.logsService.deleteAllLogs();
      } else if (this.selectedOption === 'older_than') {
        result = await this.logsService.deleteLogsOlderThan(this.daysInput);
      }

      this.dialogRef.close({ success: true, result });

    } catch (error) {
      console.error('Error eliminando logs:', error);
      this.dialogRef.close({ success: false, error });
    } finally {
      this.isDeleting = false;
    }
  }

  onCancel() {
    this.dialogRef.close({ success: false });
  }
}