// src/app/admin/admin-panel.component.ts - OPTIMIZADO CON ANGULAR 20
import { Component, OnInit, effect, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { AuthService } from '../core/services/auth.service';
import { AdminService, User, AdminStats } from './services/admin.service';
import { AddUserDialogComponent } from './components/add-user-dialog/add-user-dialog.component';
import { GenericDeleteDialogComponent } from '../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericDeleteMultipleDialogComponent } from '../shared/components/generic-delete-multiple-dialog/generic-delete-multiple-dialog.component';
import { AssignModulesDialogComponent } from './components/assign-modules-dialog/assign-modules-dialog.component';
import { EditUserRoleDialogComponent } from './components/edit-user-role-dialog/edit-user-role-dialog.component';
import { ADMIN_USERS_CONFIG, adaptUserToGenericEntity } from './config/admin-users.config';

// ✅ Utilidades compartidas
import {
  getInitials,
  getAvatarColor,
  formatDate,
  getRelativeTime
} from '../shared/utils';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatChipsModule,
    MatMenuModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPanelComponent implements OnInit {
  // ✅ Inject pattern (Angular 20)
  private authService = inject(AuthService);
  private router = inject(Router);
  private adminService = inject(AdminService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  currentUser = this.authService.authorizedUser;

  // Stats del dashboard
  totalUsers = 0;
  activeUsers = 0;
  totalModules = 0;
  adminUsers = 0;

  // Usuarios
  users: User[] = [];
  displayedUsers: User[] = [];
  filteredUsers: User[] = [];

  // Control de filtros y búsqueda
  currentFilter: 'all' | 'admin' | 'modules' | 'active' = 'all';
  searchTerm = '';

  // Control de carga
  isLoading = false;

  // Control de selección múltiple
  selectedUsers = new Set<string>();

  // ✅ Utilidades compartidas expuestas al template
  readonly getInitials = getInitials;
  readonly getAvatarColor = getAvatarColor;
  readonly formatDate = formatDate;
  readonly getRelativeTime = getRelativeTime;

  constructor() {
    // ✅ Effect para reaccionar a cambios en users signal
    effect(() => {
      const users = this.adminService.users();
      this.users = users;
      this.applyFilters();
      // ✅ Forzar detección de cambios después de actualizar usuarios
      this.cdr.markForCheck();
    });
  }

  async ngOnInit() {
    this.isLoading = true;
    this.cdr.markForCheck();

    await this.loadData();

    this.isLoading = false;
    this.cdr.markForCheck();
  }

  /**
   * ✅ OPTIMIZADO: Cargar datos solo cuando es necesario
   */
  private async loadData() {
    try {
      // ✅ Inicializa el servicio solo una vez
      await this.adminService.initialize();

      const stats = await this.adminService.getAdminStats();
      this.totalUsers = stats.totalUsers;
      this.activeUsers = stats.activeUsers;
      this.totalModules = stats.totalModules;
      this.adminUsers = stats.adminUsers;

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      this.snackBar.open('Error cargando datos del panel', 'Cerrar', {
        duration: 3000
      });
    }
  }

  /**
   * Aplicar filtros y búsqueda
   */
  private applyFilters() {
    let filtered = [...this.users];

    // Aplicar filtro por tipo
    switch (this.currentFilter) {
      case 'admin':
        filtered = filtered.filter(u => u.role === 'admin');
        break;
      case 'modules':
        filtered = filtered.filter(u => u.modules && u.modules.length > 0);
        break;
      case 'active':
        filtered = filtered.filter(u => u.isActive);
        break;
      case 'all':
      default:
        // No filtrar
        break;
    }

    // Aplicar búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(term) ||
        (u.displayName && u.displayName.toLowerCase().includes(term))
      );
    }

    this.filteredUsers = filtered;
    this.updateDisplayedUsers();
    // ✅ Forzar detección de cambios después de aplicar filtros
    this.cdr.markForCheck();
  }

  /**
   * Actualizar usuarios mostrados (primeros 10)
   */
  private updateDisplayedUsers() {
    this.displayedUsers = this.filteredUsers.slice(0, 10);
  }

  /**
   * Establecer filtro
   */
  setFilter(filter: 'all' | 'admin' | 'modules' | 'active') {
    this.currentFilter = filter;
    this.applyFilters();
    
    const filterNames = {
      all: 'Todos los usuarios',
      admin: 'Administradores',
      modules: 'Usuarios con módulos',
      active: 'Usuarios activos'
    };
    
    this.snackBar.open(`Filtro: ${filterNames[filter]}`, '', { duration: 2000 });
  }

  /**
   * Filtros rápidos desde stats
   */
  filterByAll() {
    this.setFilter('all');
  }

  filterByActive() {
    this.setFilter('active');
  }

  filterByAdmin() {
    this.setFilter('admin');
  }

  filterByModules() {
    this.setFilter('modules');
  }

  /**
   * Búsqueda en tiempo real
   */
  onSearch() {
    this.applyFilters();
  }

  /**
   * Cargar más usuarios
   */
  loadMoreUsers() {
    const currentLength = this.displayedUsers.length;
    const nextBatch = this.filteredUsers.slice(0, Math.min(currentLength + 10, this.filteredUsers.length));
    
    if (nextBatch.length > this.displayedUsers.length) {
      this.displayedUsers = nextBatch;
      this.snackBar.open(`Mostrando ${this.displayedUsers.length} de ${this.filteredUsers.length} usuarios`, '', { 
        duration: 2000 
      });
    }
  }

  /**
   * Refrescar datos
   */
  async refreshData() {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      await this.loadData();
      this.snackBar.open('Datos actualizados', 'Cerrar', {
        duration: 2000
      });
    } catch (error) {
      this.snackBar.open('Error al actualizar', 'Cerrar', {
        duration: 2000
      });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  // ============================================
  // MÉTODOS DE SELECCIÓN MÚLTIPLE
  // ============================================

  /**
   * Verifica si un usuario puede ser seleccionado
   */
  canSelectUser(user: User): boolean {
    // No permitir seleccionar tu propia cuenta
    if (this.currentUser()?.email === user.email) {
      return false;
    }
    
    // No permitir seleccionar el último admin
    if (user.role === 'admin') {
      const adminCount = this.users.filter(u => u.role === 'admin').length;
      if (adminCount === 1) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Obtiene el tooltip para el checkbox de selección
   */
  getSelectionTooltip(user: User): string {
    if (this.currentUser()?.email === user.email) {
      return 'No puedes seleccionar tu propia cuenta';
    }
    
    if (user.role === 'admin') {
      const adminCount = this.users.filter(u => u.role === 'admin').length;
      if (adminCount === 1) {
        return 'No se puede seleccionar el último administrador';
      }
    }
    
    return 'Seleccionar usuario';
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Toggle selección de un usuario individual
   */
  toggleUserSelection(uid: string) {
    if (this.selectedUsers.has(uid)) {
      this.selectedUsers.delete(uid);
    } else {
      this.selectedUsers.add(uid);
    }
  }

  /**
   * Verifica si un usuario está seleccionado
   */
  isUserSelected(uid: string): boolean {
    return this.selectedUsers.has(uid);
  }

  /**
   * Verifica si todos los usuarios están seleccionados
   */
  isAllSelected(): boolean {
    const selectableUsers = this.displayedUsers.filter(u => 
      u.uid && this.canSelectUser(u)
    );
    
    if (selectableUsers.length === 0) return false;
    
    return selectableUsers.every(u => this.selectedUsers.has(u.uid!));
  }

  /**
   * Verifica si algunos usuarios están seleccionados (para indeterminate)
   */
  isSomeSelected(): boolean {
    const selectableUsers = this.displayedUsers.filter(u => 
      u.uid && this.canSelectUser(u)
    );
    
    if (selectableUsers.length === 0) return false;
    
    const selectedCount = selectableUsers.filter(u => 
      this.selectedUsers.has(u.uid!)
    ).length;
    
    return selectedCount > 0 && selectedCount < selectableUsers.length;
  }

  /**
   * Toggle seleccionar/deseleccionar todos
   */
  toggleSelectAll() {
    if (this.isAllSelected()) {
      // Deseleccionar todos
      this.clearSelection();
    } else {
      // Seleccionar todos los que se pueden seleccionar
      this.displayedUsers
        .filter(u => u.uid && this.canSelectUser(u))
        .forEach(u => this.selectedUsers.add(u.uid!));
    }
  }

  /**
   * Limpia la selección
   */
  clearSelection() {
    this.selectedUsers.clear();
  }

  /**
   * Elimina los usuarios seleccionados
   */
  async deleteSelectedUsers() {
    if (this.selectedUsers.size === 0) {
      this.snackBar.open('No hay usuarios seleccionados', 'Cerrar', { duration: 3000 });
      return;
    }

    const selectedCount = this.selectedUsers.size;
    const selectedUsersList = this.users.filter(u => 
      u.uid && this.selectedUsers.has(u.uid)
    );

    // Abrir dialog de confirmación genérico para eliminación múltiple
    const dialogRef = this.dialog.open(GenericDeleteMultipleDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        entities: selectedUsersList.map(adaptUserToGenericEntity),
        count: selectedCount,
        config: ADMIN_USERS_CONFIG
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        await this.performBulkDeletion(Array.from(this.selectedUsers));
      }
    });
  }

  /**
   * Ejecuta la eliminación masiva
   */
  private async performBulkDeletion(uids: string[]) {
    this.isLoading = true;
    this.cdr.markForCheck();

    const loadingSnackBar = this.snackBar.open(
      `Eliminando ${uids.length} usuario(s)...`,
      '',
      { duration: 0 }
    );

    try {
      const result = await this.adminService.deleteMultipleUsers(uids);

      loadingSnackBar.dismiss();

      if (result.success) {
        this.snackBar.open(
          `✅ ${result.message}`,
          'Cerrar',
          {
            duration: 6000,
            panelClass: ['success-snackbar']
          }
        );

        // Limpiar selección
        this.clearSelection();

        // Refrescar datos
        await this.refreshData();
      } else {
        // Mostrar errores
        let errorMessage = `❌ ${result.message}`;

        if (result.errors && result.errors.length > 0) {
          errorMessage += `\n\nErrores:\n${result.errors.slice(0, 3).join('\n')}`;

          if (result.errors.length > 3) {
            errorMessage += `\n... y ${result.errors.length - 3} más`;
          }
        }

        this.snackBar.open(
          errorMessage,
          'Cerrar',
          {
            duration: 8000,
            panelClass: ['error-snackbar']
          }
        );

        console.error('❌ Error en eliminación masiva:', result);
      }

    } catch (error: any) {
      loadingSnackBar.dismiss();

      console.error('❌ Error inesperado en eliminación masiva:', error);

      this.snackBar.open(
        `❌ Error inesperado: ${error.message || 'No se pudieron eliminar los usuarios'}`,
        'Cerrar',
        {
          duration: 6000,
          panelClass: ['error-snackbar']
        }
      );
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck(); // ✅ Forzar detección de cambios
    }
  }

  // ============================================
  // MÉTODOS DE USUARIO
  // ============================================

  /**
   * ✅ NOTA: getUserInitials, formatDate, getRelativeTime, getAvatarColor
   * ahora son utilidades compartidas importadas desde shared/utils
   * Se exponen al template como readonly properties (líneas 92-95)
   */

  /**
   * Navega a notificaciones
   */
  goToNotifications() {
    this.snackBar.open('Centro de notificaciones - Próximamente', 'Cerrar', { duration: 2000 });
  }

  /**
   * Tracking
   */
  trackByUid(index: number, user: User): string {
    return user.uid || user.email;
  }

  /**
   * Obtiene el icono según el rol
   */
  getUserIcon(role: string): string {
    const icons: Record<string, string> = {
      admin: 'shield',
      user: 'person',
      viewer: 'visibility'
    };
    return icons[role] || 'person';
  }

  getRoleIcon(role: string): string {
    return this.getUserIcon(role);
  }

  /**
   * Módulos del usuario
   */
  getUserModules(email: string): string[] {
    const user = this.users.find(u => u.email === email);
    return user?.modules || [];
  }

  /**
   * Nombre del módulo
   */
  getModuleName(moduleValue: string): string {
    const moduleOptions = this.adminService.getModuleOptions();
    const module = moduleOptions.find(m => m.value === moduleValue);
    
    const shortNames: { [key: string]: string } = {
      'dashboard': 'Dashboard',
      'user-management': 'Usuarios',
      'analytics': 'Analytics',
      'settings': 'Config',
      'notifications': 'Notif',
      'audit-logs': 'Logs'
    };
    
    return shortNames[moduleValue] || module?.label || moduleValue;
  }

  /**
   * Icono del módulo
   */
  getModuleIcon(moduleValue: string): string {
    const moduleOptions = this.adminService.getModuleOptions();
    const module = moduleOptions.find(m => m.value === moduleValue);
    return module?.icon || 'extension';
  }

  /**
   * ✅ NOTA: getUserAvatarColor eliminado - ahora usa getAvatarColor de shared/utils
   * Template usa: getAvatarColor(user.email)
   *
   * Nota: getAvatarColor retorna color hexadecimal, no linear-gradient.
   * Si necesitas gradientes, considera crear getUserAvatarGradient() específico.
   */

  // ============================================
  // ACCIONES DE USUARIO
  // ============================================

  /**
   * Agregar usuario
   */
  addUser() {
    const dialogRef = this.dialog.open(AddUserDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.refreshData();
      }
    });
  }

  /**
   * Ver detalles
   */
  viewUserDetails(user: User) {
    this.snackBar.open(`Detalles de ${user.displayName || user.email}`, 'Cerrar', {
      duration: 3000
    });
  }

  /**
   * Editar usuario - ACTUALIZADO CON DIALOG DE ROLES
   */
  editUser(user: User) {

    const dialogRef = this.dialog.open(EditUserRoleDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      disableClose: true,
      data: { user }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.success) {
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 4000,
          panelClass: ['success-snackbar']
        });

        // Recargar datos para reflejar los cambios
        await this.refreshData();
      }
    });
  }

  /**
   * Reset password
   */
  async resetUserPassword(user: User) {
    const result = await this.adminService.resetUserPassword(user.email);
    this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
  }

  /**
   * Toggle status
   */
  async toggleUserStatus(user: User) {
    if (!user.uid) return;
    
    const result = await this.adminService.toggleUserStatus(user.uid);
    this.snackBar.open(result.message, 'Cerrar', { duration: 3000 });
    
    if (result.success) {
      await this.refreshData();
    }
  }

  /**
   * Asignar módulos - ACTUALIZADO CON DIALOG
   */
  assignModules(user: User) {
    const dialogRef = this.dialog.open(AssignModulesDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      disableClose: true,
      data: { user }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.success) {
        this.snackBar.open(result.message, 'Cerrar', { 
          duration: 4000,
          panelClass: ['success-snackbar']
        });
        
        // Recargar datos para reflejar los cambios
        await this.refreshData();
      } else if (result?.navigateToModules) {
        // Si el usuario quiere ir a configurar módulos
        this.router.navigate(['/admin/modules']);
      }
    });
  }

  /**
   * Elimina un usuario del sistema con confirmación
   */
  async deleteUser(user: User) {
    // Validaciones previas antes de abrir el dialog
    if (!user.uid) {
      this.snackBar.open('Error: Usuario sin UID válido', 'Cerrar', { 
        duration: 3000 
      });
      return;
    }

    // Prevenir auto-eliminación
    if (this.currentUser()?.email === user.email) {
      this.snackBar.open('❌ No puedes eliminar tu propia cuenta', 'Cerrar', { 
        duration: 4000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Advertencia especial para administradores
    if (user.role === 'admin') {
      const adminCount = this.users.filter(u => u.role === 'admin').length;
      
      if (adminCount === 1) {
        this.snackBar.open('❌ No puedes eliminar el último administrador', 'Cerrar', { 
          duration: 4000,
          panelClass: ['error-snackbar']
        });
        return;
      }
    }

    // Abrir dialog de confirmación genérico
    const dialogRef = this.dialog.open(GenericDeleteDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        entity: adaptUserToGenericEntity(user),
        config: ADMIN_USERS_CONFIG
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        await this.performUserDeletion(user);
      }
    });
  }

  /**
   * Ejecuta la eliminación del usuario
   */
  private async performUserDeletion(user: User) {
    this.isLoading = true;
    this.cdr.markForCheck();

    const loadingSnackBar = this.snackBar.open(
      `Eliminando usuario ${user.displayName}...`,
      '',
      { duration: 0 }
    );

    try {
      // Llamar al servicio de eliminación
      const result = await this.adminService.deleteUser(user.uid!);

      loadingSnackBar.dismiss();

      if (result.success) {
        // Mostrar mensaje de éxito
        this.snackBar.open(
          `✅ ${result.message}`,
          'Cerrar',
          {
            duration: 5000,
            panelClass: ['success-snackbar']
          }
        );

        // Refrescar los datos
        await this.refreshData();
      } else {
        // Mostrar mensaje de error
        this.snackBar.open(
          `❌ ${result.message}`,
          'Cerrar',
          {
            duration: 5000,
            panelClass: ['error-snackbar']
          }
        );

        console.error('❌ Error en eliminación:', result.message);
      }

    } catch (error: any) {
      loadingSnackBar.dismiss();

      console.error('❌ Error inesperado al eliminar usuario:', error);

      this.snackBar.open(
        `❌ Error inesperado: ${error.message || 'No se pudo eliminar el usuario'}`,
        'Cerrar',
        {
          duration: 5000,
          panelClass: ['error-snackbar']
        }
      );
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck(); // ✅ Forzar detección de cambios
    }
  }

  /**
   * Exportar datos
   */
  async exportData() {
    try {
      const result = await this.adminService.exportUsers();
      
      if (result.success && result.data) {
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `usuarios_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.snackBar.open(result.message, 'Cerrar', { duration: 3000 });
      }
    } catch (error) {
      this.snackBar.open('Error al exportar', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Gestionar roles del sistema
   */
  manageRoles() {
    this.router.navigate(['/admin/roles']);
  }

  /**
   * Gestionar módulos del sistema
   */
  manageModules() {
    this.router.navigate(['/admin/modules']);
  }

  /**
   * Ver logs del sistema
   */
  viewLogs() {
    this.router.navigate(['/admin/logs']);
  }

  /**
   * Configuración del sistema
   */
  goToSystemConfig() {
    this.router.navigate(['/admin/config']);
  }

  /**
   * Información de la empresa
   */
  goToBusinessInfo() {
    this.router.navigate(['/admin/business']);
  }

  /**
   * ACTUALIZADO: Método existente con nueva navegación
   */
  systemSettings() {
    this.goToSystemConfig();
  }
}