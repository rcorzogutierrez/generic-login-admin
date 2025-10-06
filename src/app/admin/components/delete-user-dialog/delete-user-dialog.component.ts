// src/app/admin/components/delete-user-dialog/delete-user-dialog.component.ts

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { User } from '../../services/admin.service';

export interface DeleteUserDialogData {
  user: User;
  currentUserEmail?: string;
}

@Component({
  selector: 'app-delete-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './delete-user-dialog.component.html',
  styleUrls: ['./delete-user-dialog.component.css']
})
export class DeleteUserDialogComponent {
  confirmationText = '';
  isDeleting = false;

  constructor(
    public dialogRef: MatDialogRef<DeleteUserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteUserDialogData
  ) {}

  getInitials(): string {
    const name = this.data.user.displayName || this.data.user.email;
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getUserColor(): string {
    const colors = [
      'linear-gradient(135deg, #ef4444, #dc2626)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #8b5cf6, #7c3aed)'
    ];

    const email = this.data.user.email;
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  getRoleIcon(): string {
    const icons: Record<string, string> = {
      admin: 'shield',
      user: 'person',
      viewer: 'visibility'
    };
    return icons[this.data.user.role] || 'person';
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