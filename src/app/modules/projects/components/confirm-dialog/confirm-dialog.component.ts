// src/app/modules/projects/components/confirm-dialog/confirm-dialog.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
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
    MatIconModule
  ],
  template: `
    <div class="dialog-container">
      <!-- Header -->
      <div class="dialog-header" [class.warn]="data.confirmColor === 'warn'">
        <div class="header-content">
          <div class="icon-box">
            <mat-icon>{{ data.icon || getDefaultIcon() }}</mat-icon>
          </div>
          <h2 class="dialog-title">{{ data.title }}</h2>
        </div>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        <p class="message">{{ data.message }}</p>
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        <button type="button" class="btn-cancel" (click)="onCancel()">
          <mat-icon>close</mat-icon>
          <span>{{ data.cancelText || 'Cancelar' }}</span>
        </button>
        <button
          type="button"
          class="btn-confirm"
          [class.btn-warn]="data.confirmColor === 'warn'"
          [class.btn-success]="data.confirmColor === 'accent'"
          (click)="onConfirm()">
          <mat-icon>{{ getConfirmIcon() }}</mat-icon>
          <span>{{ data.confirmText || 'Confirmar' }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      min-width: 360px;
      max-width: 480px;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      animation: dialogFadeIn 0.2s ease-out;
    }

    @keyframes dialogFadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    /* Header */
    .dialog-header {
      display: flex;
      align-items: center;
      padding: 1rem 1.25rem;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
    }

    .dialog-header.warn {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .icon-box {
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      backdrop-filter: blur(4px);
    }

    .icon-box mat-icon {
      color: white;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .dialog-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.3;
    }

    /* Content */
    .dialog-content {
      padding: 1.5rem 1.25rem;
      background: #ffffff;
    }

    .message {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 500;
      color: #475569;
      line-height: 1.6;
      white-space: pre-line;
    }

    /* Footer */
    .dialog-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }

    /* Buttons */
    .btn-cancel {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      color: #64748b;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-cancel:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #334155;
    }

    .btn-cancel mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-confirm {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
    }

    .btn-confirm:hover {
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
      transform: translateY(-1px);
    }

    .btn-confirm.btn-warn {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    }

    .btn-confirm.btn-warn:hover {
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }

    .btn-confirm.btn-success {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
    }

    .btn-confirm.btn-success:hover {
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
    }

    .btn-confirm mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .dialog-container {
        min-width: 100%;
        border-radius: 0;
      }

      .dialog-footer {
        flex-direction: column-reverse;
        gap: 0.5rem;
      }

      .btn-cancel,
      .btn-confirm {
        width: 100%;
        justify-content: center;
      }
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

  getDefaultIcon(): string {
    if (this.data.confirmColor === 'warn') {
      return 'warning';
    }
    if (this.data.confirmColor === 'accent') {
      return 'check_circle';
    }
    return 'help_outline';
  }

  getConfirmIcon(): string {
    if (this.data.confirmColor === 'warn') {
      return 'delete';
    }
    if (this.data.confirmColor === 'accent') {
      return 'check';
    }
    return 'check';
  }
}
