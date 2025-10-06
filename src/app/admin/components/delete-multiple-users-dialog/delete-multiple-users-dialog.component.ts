// src/app/admin/components/delete-multiple-users-dialog/delete-multiple-users-dialog.component.ts

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { User } from '../../services/admin.service';

export interface DeleteMultipleUsersDialogData {
  users: User[];
  count: number;
}

@Component({
  selector: 'app-delete-multiple-users-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './delete-multiple-users-dialog.component.html',
  styleUrl: './delete-multiple-users-dialog.component.css'
})
export class DeleteMultipleUsersDialogComponent {
  confirmationText = '';
  isDeleting = false;

  constructor(
    public dialogRef: MatDialogRef<DeleteMultipleUsersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteMultipleUsersDialogData
  ) {}

  getUserInitials(user: User): string {
    const name = user.displayName || user.email;
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getUserColor(email: string): string {
    const colors = [
      'linear-gradient(135deg, #ef4444, #dc2626)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'linear-gradient(135deg, #3b82f6, #2563eb)',
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #ec4899, #db2777)'
    ];

    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  canConfirm(): boolean {
    return this.confirmationText.trim().toUpperCase() === 'ELIMINAR';
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