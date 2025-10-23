// src/app/admin/components/log-details-dialog/log-details-dialog.component.ts
import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminLog } from '../../services/admin-logs.service';

export interface LogDetailsDialogData {
  log: AdminLog;
}

@Component({
  selector: 'app-log-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './log-details-dialog.component.html',
  styleUrl: './log-details-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<LogDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LogDetailsDialogData
  ) {}

  formatActionName(action: string): string {
    if (!action) return '';
    
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatFullDateTime(date: Date): string {
    if (!date) return 'Fecha desconocida';
    
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  }

  hasDetails(): boolean {
    const details = this.data.log.detailsObject;
    return details && Object.keys(details).length > 0;
  }

  formatJSON(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      return '{}';
    }
  }

  async copyToClipboard() {
    try {
      const text = this.formatJSON(this.data.log.detailsObject);
      await navigator.clipboard.writeText(text);
      // Podrías agregar un MatSnackBar aquí si quieres
      alert('JSON copiado al portapapeles ✓');
    } catch (error) {
      console.error('Error copiando al portapapeles:', error);
      alert('Error al copiar al portapapeles');
    }
  }

  close() {
    this.dialogRef.close();
  }
}