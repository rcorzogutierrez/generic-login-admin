// src/app/modules/projects/components/confirm-dialog/confirm-dialog.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
  icon?: string;
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
    <h2 mat-dialog-title class="flex items-center gap-2">
      @if (data.icon) {
        <mat-icon [class]="getIconClass()">{{ data.icon }}</mat-icon>
      }
      {{ data.title }}
    </h2>

    <mat-dialog-content class="!py-6">
      <p class="text-base text-slate-700 whitespace-pre-line">{{ data.message }}</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="!p-6 !pt-0">
      <button
        mat-button
        (click)="onCancel()">
        {{ data.cancelText || 'Cancelar' }}
      </button>
      <button
        mat-raised-button
        [color]="data.confirmColor || 'primary'"
        (click)="onConfirm()">
        {{ data.confirmText || 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host ::ng-deep .mat-mdc-dialog-container {
      max-width: 500px;
    }
  `]
})
export class ConfirmDialogComponent {
  public data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getIconClass(): string {
    if (this.data.confirmColor === 'warn') {
      return 'text-red-600';
    }
    if (this.data.confirmColor === 'accent') {
      return 'text-green-600';
    }
    return 'text-blue-600';
  }
}
