// src/app/admin/components/edit-user-role-dialog/edit-user-role-dialog.component.ts
import { Component, Inject, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { User, AdminService, RoleOption, PermissionOption, ModuleOption } from '../../services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { getInitials, getAvatarColor, getRoleIcon, getPermissionIcon, getModuleIcon } from '../../../shared/utils';

export interface EditUserRoleDialogData {
  user: User;
}

@Component({
  selector: 'app-edit-user-role-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatDividerModule,
    MatChipsModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './edit-user-role-dialog.component.html',
  styleUrl: './edit-user-role-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditUserRoleDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  userForm!: FormGroup;
  isLoading = false;
  selectedTabIndex = 0;

  // Opciones para los selects
  roleOptions = this.adminService.getRoleOptions();
  permissionOptions = this.adminService.getPermissionOptions();
  moduleOptions = this.adminService.getModuleOptions();

  // Estado original para detectar cambios
  originalData: any = {};

  // ============================================
  // SHARED UTILITIES (Angular 20 pattern)
  // ============================================

  /**
   * Utilidad compartida para obtener iniciales
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

  /**
   * Utilidad compartida para obtener icono de permiso
   */
  readonly getPermissionIcon = getPermissionIcon;

  /**
   * Utilidad compartida para obtener icono de módulo
   */
  readonly getModuleIcon = getModuleIcon;

  constructor(
    public dialogRef: MatDialogRef<EditUserRoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditUserRoleDialogData
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.saveOriginalData();
    this.setupRoleChangeListener();
  }

  /**
   * Inicializa el formulario con los datos del usuario
   */
  private initializeForm() {
    this.userForm = this.fb.group({
      displayName: [
        this.data.user.displayName || '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(50)]
      ],
      role: [this.data.user.role || 'user', [Validators.required]],
      permissions: [this.data.user.permissions || [], [Validators.required]],
      modules: [this.data.user.modules || []],
      isActive: [this.data.user.isActive !== false]
    });
  }

  /**
   * Guarda los datos originales para detectar cambios
   */
  private saveOriginalData() {
    this.originalData = {
      displayName: this.data.user.displayName,
      role: this.data.user.role,
      permissions: [...(this.data.user.permissions || [])],
      modules: [...(this.data.user.modules || [])],
      isActive: this.data.user.isActive
    };
  }

  /**
   * Configura el listener para cambios en el rol
   */
  private setupRoleChangeListener() {
    this.userForm.get('role')?.valueChanges.subscribe(role => {
      this.updatePermissionsBasedOnRole(role);
    });
  }

  /**
   * Actualiza los permisos según el rol seleccionado
   */
  private updatePermissionsBasedOnRole(role: string) {
    const currentPermissions = this.userForm.get('permissions')?.value || [];

    switch (role) {
      case 'admin':
        // Admin tiene todos los permisos
        this.userForm.patchValue({
          permissions: this.permissionOptions.map(p => p.value)
        });
        break;
      case 'user':
        // User tiene read y write
        const userPerms = currentPermissions.length === 0
          ? ['read', 'write']
          : currentPermissions.filter((p: string) => p !== 'manage_users');
        this.userForm.patchValue({ permissions: userPerms });
        break;
      case 'viewer':
        // Viewer solo tiene read
        this.userForm.patchValue({ permissions: ['read'] });
        break;
    }
  }

  // ============================================
  // GESTIÓN DE TABS
  // ============================================

  onTabChange(event: any) {
    this.selectedTabIndex = event.index;
  }

  nextTab() {
    if (this.selectedTabIndex < 4) {
      this.selectedTabIndex++;
    }
  }

  previousTab() {
    if (this.selectedTabIndex > 0) {
      this.selectedTabIndex--;
    }
  }

  isTabValid(tabIndex: number): boolean {
    switch (tabIndex) {
      case 0: // Información
        return !!this.userForm.get('displayName')?.valid;
      case 1: // Rol
        return !!this.userForm.get('role')?.valid;
      case 2: // Permisos
        const perms = this.userForm.get('permissions')?.value || [];
        return perms.length > 0;
      case 3: // Módulos
        return true; // Módulos son opcionales
      case 4: // Estado
        return true;
      default:
        return false;
    }
  }

  canProceedToNextTab(): boolean {
    return this.isTabValid(this.selectedTabIndex);
  }

  // ============================================
  // GESTIÓN DE PERMISOS
  // ============================================

  togglePermission(permission: string) {
    const permissions = this.userForm.get('permissions')?.value || [];
    const index = permissions.indexOf(permission);

    // No permitir quitar el último permiso
    if (index > -1 && permissions.length <= 1) {
      this.snackBar.open('El usuario debe tener al menos un permiso', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    if (index > -1) {
      permissions.splice(index, 1);
    } else {
      permissions.push(permission);
    }

    this.userForm.patchValue({ permissions: [...permissions] });
  }

  isPermissionSelected(permission: string): boolean {
    const permissions = this.userForm.get('permissions')?.value || [];
    return permissions.includes(permission);
  }

  getSelectedPermissions(): string[] {
    return this.userForm.get('permissions')?.value || [];
  }

  getPermissionLabel(permission: string): string {
    const perm = this.permissionOptions.find(p => p.value === permission);
    return perm?.label || permission;
  }

  // ============================================
  // GESTIÓN DE MÓDULOS
  // ============================================

  toggleModule(moduleValue: string) {
    const modules = this.userForm.get('modules')?.value || [];
    const index = modules.indexOf(moduleValue);

    if (index > -1) {
      modules.splice(index, 1);
    } else {
      modules.push(moduleValue);
    }

    this.userForm.patchValue({ modules: [...modules] });
  }

  isModuleSelected(moduleValue: string): boolean {
    const modules = this.userForm.get('modules')?.value || [];
    return modules.includes(moduleValue);
  }

  getSelectedModules(): string[] {
    return this.userForm.get('modules')?.value || [];
  }

  getModuleLabel(moduleValue: string): string {
    const module = this.moduleOptions.find(m => m.value === moduleValue);
    return module?.label || moduleValue;
  }

  // ============================================
  // DETECCIÓN DE CAMBIOS
  // ============================================

  hasChanges(): boolean {
    const currentData = this.userForm.value;

    return (
      currentData.displayName !== this.originalData.displayName ||
      currentData.role !== this.originalData.role ||
      currentData.isActive !== this.originalData.isActive ||
      !this.arraysEqual(currentData.permissions, this.originalData.permissions) ||
      !this.arraysEqual(currentData.modules, this.originalData.modules)
    );
  }

  private arraysEqual(arr1: any[], arr2: any[]): boolean {
    if (arr1.length !== arr2.length) return false;
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    return sorted1.every((val, idx) => val === sorted2[idx]);
  }

  getChangesSummary(): string[] {
    const changes: string[] = [];
    const current = this.userForm.value;

    if (current.displayName !== this.originalData.displayName) {
      changes.push(`Nombre: "${this.originalData.displayName}" → "${current.displayName}"`);
    }

    if (current.role !== this.originalData.role) {
      const oldRoleLabel = this.roleOptions.find(r => r.value === this.originalData.role)?.label;
      const newRoleLabel = this.roleOptions.find(r => r.value === current.role)?.label;
      changes.push(`Rol: ${oldRoleLabel} → ${newRoleLabel}`);
    }

    if (current.isActive !== this.originalData.isActive) {
      changes.push(`Estado: ${this.originalData.isActive ? 'Activo' : 'Inactivo'} → ${current.isActive ? 'Activo' : 'Inactivo'}`);
    }

    if (!this.arraysEqual(current.permissions, this.originalData.permissions)) {
      const added = current.permissions.filter((p: string) => !this.originalData.permissions.includes(p));
      const removed = this.originalData.permissions.filter((p: string) => !current.permissions.includes(p));

      if (added.length > 0) {
        changes.push(`Permisos agregados: ${added.map((p: string) => this.getPermissionLabel(p)).join(', ')}`);
      }
      if (removed.length > 0) {
        changes.push(`Permisos removidos: ${removed.map((p: string) => this.getPermissionLabel(p)).join(', ')}`);
      }
    }

    if (!this.arraysEqual(current.modules, this.originalData.modules)) {
      const added = current.modules.filter((m: string) => !this.originalData.modules.includes(m));
      const removed = this.originalData.modules.filter((m: string) => !current.modules.includes(m));

      if (added.length > 0) {
        changes.push(`Módulos agregados: ${added.map((m: string) => this.getModuleLabel(m)).join(', ')}`);
      }
      if (removed.length > 0) {
        changes.push(`Módulos removidos: ${removed.map((m: string) => this.getModuleLabel(m)).join(', ')}`);
      }
    }

    return changes;
  }

  resetChanges() {
    this.userForm.patchValue(this.originalData);
  }

  // ============================================
  // VALIDACIONES
  // ============================================

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (!field) return '';

    if (field.hasError('required')) return 'Este campo es requerido';
    if (field.hasError('email')) return 'Email inválido';
    if (field.hasError('minlength')) {
      const minLength = field.getError('minlength').requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }
    if (field.hasError('maxlength')) {
      const maxLength = field.getError('maxlength').requiredLength;
      return `Máximo ${maxLength} caracteres`;
    }

    return '';
  }

  // ============================================
  // UTILIDADES
  // ============================================

  isCurrentUser(): boolean {
    const currentUser = this.authService.authorizedUser();
    return currentUser?.uid === this.data.user.uid;
  }

  // ============================================
  // ACCIONES
  // ============================================

  async onSave() {
    if (this.userForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos correctamente', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    if (!this.hasChanges()) {
      this.snackBar.open('No hay cambios para guardar', 'Cerrar', { duration: 2000 });
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      const formValue = this.userForm.value;

      if (!this.data.user.uid) {
        throw new Error('El usuario no tiene un UID válido');
      }

      await this.adminService.updateUser(this.data.user.uid, {
        displayName: formValue.displayName,
        role: formValue.role,
        permissions: formValue.permissions,
        modules: formValue.modules,
        isActive: formValue.isActive
      });

      this.snackBar.open('Usuario actualizado exitosamente', 'Cerrar', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error: any) {
      console.error('Error actualizando usuario:', error);
      this.snackBar.open(error.message || 'Error actualizando usuario', 'Cerrar', {
        duration: 4000
      });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  onCancel() {
    if (this.hasChanges()) {
      if (!confirm('¿Descartar los cambios?')) {
        return;
      }
    }
    this.dialogRef.close(false);
  }
}
