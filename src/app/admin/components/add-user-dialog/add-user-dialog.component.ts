// src/app/admin/components/add-user-dialog/add-user-dialog.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService, CreateUserRequest } from '../../services/admin.service';

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
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './add-user-dialog.component.html',
  styleUrls: ['./add-user-dialog.component.css']
})
export class AddUserDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<AddUserDialogComponent>);

  userForm!: FormGroup;
  isLoading = false;

  // Opciones para los selects
  roleOptions = this.adminService.getRoleOptions();
  permissionOptions = this.adminService.getPermissionOptions();
  moduleOptions = this.adminService.getModuleOptions();

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
      modules: [['dashboard'], [Validators.required]] // ← MÓDULOS, no proyectos
    });

    // Escuchar cambios en el rol para ajustar permisos automáticamente
    this.userForm.get('role')?.valueChanges.subscribe(role => {
      this.updatePermissionsForRole(role);
    });
  }

  /**
   * Actualiza permisos automáticamente según el rol seleccionado
   */
  private updatePermissionsForRole(role: string) {
    const defaultPermissions = this.getDefaultPermissionsForRole(role);
    this.userForm.patchValue({ 
      permissions: defaultPermissions 
    }, { emitEvent: false });
  }

  /**
   * Obtiene permisos por defecto según el rol
   */
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
          modules: formValue.modules || [] // ← MÓDULOS
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
      // Mostrar errores de validación
      this.markFormGroupTouched();
    }
  }

  onCancel() {
    this.dialogRef.close({ success: false });
  }

  // Helpers para validación
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
      modules: 'Módulos' // ← MÓDULOS
    };
    return labels[field] || field;
  }

  private markFormGroupTouched() {
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      control?.markAsTouched();
    });
  }

  // Helpers para el template
  isFieldInvalid(field: string): boolean {
    const control = this.userForm.get(field);
    return !!(control?.invalid && (control?.dirty || control?.touched));
  }

  getRoleDescription(role: string): string {
    const option = this.roleOptions.find(opt => opt.value === role);
    return option?.description || '';
  }

  // Para chips de permisos
  removePermission(permission: string) {
    const permissions = this.userForm.get('permissions')?.value || [];
    const index = permissions.indexOf(permission);
    if (index >= 0) {
      permissions.splice(index, 1);
      this.userForm.patchValue({ permissions });
    }
  }

  // Para chips de módulos
  removeModule(module: string) {
    const modules = this.userForm.get('modules')?.value || [];
    const index = modules.indexOf(module);
    if (index >= 0) {
      modules.splice(index, 1);
      this.userForm.patchValue({ modules });
    }
  }

  /**
   * Obtiene el label de un permiso
   */
  getPermissionLabel(permission: string): string {
    const option = this.permissionOptions.find(p => p.value === permission);
    return option?.label || permission;
  }

  /**
   * Obtiene el label de un módulo
   */
  getModuleLabel(module: string): string {
    const option = this.moduleOptions.find(m => m.value === module);
    return option?.label || module;
  }

  /**
   * Obtiene el icono de un módulo
   */
  getModuleIcon(module: string): string {
    const option = this.moduleOptions.find(m => m.value === module);
    return option?.icon || 'extension';
  }
}