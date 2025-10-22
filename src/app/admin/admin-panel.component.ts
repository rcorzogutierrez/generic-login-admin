// src/app/admin/admin-panel.component.ts - VERSIÓN CON SIGNALS
import { Component, OnInit, effect } from '@angular/core';
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
import { DeleteUserDialogComponent } from './components/delete-user-dialog/delete-user-dialog.component';
import { DeleteMultipleUsersDialogComponent } from './components/delete-multiple-users-dialog/delete-multiple-users-dialog.component';
import { AssignModulesDialogComponent } from './components/assign-modules-dialog/assign-modules-dialog.component';
import { EditUserRoleDialogComponent } from './components/edit-user-role-dialog/edit-user-role-dialog.component';

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
})
export class AdminPanelComponent implements OnInit {
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

  constructor(
    private authService: AuthService, 
    private router: Router,
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    // ✅ Effect para reaccionar a cambios en users signal
    effect(() => {
      const users = this.adminService.users();
      this.users = users;
      this.applyFilters();
      console.log('👥 Usuarios actualizados:', users.length);
    });
  }

  async ngOnInit() {
    console.log('🔧 Panel Admin cargado para:', this.currentUser()?.email);
    
    this.isLoading = true;
    
    await this.loadData();
    
    this.isLoading = false;
  }

  /**
   * Cargar todos los datos
   */
  private async loadData() {
    try {
      await this.adminService.loadUsers();
      
      const stats = await this.adminService.getAdminStats();
      this.totalUsers = stats.totalUsers;
      this.activeUsers = stats.activeUsers;
      this.totalModules = stats.totalModules;
      this.adminUsers = stats.adminUsers;
      
      console.log('📊 Estadísticas cargadas:', stats);
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
    console.log('🔄 Refrescando datos...');
    this.isLoading = true;
    
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

    // Abrir dialog de confirmación para eliminación múltiple
    const dialogRef = this.dialog.open(DeleteMultipleUsersDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        users: selectedUsersList,
        count: selectedCount
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
    console.log('⚙️ Ejecutando eliminación masiva de', uids.length, 'usuarios');

    this.isLoading = true;
    
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

        console.log('✅ Eliminación masiva exitosa:', result);
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
    }
  }

  // ============================================
  // MÉTODOS DE USUARIO
  // ============================================

  /**
   * Obtiene iniciales del usuario
   */
  getUserInitials(): string {
    const name = this.currentUser()?.displayName || '';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  /**
   * Navega a notificaciones
   */
  goToNotifications() {
    console.log('🔔 Notificaciones...');
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
   * Formatea fecha
   */
  formatDate(date: Date | null | undefined): string {
    if (!date) return 'Nunca';

    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Hace pocos minutos';
    } else if (diffHours < 24) {
      return `Hace ${diffHours}h`;
    } else {
      const days = Math.floor(diffHours / 24);
      if (days === 1) return 'Ayer';
      if (days < 7) return `Hace ${days}d`;
      return new Date(date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short'
      });
    }
  }

  /**
   * Tiempo relativo
   */
  getRelativeTime(date: Date | null | undefined): string {
    if (!date) return '';

    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 5) return 'Ahora';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
    return `${Math.floor(diffMinutes / 1440)}d`;
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
   * Color del avatar
   */
  getUserAvatarColor(email: string): string {
    const colors = [
      'linear-gradient(135deg, #3b82f6, #2563eb)',
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #ef4444, #dc2626)',
      'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'linear-gradient(135deg, #06b6d4, #0891b2)',
      'linear-gradient(135deg, #ec4899, #db2777)'
    ];

    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  // ============================================
  // ACCIONES DE USUARIO
  // ============================================

  /**
   * Agregar usuario
   */
  addUser() {
    console.log('➕ Abriendo dialog...');
    
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
    console.log('👁️ Ver detalles:', user.email);
    this.snackBar.open(`Detalles de ${user.displayName || user.email}`, 'Cerrar', { 
      duration: 3000 
    });
  }

  /**
   * Editar usuario - ACTUALIZADO CON DIALOG DE ROLES
   */
  editUser(user: User) {
    console.log('✏️ Abriendo edición de rol para:', user.email);

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
    console.log('🧩 Abriendo dialog de módulos para:', user.email);
    
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
    console.log('🗑️ Iniciando proceso de eliminación:', user.email);

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

    // Abrir dialog de confirmación
    const dialogRef = this.dialog.open(DeleteUserDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        user: user,
        currentUserEmail: this.currentUser()?.email
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        await this.performUserDeletion(user);
      } else {
        console.log('❌ Eliminación cancelada por el usuario');
      }
    });
  }

  /**
   * Ejecuta la eliminación del usuario
   */
  private async performUserDeletion(user: User) {
    console.log('⚙️ Ejecutando eliminación de:', user.email);

    // Mostrar loading
    this.isLoading = true;
    
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

        console.log('✅ Usuario eliminado exitosamente:', user.email);
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
    }
  }

  /**
   * Exportar datos
   */
  async exportData() {
    console.log('📥 Exportando...');
    
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
    console.log('👥 Gestionar roles del sistema...');
    this.snackBar.open('Selecciona un usuario de la lista para gestionar su rol y permisos', 'Cerrar', {
      duration: 4000
    });
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
    console.log('📋 Navegando a logs del sistema...');
    this.router.navigate(['/admin/logs']);
  }

  /**
   * Configuración del sistema
   */
  goToSystemConfig() {
    console.log('⚙️ Navegando a configuración del sistema...');
    this.router.navigate(['/admin/config']);
  }

  /**
   * ACTUALIZADO: Método existente con nueva navegación
   */
  systemSettings() {
    this.goToSystemConfig();
  }
}