// src/app/admin/admin-panel.component.ts - VERSIÓN OPTIMIZADA
import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { Subscription } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { AdminService, User, AdminStats } from './services/admin.service';
import { AddUserDialogComponent } from './components/add-user-dialog/add-user-dialog.component';

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
  styleUrls: ['./admin-panel.component.css'],
})
export class AdminPanelComponent implements OnInit, OnDestroy {
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

  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService, 
    private router: Router,
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    console.log('🔧 Panel Admin cargado para:', this.currentUser()?.email);
    
    this.isLoading = true;
    
    await this.loadData();
    
    this.subscriptions.add(
      this.adminService.users$.subscribe(users => {
        this.users = users;
        this.applyFilters();
        console.log('👥 Usuarios actualizados:', users.length);
      })
    );
    
    this.isLoading = false;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
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
   * NUEVO: Aplicar filtros y búsqueda
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
   * NUEVO: Establecer filtro
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
   * NUEVO: Filtros rápidos desde stats
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
   * NUEVO: Búsqueda en tiempo real
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
   * Obtiene última sesión simplificada
   */
  getLastSession(): string {
    // Por ahora retornamos un valor simulado
    // TODO: Implementar lógica real desde Firebase
    return 'Hace 6 horas';
  }

  /**
   * Verifica si la sesión es reciente
   */
  isRecentSession(): boolean {
    // TODO: Implementar lógica real
    return true;
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

  /**
   * Navegación
   */
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  async logout() {
    await this.authService.logout();
  }

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
   * Editar usuario
   */
  editUser(user: User) {
    console.log('✏️ Editar:', user.email);
    this.snackBar.open('Edición - Próximamente', 'Cerrar', { duration: 2000 });
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
   * Asignar módulos
   */
  assignModules(user: User) {
    console.log('🧩 Asignar módulos:', user.email);
    this.snackBar.open('Gestión de módulos - Próximamente', 'Cerrar', { duration: 2000 });
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
    console.log('👥 Gestionar roles...');
    this.snackBar.open('Gestión de roles - Próximamente', 'Cerrar', { duration: 2000 });
  }

  /**
   * Gestionar módulos del sistema
   */
  manageModules() {
    console.log('🧩 Gestionar módulos del sistema...');
    this.snackBar.open('Gestión de módulos - Próximamente', 'Cerrar', { duration: 2000 });
  }

  /**
   * Ver logs del sistema
   */
  viewLogs() {
    console.log('📋 Ver logs del sistema...');
    this.snackBar.open('Logs del sistema - Próximamente', 'Cerrar', { duration: 2000 });
  }

  /**
   * Configuración del sistema
   */
  systemSettings() {
    console.log('⚙️ Configuración del sistema...');
    this.snackBar.open('Configuración del sistema - Próximamente', 'Cerrar', { duration: 2000 });
  }
}