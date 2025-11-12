// src/app/admin/components/delete-module-dialog/delete-module-dialog.component.ts
import { Component, Inject, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SystemModule } from '../../models/system-module.interface';

export interface DeleteModuleDialogData {
  module: SystemModule;
}

@Component({
  selector: 'app-delete-module-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './delete-module-dialog.component.html',
  styleUrl: './delete-module-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteModuleDialogComponent {
  // ============================================
  // DEPENDENCY INJECTION (Angular 20 pattern)
  // ============================================
  public dialogRef = inject(MatDialogRef<DeleteModuleDialogComponent>);

  // ============================================
  // STATE
  // ============================================
  deleteMethod: 'soft' | 'hard' = 'soft';
  isDeleting = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DeleteModuleDialogData) {}

  /**
   * ✅ NUEVO: Verifica si NO se puede eliminar permanentemente
   * Solo se puede eliminar permanentemente si:
   * - usersCount === 0 (nadie lo usa)
   * - isActive === false (ya está desactivado)
   */
  cannotDeletePermanently(): boolean {
    return (this.data.module.usersCount ?? 0) > 0 || this.data.module.isActive;
  }

  /**
   * ✅ NUEVO: Verifica si la acción actual es inválida
   */
  isInvalidAction(): boolean {
    // No se puede "desactivar" si ya está desactivado
    if (this.deleteMethod === 'soft' && !this.data.module.isActive) {
      return true;
    }
    return false;
  }

  /**
   * ✅ NUEVO: Obtiene el ícono correcto según la acción
   */
  getActionIcon(): string {
    if (this.deleteMethod === 'hard') return 'delete_forever';
    if (this.data.module.isActive) return 'visibility_off';
    return 'check';
  }

  /**
   * ✅ NUEVO: Obtiene la etiqueta correcta según la acción
   */
  getActionLabel(): string {
    if (this.isDeleting) return 'Procesando...';
    if (this.deleteMethod === 'hard') return 'Eliminar Permanentemente';
    if (this.data.module.isActive) return 'Desactivar Módulo';
    return 'Ya está desactivado';
  }

  onConfirm(): void {
    if (!this.isDeleting && !this.isInvalidAction()) {
      this.isDeleting = true;
      this.dialogRef.close({ 
        confirmed: true, 
        hardDelete: this.deleteMethod === 'hard' 
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }
}