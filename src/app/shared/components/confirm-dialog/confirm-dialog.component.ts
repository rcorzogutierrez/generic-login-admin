// src/app/shared/components/confirm-dialog/confirm-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="confirm-dialog">
      <h2 mat-dialog-title class="flex items-center gap-3">
        <mat-icon [class]="getIconClass()">{{ getIcon() }}</mat-icon>
        {{ data.title }}
      </h2>

      <mat-dialog-content>
        <p class="text-base text-gray-700">{{ data.message }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="gap-2">
        <button
          mat-button
          (click)="onCancel()">
          {{ data.cancelText || 'Cancelar' }}
        </button>
        <button
          mat-raised-button
          [color]="data.type === 'danger' ? 'warn' : 'primary'"
          (click)="onConfirm()">
          {{ data.confirmText || 'Confirmar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      min-width: 300px;
      max-width: 500px;
    }

    mat-dialog-content {
      padding: 20px 0;
      min-height: 60px;
    }

    .icon-warning {
      color: #f59e0b;
    }

    .icon-danger {
      color: #ef4444;
    }

    .icon-info {
      color: #3b82f6;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  getIcon(): string {
    switch (this.data.type) {
      case 'warning':
        return 'warning';
      case 'danger':
        return 'error';
      case 'info':
      default:
        return 'help_outline';
    }
  }

  getIconClass(): string {
    switch (this.data.type) {
      case 'warning':
        return 'icon-warning';
      case 'danger':
        return 'icon-danger';
      case 'info':
      default:
        return 'icon-info';
    }
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
