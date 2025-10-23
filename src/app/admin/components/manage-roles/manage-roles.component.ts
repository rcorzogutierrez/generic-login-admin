// src/app/admin/components/manage-roles/manage-roles.component.ts
import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { RolesService } from '../../services/roles.service';
import { AdminService, User } from '../../services/admin.service';
import { Role } from '../../models/role.interface';

@Component({
  selector: 'app-manage-roles',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatCheckboxModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatBadgeModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './manage-roles.component.html',
  styleUrl: './manage-roles.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageRolesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private rolesService = inject(RolesService);
  private adminService = inject(AdminService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<ManageRolesComponent>);
  private cdr = inject(ChangeDetectorRef);

  roles: Role[] = [];
  users: User[] = [];
  isLoading = false;

  // Modo de visualización: 'list' o 'add' o 'edit'
  viewMode: 'list' | 'add' | 'edit' = 'list';

  // Formulario para agregar/editar rol
  roleForm!: FormGroup;
  selectedRole: Role | null = null;

  // Opciones de permisos
  permissionOptions = this.adminService.getPermissionOptions();

  ngOnInit() {
    this.loadData();
    this.initializeForm();
  }

  /**
   * Carga los datos de roles y usuarios
   */
  async loadData() {
    this.isLoading = true;
    this.cdr.markForCheck(); // ✅ Forzar detección de cambios para mostrar loading

    try {
      // ✅ CRÍTICO: Inicializar servicios antes de leer datos
      await this.rolesService.initialize();
      await this.adminService.initialize();

      this.roles = this.rolesService.roles();
      this.users = this.adminService.users();

      // Actualizar contadores de usuarios por rol
      this.updateRoleUserCounts();

      this.cdr.markForCheck(); // ✅ Forzar detección de cambios después de cargar datos
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.snackBar.open('Error cargando datos', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck(); // ✅ Forzar detección de cambios para ocultar loading
    }
  }

  /**
   * Actualiza el contador de usuarios para cada rol
   */
  updateRoleUserCounts() {
    this.roles.forEach(role => {
      const count = this.getUsersByRole(role.value).length;
      role.userCount = count;
    });
  }

  /**
   * Inicializa el formulario
   */
  initializeForm() {
    this.roleForm = this.fb.group({
      value: ['', [Validators.required, Validators.pattern(/^[a-z_]+$/)]],
      label: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
      permissions: [[], [Validators.required]],
      isActive: [true]
    });
  }

  /**
   * Cambia al modo de agregar rol
   */
  showAddRole() {
    this.viewMode = 'add';
    this.selectedRole = null;
    this.roleForm.reset({
      value: '',
      label: '',
      description: '',
      permissions: [],
      isActive: true
    });
    this.roleForm.enable();
    this.cdr.markForCheck(); // ✅ Forzar detección de cambios
  }

  /**
   * Cambia al modo de editar rol
   */
  showEditRole(role: Role) {
    this.viewMode = 'edit';
    this.selectedRole = role;

    this.roleForm.patchValue({
      value: role.value,
      label: role.label,
      description: role.description,
      permissions: role.permissions,
      isActive: role.isActive
    });

    // Si es un rol del sistema, deshabilitar el campo 'value'
    if (role.isSystemRole) {
      this.roleForm.get('value')?.disable();
    } else {
      this.roleForm.get('value')?.enable();
    }
    this.cdr.markForCheck(); // ✅ Forzar detección de cambios
  }

  /**
   * Vuelve a la lista de roles
   */
  backToList() {
    this.viewMode = 'list';
    this.selectedRole = null;
    this.roleForm.reset();
    this.cdr.markForCheck(); // ✅ Forzar detección de cambios
  }

  /**
   * Guarda un rol (crear o editar)
   */
  async saveRole() {
    if (this.roleForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos correctamente', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck(); // ✅ Forzar detección de cambios

    try {
      const formValue = this.roleForm.getRawValue();

      if (this.viewMode === 'add') {
        await this.rolesService.createRole(formValue);
        this.snackBar.open('Rol creado exitosamente', 'Cerrar', { duration: 3000 });
      } else if (this.viewMode === 'edit' && this.selectedRole) {
        await this.rolesService.updateRole(this.selectedRole.id, formValue);
        this.snackBar.open('Rol actualizado exitosamente', 'Cerrar', { duration: 3000 });
      }

      await this.loadData();
      this.backToList();
    } catch (error: any) {
      console.error('Error guardando rol:', error);
      this.snackBar.open(error.message || 'Error guardando rol', 'Cerrar', { duration: 4000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck(); // ✅ Forzar detección de cambios
    }
  }

  /**
   * Elimina un rol
   */
  async deleteRole(role: Role) {
    if (role.isSystemRole) {
      this.snackBar.open('No se pueden eliminar los roles del sistema', 'Cerrar', { duration: 3000 });
      return;
    }

    if (role.userCount && role.userCount > 0) {
      this.snackBar.open('No se puede eliminar un rol que tiene usuarios asignados', 'Cerrar', { duration: 4000 });
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar el rol "${role.label}"?`)) {
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck(); // ✅ Forzar detección de cambios

    try {
      await this.rolesService.deleteRole(role.id);
      this.snackBar.open('Rol eliminado exitosamente', 'Cerrar', { duration: 3000 });
      await this.loadData();
    } catch (error: any) {
      console.error('Error eliminando rol:', error);
      this.snackBar.open(error.message || 'Error eliminando rol', 'Cerrar', { duration: 4000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck(); // ✅ Forzar detección de cambios
    }
  }

  /**
   * Obtiene usuarios por rol
   */
  getUsersByRole(roleValue: string): User[] {
    return this.users.filter(user => user.role === roleValue);
  }

  /**
   * Toggle de permiso
   */
  togglePermission(permission: string) {
    const permissions = this.roleForm.get('permissions')?.value || [];
    const index = permissions.indexOf(permission);

    if (index > -1) {
      permissions.splice(index, 1);
    } else {
      permissions.push(permission);
    }

    this.roleForm.patchValue({ permissions });
  }

  /**
   * Verifica si un permiso está seleccionado
   */
  isPermissionSelected(permission: string): boolean {
    const permissions = this.roleForm.get('permissions')?.value || [];
    return permissions.includes(permission);
  }

  /**
   * Obtiene el icono de un permiso
   */
  getPermissionIcon(permission: string): string {
    const icons: Record<string, string> = {
      read: 'visibility',
      write: 'edit',
      delete: 'delete',
      manage_users: 'people'
    };
    return icons[permission] || 'check_circle';
  }

  /**
   * Obtiene el label de un permiso
   */
  getPermissionLabel(permission: string): string {
    const perm = this.permissionOptions.find(p => p.value === permission);
    return perm?.label || permission;
  }

  /**
   * Obtiene el icono de un rol
   */
  getRoleIcon(roleValue: string): string {
    const icons: Record<string, string> = {
      admin: 'shield',
      user: 'person',
      viewer: 'visibility'
    };
    return icons[roleValue] || 'label';
  }

  /**
   * Obtiene el color de un rol
   */
  getRoleColor(roleValue: string): string {
    const colors: Record<string, string> = {
      admin: 'red',
      user: 'blue',
      viewer: 'green'
    };
    return colors[roleValue] || 'purple';
  }

  /**
   * Validaciones del formulario
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.roleForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.roleForm.get(fieldName);
    if (!field) return '';

    if (field.hasError('required')) return 'Este campo es requerido';
    if (field.hasError('minlength')) {
      const minLength = field.getError('minlength').requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }
    if (field.hasError('maxlength')) {
      const maxLength = field.getError('maxlength').requiredLength;
      return `Máximo ${maxLength} caracteres`;
    }
    if (field.hasError('pattern')) {
      return 'Solo letras minúsculas y guiones bajos';
    }

    return '';
  }

  /**
   * Cierra el diálogo
   */
  onCancel() {
    this.dialogRef.close();
  }
}
