// src/app/modules/clients/components/delete-multiple-clients-dialog/delete-multiple-clients-dialog.component.ts

import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Client } from '../../models/client.interface';
import { validateConfirmation } from '../../../../shared/utils/confirmation.utils';

export interface DeleteMultipleClientsDialogData {
  clients: Client[];
  count: number;
}

@Component({
  selector: 'app-delete-multiple-clients-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './delete-multiple-clients-dialog.component.html',
  styleUrl: './delete-multiple-clients-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteMultipleClientsDialogComponent {
  confirmationText = '';
  isDeleting = false;

  constructor(
    public dialogRef: MatDialogRef<DeleteMultipleClientsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteMultipleClientsDialogData
  ) {}

  getClientInitials(client: Client): string {
    const name = client.name || '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getClientColor(client: Client): string {
    const email = client.email || client.name;
    const colors = [
      '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
      '#10b981', '#06b6d4', '#6366f1', '#ef4444'
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  canConfirm(): boolean {
    return validateConfirmation(this.confirmationText, 'ELIMINAR');
  }

  onConfirm(): void {
    if (this.canConfirm() && !this.isDeleting) {
      this.isDeleting = true;
      this.dialogRef.close({ confirmed: true });
    }
  }

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }
}
