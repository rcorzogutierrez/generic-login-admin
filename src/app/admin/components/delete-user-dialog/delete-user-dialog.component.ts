// src/app/admin/components/delete-user-dialog/delete-user-dialog.component.ts

import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { User } from '../../services/admin.service';
import { getUserInitials, getUserColor } from '../../../shared/utils/user-display.utils';
import { validateConfirmation } from '../../../shared/utils/confirmation.utils';

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
  styleUrl: './delete-user-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteUserDialogComponent {
  confirmationText = '';
  isDeleting = false;

  constructor(
    public dialogRef: MatDialogRef<DeleteUserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteUserDialogData
  ) {}

  getInitials(): string {
    return getUserInitials(this.data.user);
  }

  getUserColor(): string {
    return getUserColor(this.data.user.email);
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