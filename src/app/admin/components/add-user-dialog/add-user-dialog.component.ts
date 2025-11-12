// add-user-dialog.component.ts - VERSIÓN MEJORADA
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService, CreateUserRequest } from '../../services/admin.service';
import { getRoleIcon, getPermissionIcon, getModuleIcon } from '../../../shared/utils';


@Component({
  selector: 'app-add-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule
  ],
  templateUrl: './add-user-dialog.component.html',
  styleUrl: './add-user-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class AddUserDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<AddUserDialogComponent>);

  userForm!: FormGroup;
  isLoading = false;
  selectedTabIndex = 0;

  // Opciones para los selects
  roleOptions = this.adminService.getRoleOptions();
  permissionOptions = this.adminService.getPermissionOptions();
  moduleOptions = this.adminService.getModuleOptions();

  // ============================================
  // SHARED UTILITIES (Angular 20 pattern)
  // ============================================

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

  ngOnInit() {
    this.initializeForm();
  }

  private initializeForm() {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      role: ['user', [Validators.required]],
      isActive: [true],
      permissions: [['read'], [Validators.required]],
      modules: [['dashboard']]
    });

    // Auto-actualizar permisos al cambiar rol
    this.userForm.get('role')?.valueChanges.subscribe(role => {
      this.updatePermissionsForRole(role);
    });
  }

  // ===== MÉTODOS DE NAVEGACIÓN DE TABS =====

  onTabChange(event: any) {
    this.selectedTabIndex = event.index;
  }

  nextTab() {
    if (this.selectedTabIndex < 2) {
      this.selectedTabIndex++;
    }
  }

  previousTab() {
    if (this.selectedTabIndex > 0) {
      this.selectedTabIndex--;
    }
  }

 // add-user-dialog.component.ts - MÉTODOS CORREGIDOS

canProceedToNextTab(): boolean {
  switch (this.selectedTabIndex) {
    case 0: // Info básica
      return !!(
        this.userForm.get('email')?.valid && 
        this.userForm.get('displayName')?.valid &&
        this.userForm.get('role')?.valid
      );
    case 1: // Permisos
      const perms = this.userForm.get('permissions')?.value;
      return !!(perms && perms.length > 0);
    case 2: // Módulos
      const mods = this.userForm.get('modules')?.value;
      return !!(mods && mods.length > 0);
    default:
      return false;
  }
}

isTabValid(tabIndex: number): boolean {
  switch (tabIndex) {
    case 0:
      return !!(
        this.userForm.get('email')?.valid && 
        this.userForm.get('displayName')?.valid &&
        this.userForm.get('role')?.valid
      );
    case 1:
      const perms = this.userForm.get('permissions')?.value;
      return !!(perms && perms.length > 0);
    case 2:
      // ⬅️ CAMBIAR ESTA VALIDACIÓN: Ya no es obligatorio tener módulos
      return true; // Siempre válido, incluso sin módulos
    default:
      return false;
  }
}

  // ===== MÉTODOS DE PERMISOS =====

  isPermissionSelected(permission: string): boolean {
    const permissions = this.userForm.get('permissions')?.value || [];
    return permissions.includes(permission);
  }

  togglePermission(permission: string) {
    const permissions = this.userForm.get('permissions')?.value || [];
    const index = permissions.indexOf(permission);
    
    if (index >= 0) {
      permissions.splice(index, 1);
    } else {
      permissions.push(permission);
    }
    
    this.userForm.patchValue({ permissions });
  }

  getSelectedPermissions(): string[] {
    return this.userForm.get('permissions')?.value || [];
  }

  getPermissionLabel(permission: string): string {
    const option = this.permissionOptions.find(p => p.value === permission);
    return option?.label || permission;
  }

  // ===== MÉTODOS DE MÓDULOS =====

  isModuleSelected(module: string): boolean {
    const modules = this.userForm.get('modules')?.value || [];
    return modules.includes(module);
  }

  toggleModule(module: string) {
    const modules = this.userForm.get('modules')?.value || [];
    const index = modules.indexOf(module);
    
    if (index >= 0) {
      modules.splice(index, 1);
    } else {
      modules.push(module);
    }
    
    this.userForm.patchValue({ modules });
  }

  getSelectedModules(): string[] {
    return this.userForm.get('modules')?.value || [];
  }

  getModuleLabel(module: string): string {
    const option = this.moduleOptions.find(m => m.value === module);
    return option?.label || module;
  }

  private updatePermissionsForRole(role: string) {
    const defaultPermissions = this.getDefaultPermissionsForRole(role);
    this.userForm.patchValue({ permissions: defaultPermissions }, { emitEvent: false });
  }

  private getDefaultPermissionsForRole(role: string): string[] {
    switch (role) {
      case 'admin':
        return ['read', 'write', 'delete', 'manage_users'];
      case 'user':
        return ['read', 'write'];
      case 'viewer':
        return ['read'];
      default:
        return ['read'];
    }
  }

  // ===== SUBMIT =====

  async onSubmit() {
    if (this.userForm.valid && !this.isLoading) {
      this.isLoading = true;

      try {
        const formValue = this.userForm.value;
        const createUserData: CreateUserRequest = {
          email: formValue.email.trim().toLowerCase(),
          displayName: formValue.displayName.trim(),
          role: formValue.role,
          isActive: formValue.isActive,
          permissions: formValue.permissions || [],
          modules: formValue.modules || []
        };

        const result = await this.adminService.createUser(createUserData);

        if (result.success) {
          this.snackBar.open(result.message, 'Cerrar', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          
          this.dialogRef.close({ success: true, user: createUserData });
        } else {
          this.snackBar.open(result.message, 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      } catch (error: any) {
        console.error('Error en creación de usuario:', error);
        this.snackBar.open('Error inesperado al crear el usuario', 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel() {
    this.dialogRef.close({ success: false });
  }

  // ===== HELPERS =====

  getErrorMessage(field: string): string {
    const control = this.userForm.get(field);
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(field)} es requerido`;
    }
    if (control?.hasError('email')) {
      return 'Ingrese un email válido';
    }
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${requiredLength} caracteres`;
    }
    if (control?.hasError('maxlength')) {
      const requiredLength = control.errors?.['maxlength'].requiredLength;
      return `Máximo ${requiredLength} caracteres`;
    }
    return '';
  }

  private getFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      email: 'Email',
      displayName: 'Nombre completo',
      role: 'Rol',
      permissions: 'Permisos',
      modules: 'Módulos'
    };
    return labels[field] || field;
  }

  private markFormGroupTouched() {
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.userForm.get(field);
    return !!(control?.invalid && (control?.dirty || control?.touched));
  }
}