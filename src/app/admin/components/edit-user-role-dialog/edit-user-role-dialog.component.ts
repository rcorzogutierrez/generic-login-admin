// src/app/admin/components/edit-user-role-dialog/edit-user-role-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

import { User, AdminService, RoleOption, PermissionOption } from '../../services/admin.service';
import { AuthService } from '../../../core/services/auth.service';

export interface EditUserRoleDialogData {
  user: User;
}

@Component({
  selector: 'app-edit-user-role-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatDividerModule,
    MatChipsModule
  ],
  templateUrl: './edit-user-role-dialog.component.html',
  styleUrls: ['./edit-user-role-dialog.component.css']
})
export class EditUserRoleDialogComponent implements OnInit {
  // Opciones disponibles
  roleOptions: RoleOption[] = [];
  permissionOptions: PermissionOption[] = [];

  // Datos editables
  selectedRole: 'admin' | 'user' | 'viewer' = 'user';
  selectedPermissions = new Set<string>();
  isActive = true;

  // Estado original para detectar cambios
  originalRole: string = '';
  originalPermissions = new Set<string>();
  originalIsActive = true;

  // Control de estado
  isSaving = false;
  currentTab = 0;

  constructor(
    public dialogRef: MatDialogRef<EditUserRoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditUserRoleDialogData,
    private adminService: AdminService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadOptions();
    this.initializeData();
  }

  /**
   * Carga las opciones de roles y permisos
   */
  private loadOptions() {
    this.roleOptions = this.adminService.getRoleOptions();
    this.permissionOptions = this.adminService.getPermissionOptions();
  }

  /**
   * Inicializa los datos del usuario
   */
  private initializeData() {
    // Rol
    this.selectedRole = this.data.user.role;
    this.originalRole = this.data.user.role;

    // Permisos
    const userPermissions = this.data.user.permissions || [];
    userPermissions.forEach(perm => {
      this.selectedPermissions.add(perm);
      this.originalPermissions.add(perm);
    });

    // Estado activo
    this.isActive = this.data.user.isActive;
    this.originalIsActive = this.data.user.isActive;
  }

  // ============================================
  // GESTIÓN DE ROL
  // ============================================

  /**
   * Selecciona un rol
   */
  selectRole(role: 'admin' | 'user' | 'viewer') {
    this.selectedRole = role;

    // Si se selecciona admin, agregar todos los permisos automáticamente
    if (role === 'admin') {
      this.permissionOptions.forEach(perm => {
        this.selectedPermissions.add(perm.value);
      });
    }
  }

  /**
   * Obtiene la descripción del rol
   */
  getRoleDescription(role: string): string {
    const roleOption = this.roleOptions.find(r => r.value === role);
    return roleOption?.description || '';
  }

  // ============================================
  // GESTIÓN DE PERMISOS
  // ============================================

  /**
   * Toggle de un permiso
   */
  togglePermission(permission: string) {
    if (this.selectedPermissions.has(permission)) {
      // No permitir quitar todos los permisos
      if (this.selectedPermissions.size <= 1) {
        return;
      }
      this.selectedPermissions.delete(permission);
    } else {
      this.selectedPermissions.add(permission);
    }
  }

  /**
   * Verifica si un permiso está seleccionado
   */
  isPermissionSelected(permission: string): boolean {
    return this.selectedPermissions.has(permission);
  }

  /**
   * Selecciona todos los permisos
   */
  selectAllPermissions() {
    this.permissionOptions.forEach(perm => {
      this.selectedPermissions.add(perm.value);
    });
  }

  /**
   * Deselecciona todos los permisos excepto 'read'
   */
  deselectAllPermissions() {
    this.selectedPermissions.clear();
    this.selectedPermissions.add('read'); // Mantener al menos 'read'
  }

  /**
   * Aplica permisos predeterminados según el rol
   */
  applyDefaultPermissions() {
    this.selectedPermissions.clear();

    switch (this.selectedRole) {
      case 'admin':
        this.permissionOptions.forEach(perm => {
          this.selectedPermissions.add(perm.value);
        });
        break;
      case 'user':
        this.selectedPermissions.add('read');
        this.selectedPermissions.add('write');
        break;
      case 'viewer':
        this.selectedPermissions.add('read');
        break;
    }
  }

  // ============================================
  // GESTIÓN DE CAMBIOS
  // ============================================

  /**
   * Verifica si hay cambios
   */
  hasChanges(): boolean {
    // Verificar cambio de rol
    if (this.selectedRole !== this.originalRole) {
      return true;
    }

    // Verificar cambio de estado activo
    if (this.isActive !== this.originalIsActive) {
      return true;
    }

    // Verificar cambios en permisos
    if (this.selectedPermissions.size !== this.originalPermissions.size) {
      return true;
    }

    for (const perm of this.selectedPermissions) {
      if (!this.originalPermissions.has(perm)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Obtiene un resumen de los cambios
   */
  getChangesSummary(): string[] {
    const changes: string[] = [];

    if (this.selectedRole !== this.originalRole) {
      const oldRoleLabel = this.roleOptions.find(r => r.value === this.originalRole)?.label;
      const newRoleLabel = this.roleOptions.find(r => r.value === this.selectedRole)?.label;
      changes.push(`Rol: ${oldRoleLabel} → ${newRoleLabel}`);
    }

    if (this.isActive !== this.originalIsActive) {
      changes.push(`Estado: ${this.originalIsActive ? 'Activo' : 'Inactivo'} → ${this.isActive ? 'Activo' : 'Inactivo'}`);
    }

    const addedPerms = Array.from(this.selectedPermissions).filter(
      perm => !this.originalPermissions.has(perm)
    );
    const removedPerms = Array.from(this.originalPermissions).filter(
      perm => !this.selectedPermissions.has(perm)
    );

    if (addedPerms.length > 0) {
      const labels = addedPerms.map(p =>
        this.permissionOptions.find(opt => opt.value === p)?.label || p
      );
      changes.push(`Permisos agregados: ${labels.join(', ')}`);
    }

    if (removedPerms.length > 0) {
      const labels = removedPerms.map(p =>
        this.permissionOptions.find(opt => opt.value === p)?.label || p
      );
      changes.push(`Permisos removidos: ${labels.join(', ')}`);
    }

    return changes;
  }

  // ============================================
  // VALIDACIONES
  // ============================================

  /**
   * Verifica si se puede guardar
   */
  canSave(): boolean {
    // Debe haber cambios
    if (!this.hasChanges()) {
      return false;
    }

    // Debe tener al menos un permiso
    if (this.selectedPermissions.size === 0) {
      return false;
    }

    // No se puede desactivar el último admin
    if (!this.isActive && this.data.user.role === 'admin') {
      // Esta validación se hará en el servicio
    }

    // No se puede cambiar el rol del último admin
    if (this.selectedRole !== 'admin' && this.data.user.role === 'admin') {
      // Esta validación se hará en el servicio
    }

    return true;
  }

  /**
   * Verifica si es el usuario actual
   */
  isCurrentUser(): boolean {
    return this.authService.authorizedUser()?.email === this.data.user.email;
  }

  // ============================================
  // ACCIONES
  // ============================================

  /**
   * Guarda los cambios
   */
  async onSave() {
    if (!this.canSave() || this.isSaving) {
      return;
    }

    this.isSaving = true;

    try {
      const updateData: Partial<User> = {};

      if (this.selectedRole !== this.originalRole) {
        updateData.role = this.selectedRole;
      }

      if (this.isActive !== this.originalIsActive) {
        updateData.isActive = this.isActive;
      }

      const newPermissions = Array.from(this.selectedPermissions);
      if (JSON.stringify(newPermissions.sort()) !== JSON.stringify(Array.from(this.originalPermissions).sort())) {
        updateData.permissions = newPermissions;
      }

      const result = await this.adminService.updateUser(
        this.data.user.uid!,
        updateData
      );

      if (result.success) {
        this.dialogRef.close({
          success: true,
          message: 'Usuario actualizado exitosamente',
          changes: this.getChangesSummary()
        });
      } else {
        alert(result.message);
        this.isSaving = false;
      }
    } catch (error: any) {
      console.error('Error actualizando usuario:', error);
      alert('Error al actualizar el usuario: ' + error.message);
      this.isSaving = false;
    }
  }

  /**
   * Cancela el diálogo
   */
  onCancel() {
    this.dialogRef.close({ success: false });
  }

  /**
   * Restaura los valores originales
   */
  resetChanges() {
    this.selectedRole = this.originalRole as 'admin' | 'user' | 'viewer';
    this.isActive = this.originalIsActive;

    this.selectedPermissions.clear();
    this.originalPermissions.forEach(perm => {
      this.selectedPermissions.add(perm);
    });
  }

  // ============================================
  // MÉTODOS DE UTILIDAD
  // ============================================

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
      'linear-gradient(135deg, #3b82f6, #2563eb)',
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'linear-gradient(135deg, #ef4444, #dc2626)'
    ];

    let hash = 0;
    for (let i = 0; i < this.data.user.email.length; i++) {
      hash = this.data.user.email.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  getRoleIcon(role: string = this.selectedRole): string {
    const icons: Record<string, string> = {
      admin: 'shield',
      user: 'person',
      viewer: 'visibility'
    };
    return icons[role] || 'person';
  }

  getPermissionIcon(permission: string): string {
    const icons: Record<string, string> = {
      read: 'visibility',
      write: 'edit',
      manage_users: 'group',
      delete: 'delete'
    };
    return icons[permission] || 'check_circle';
  }
}
