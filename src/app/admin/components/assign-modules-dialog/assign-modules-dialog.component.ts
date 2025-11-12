// src/app/admin/components/assign-modules-dialog/assign-modules-dialog.component.ts
import { Component, Inject, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';

import { User, AdminService } from '../../services/admin.service';
import { ModulesService } from '../../services/modules.service';
import { SystemModule } from '../../models/system-module.interface';
import { AuthService } from '../../../core/services/auth.service';
import { getInitials, getAvatarColor, getRoleIcon } from '../../../shared/utils';

export interface AssignModulesDialogData {
  user: User;
}

@Component({
  selector: 'app-assign-modules-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './assign-modules-dialog.component.html',
  styleUrl: './assign-modules-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignModulesDialogComponent implements OnInit {
  // ============================================
  // DEPENDENCY INJECTION (Angular 20 pattern)
  // ============================================
  public dialogRef = inject(MatDialogRef<AssignModulesDialogComponent>);
  private modulesService = inject(ModulesService);
  private adminService = inject(AdminService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // ============================================
  // STATE
  // ============================================
  availableModules: SystemModule[] = [];
  selectedModules = new Set<string>();
  originalModules = new Set<string>();
  isLoading = false;
  isSaving = false;

  // ============================================
  // SHARED UTILITIES (Angular 20 pattern)
  // ============================================

  /**
   * Utilidad compartida para obtener iniciales de usuario
   */
  readonly getInitials = getInitials;

  /**
   * Utilidad compartida para obtener color de avatar
   */
  readonly getAvatarColor = getAvatarColor;

  /**
   * Utilidad compartida para obtener icono de rol
   */
  readonly getRoleIcon = getRoleIcon;

  constructor(@Inject(MAT_DIALOG_DATA) public data: AssignModulesDialogData) {}

  async ngOnInit() {
    await this.loadModules();
    this.initializeSelection();
  }

  /**
   * Carga los módulos disponibles
   */
  async loadModules() {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      await this.modulesService.initialize();
      this.availableModules = this.modulesService.modules();
      await this.modulesService.updateAllModulesUserCount();

      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error cargando módulos:', error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Inicializa la selección con los módulos actuales del usuario
   */
  private initializeSelection() {
    const userModules = this.data.user.modules || [];
    userModules.forEach(moduleValue => {
      this.selectedModules.add(moduleValue);
      this.originalModules.add(moduleValue);
    });
  }

  /**
   * Toggle de selección de módulo
   */
  toggleModule(moduleValue: string) {
    if (this.selectedModules.has(moduleValue)) {
      this.selectedModules.delete(moduleValue);
    } else {
      this.selectedModules.add(moduleValue);
    }
    this.cdr.markForCheck();
  }

  /**
   * Verifica si un módulo está seleccionado
   */
  isModuleSelected(moduleValue: string): boolean {
    return this.selectedModules.has(moduleValue);
  }

  /**
   * Selecciona todos los módulos activos
   */
  selectAll() {
    this.availableModules
      .filter(m => m.isActive)
      .forEach(m => this.selectedModules.add(m.value));
    this.cdr.markForCheck();
  }

  /**
   * Deselecciona todos los módulos
   */
  deselectAll() {
    this.selectedModules.clear();
    this.cdr.markForCheck();
  }

  /**
   * Verifica si todos los módulos activos están seleccionados
   */
  areAllSelected(): boolean {
    const activeModules = this.availableModules.filter(m => m.isActive);
    return activeModules.every(m => this.selectedModules.has(m.value));
  }

  /**
   * Obtiene el número de módulos seleccionados
   */
  getSelectedCount(): number {
    return this.selectedModules.size;
  }

  /**
   * Verifica si hay cambios
   */
  hasChanges(): boolean {
    if (this.selectedModules.size !== this.originalModules.size) {
      return true;
    }
    
    for (const moduleValue of this.selectedModules) {
      if (!this.originalModules.has(moduleValue)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Obtiene los módulos que se agregarán
   */
  getAddedModules(): string[] {
    const added: string[] = [];
    for (const moduleValue of this.selectedModules) {
      if (!this.originalModules.has(moduleValue)) {
        added.push(moduleValue);
      }
    }
    return added;
  }

  /**
   * Obtiene los módulos que se quitarán
   */
  getRemovedModules(): string[] {
    const removed: string[] = [];
    for (const moduleValue of this.originalModules) {
      if (!this.selectedModules.has(moduleValue)) {
        removed.push(moduleValue);
      }
    }
    return removed;
  }

  /**
   * Obtiene el label de un módulo por su value
   */
  getModuleLabel(moduleValue: string): string {
    const module = this.availableModules.find(m => m.value === moduleValue);
    return module?.label || moduleValue;
  }

  /**
   * Guarda los cambios
   */
  async onSave() {
    if (!this.hasChanges() || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    try {
      const newModules = Array.from(this.selectedModules);

      const result = await this.adminService.updateUser(
        this.data.user.uid!,
        { modules: newModules }
      );

      if (result.success) {
        await this.modulesService.updateAllModulesUserCount();
        await this.logModuleAssignment();

        this.dialogRef.close({
          success: true,
          message: 'Módulos actualizados exitosamente',
          updatedModules: newModules
        });
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      console.error('Error actualizando módulos:', error);
      alert('Error al actualizar los módulos: ' + error.message);
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Log de la asignación de módulos
   */
  private async logModuleAssignment() {
    const added = this.getAddedModules();
    const removed = this.getRemovedModules();
    
    if (added.length === 0 && removed.length === 0) {
      return;
    }

    // Este log se hará en el servicio AdminService
    console.log('Módulos asignados:', {
      user: this.data.user.email,
      added,
      removed,
      performedBy: this.authService.authorizedUser()?.email
    });
  }

  /**
   * Navega a la configuración de módulos
   */
  goToModulesConfig() {
    this.dialogRef.close({ navigateToModules: true });
    this.router.navigate(['/admin/modules']);
  }

  /**
   * Cancela el dialog
   */
  onCancel() {
    this.dialogRef.close({ success: false });
  }

}