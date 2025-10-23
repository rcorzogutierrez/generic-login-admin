// src/app/admin/components/delete-multiple-users-dialog/delete-multiple-users-dialog.component.ts

import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { User } from '../../services/admin.service';
import { getUserInitials, getUserColor } from '../../../shared/utils/user-display.utils';
import { validateConfirmation } from '../../../shared/utils/confirmation.utils';

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
  styleUrl: './delete-multiple-users-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteMultipleUsersDialogComponent {
  confirmationText = '';
  isDeleting = false;

  constructor(
    public dialogRef: MatDialogRef<DeleteMultipleUsersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteMultipleUsersDialogData
  ) {}

  getUserInitials(user: User): string {
    return getUserInitials(user);
  }

  getUserColor(email: string): string {
    return getUserColor(email);
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