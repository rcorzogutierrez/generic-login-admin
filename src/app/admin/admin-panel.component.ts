// src/app/admin/admin-panel.component.ts - USANDO SOLO DATOS REALES DE FIREBASE
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatChipsModule,
    MatMenuModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css'],
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  currentUser = this.authService.authorizedUser;
  
  // Stats del dashboard - DATOS REALES
  totalUsers = 0;
  activeUsers = 0;
  totalModules = 0;
  adminUsers = 0;

  // Usuarios reales desde Firebase
  users: User[] = [];
  displayedUsers: User[] = []; // Para paginación en la tabla
  
  // Control de carga
  isLoading = false;
  
  // Configuración de tabla
  displayedColumns: string[] = [
    'email',
    'role',
    'status',
    'modules',
    'lastLogin',
    'actions',
  ];

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
    
    // Cargar datos iniciales
    await this.loadData();
    
    // Suscribirse a cambios en usuarios
    this.subscriptions.add(
      this.adminService.users$.subscribe(users => {
        this.users = users;
        this.updateDisplayedUsers();
        console.log('👥 Usuarios actualizados desde Firebase:', users.length);
      })
    );
    
    this.isLoading = false;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  /**
   * Cargar todos los datos del panel desde Firebase
   */
  private async loadData() {
    try {
      // Cargar usuarios
      await this.adminService.loadUsers();
      
      // Cargar estadísticas
      const stats = await this.adminService.getAdminStats();
      this.totalUsers = stats.totalUsers;
      this.activeUsers = stats.activeUsers;
      this.totalModules = stats.totalModules;
      this.adminUsers = stats.adminUsers;
      
      console.log('📊 Estadísticas cargadas:', stats);
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      this.snackBar.open('Error cargando datos del panel', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }

  /**
   * Actualizar usuarios mostrados en la tabla (primeros 5)
   */
  private updateDisplayedUsers() {
    // Mostrar los 5 usuarios más recientes
    this.displayedUsers = this.users.slice(0, 5);
  }

  /**
   * Cargar más usuarios en la tabla
   */
  loadMoreUsers() {
    console.log('📄 Cargando más usuarios...');
    
    const currentLength = this.displayedUsers.length;
    const nextBatch = this.users.slice(0, Math.min(currentLength + 5, this.users.length));
    
    if (nextBatch.length > this.displayedUsers.length) {
      this.displayedUsers = nextBatch;
      this.snackBar.open(`Mostrando ${this.displayedUsers.length} de ${this.users.length} usuarios`, 'Cerrar', { 
        duration: 2000 
      });
    } else {
      this.snackBar.open('Todos los usuarios están siendo mostrados', 'Cerrar', { 
        duration: 2000 
      });
    }
  }

  /**
   * Refrescar datos del panel
   */
  async refreshData() {
    console.log('🔄 Refrescando datos del panel...');
    this.isLoading = true;
    
    try {
      await this.loadData();
      this.snackBar.open('Datos actualizados correctamente', 'Cerrar', { 
        duration: 2000,
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      this.snackBar.open('Error al actualizar datos', 'Cerrar', { 
        duration: 2000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading = false;
    }
  }

  // ===== TRACKING Y UTILIDADES =====

  trackByUid(index: number, user: User): string {
    return user.uid || user.email;
  }

  trackByEmail(index: number, user: User): string {
    return user.email;
  }

  // ===== MÉTODOS PARA UI =====

  /**
   * Obtiene el icono según el rol
   */
  getUserIcon(role: string): string {
    switch (role) {
      case 'admin': return 'shield';
      case 'user': return 'person';
      case 'viewer': return 'visibility';
      default: return 'person';
    }
  }

  /**
   * Obtiene icono según el rol
   */
  getRoleIcon(role: string): string {
    return this.getUserIcon(role);
  }

  /**
   * Obtiene el color del rol
   */
  getRoleColor(role: string): string {
    switch (role) {
      case 'admin': return 'warn';
      case 'user': return 'primary';
      case 'viewer': return 'accent';
      default: return '';
    }
  }

  /**
   * Formatea la fecha de forma legible
   */
  formatDate(date: Date | null | undefined): string {
    if (!date) return 'Nunca';

    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Hace pocos minutos';
    } else if (diffHours < 24) {
      return `Hace ${diffHours} horas`;
    } else {
      const days = Math.floor(diffHours / 24);
      if (days === 1) return 'Ayer';
      if (days < 7) return `Hace ${days} días`;
      return new Date(date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  }

  /**
   * Obtiene tiempo relativo corto
   */
  getRelativeTime(date: Date | null | undefined): string {
    if (!date) return '';

    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 5) {
      return 'Ahora';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}h`;
    } else {
      return `${Math.floor(diffMinutes / 1440)}d`;
    }
  }

  // ===== MÉTODOS PARA MÓDULOS =====

  /**
   * Obtiene los módulos asignados a un usuario
   */
  getUserModules(email: string): string[] {
    const user = this.users.find(u => u.email === email);
    return user?.modules || [];
  }

  /**
   * Obtiene el nombre corto de un módulo
   */
  getModuleName(moduleValue: string): string {
    const moduleOptions = this.adminService.getModuleOptions();
    const module = moduleOptions.find(m => m.value === moduleValue);
    
    if (module) {
      // Versión corta para la tabla
      const shortNames: { [key: string]: string } = {
        'dashboard': 'Dashboard',
        'user-management': 'Usuarios',
        'analytics': 'Analytics',
        'settings': 'Config',
        'notifications': 'Notif',
        'audit-logs': 'Logs'
      };
      return shortNames[moduleValue] || module.label;
    }
    
    return moduleValue;
  }

  /**
   * Obtiene el icono de un módulo
   */
  getModuleIcon(moduleValue: string): string {
    const moduleOptions = this.adminService.getModuleOptions();
    const module = moduleOptions.find(m => m.value === moduleValue);
    return module?.icon || 'extension';
  }

  /**
   * Obtiene el color del avatar basado en el email
   */
  getUserAvatarColor(email: string): string {
    const colors = [
      'linear-gradient(135deg, #ef4444, #dc2626)',
      'linear-gradient(135deg, #f97316, #ea580c)',
      'linear-gradient(135deg, #eab308, #ca8a04)',
      'linear-gradient(135deg, #22c55e, #16a34a)',
      'linear-gradient(135deg, #06b6d4, #0891b2)',
      'linear-gradient(135deg, #3b82f6, #2563eb)',
      'linear-gradient(135deg, #6366f1, #4f46e5)',
      'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'linear-gradient(135deg, #ec4899, #db2777)'
    ];

    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Obtiene el nombre para mostrar de un usuario
   */
  getUserDisplayName(email: string): string {
    const user = this.users.find(u => u.email === email);
    return user?.displayName || email.split('@')[0];
  }

  /**
   * Obtiene módulos más populares
   */
  getPopularModules(): { name: string; icon: string }[] {
    if (this.users.length === 0) return [];

    // Contar frecuencia de módulos
    const moduleFrequency: { [key: string]: number } = {};
    this.users.forEach(user => {
      user.modules?.forEach(module => {
        moduleFrequency[module] = (moduleFrequency[module] || 0) + 1;
      });
    });

    // Obtener los 3 más populares
    const sortedModules = Object.entries(moduleFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    return sortedModules.map(([moduleValue]) => ({
      name: this.getModuleName(moduleValue),
      icon: this.getModuleIcon(moduleValue)
    }));
  }

  // ===== ACCIONES DE NAVEGACIÓN =====

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  async logout() {
    await this.authService.logout();
  }

  // ===== ACCIONES ADMINISTRATIVAS =====

  /**
   * Abrir dialog para agregar usuario
   */
  // En admin-panel.component.ts
addUser() {
  console.log('➕ Abriendo dialog para agregar usuario...');
  console.log('🔍 MatDialog está disponible:', !!this.dialog);
  console.log('🔍 AddUserDialogComponent:', AddUserDialogComponent);
  
  try {
    const dialogRef = this.dialog.open(AddUserDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      disableClose: true,
      panelClass: 'custom-dialog-container',
      autoFocus: false
    });
    
    console.log('✅ DialogRef creado:', !!dialogRef);
    console.log('🔍 DialogRef completo:', dialogRef);

    dialogRef.afterClosed().subscribe(result => {
      console.log('🔔 Dialog cerrado:', result);
      if (result?.success) {
        console.log('✅ Usuario creado:', result.user);
        this.refreshData();
      }
    });
  } catch (error) {
    console.error('❌ ERROR al abrir dialog:', error);
  }
}

  /**
   * Ver detalles completos de un usuario
   */
  viewUserDetails(user: User) {
    console.log('👁️ Ver detalles del usuario:', user.email);
    
    // TODO: Abrir dialog de detalles con información completa
    const details = `
      Email: ${user.email}
      Nombre: ${user.displayName}
      Rol: ${user.role}
      Estado: ${user.isActive ? 'Activo' : 'Inactivo'}
      Módulos: ${user.modules?.join(', ') || 'Ninguno'}
      Permisos: ${user.permissions?.join(', ') || 'Ninguno'}
      Creado: ${user.createdAt.toLocaleDateString('es-ES')}
      Último acceso: ${this.formatDate(user.lastLogin)}
    `;
    
    this.snackBar.open(details, 'Cerrar', { 
      duration: 5000 
    });
  }

  /**
   * Editar usuario existente
   */
  editUser(user: User) {
    console.log('✏️ Editar usuario:', user.email);
    
    // TODO: Abrir dialog de edición con datos del usuario
    this.snackBar.open(`Edición de usuario: ${user.displayName || user.email} - Próximamente`, 'Cerrar', { 
      duration: 3000 
    });
  }

  /**
   * Restablecer contraseña de usuario
   */
  async resetUserPassword(user: User) {
    console.log('🔐 Restablecer contraseña para:', user.email);
    
    try {
      const result = await this.adminService.resetUserPassword(user.email);
      
      if (result.success) {
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 4000,
          panelClass: ['success-snackbar']
        });
      } else {
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    } catch (error) {
      console.error('Error restableciendo contraseña:', error);
      this.snackBar.open('Error al enviar email de restablecimiento', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }

  /**
   * Cambiar estado activo/inactivo del usuario
   */
  async toggleUserStatus(user: User) {
    console.log('🔄 Cambiar estado usuario:', user.email);
    
    if (!user.uid) {
      this.snackBar.open('Error: Usuario sin ID', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    try {
      const result = await this.adminService.toggleUserStatus(user.uid);
      
      if (result.success) {
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        // Recargar datos para reflejar cambios
        await this.refreshData();
      } else {
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    } catch (error) {
      console.error('Error cambiando estado:', error);
      this.snackBar.open('Error al cambiar el estado del usuario', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }

  /**
   * Asignar módulos a un usuario
   */
  assignModules(user: User) {
    console.log('🧩 Asignar módulos a:', user.email);
    
    // TODO: Abrir dialog para gestionar módulos del usuario
    this.snackBar.open(`Gestión de módulos para ${user.displayName || user.email} - Próximamente`, 'Cerrar', { 
      duration: 3000 
    });
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

  /**
   * Exportar datos de usuarios
   */
  async exportData() {
    console.log('📥 Exportando datos de usuarios...');
    
    try {
      const result = await this.adminService.exportUsers();
      
      if (result.success && result.data) {
        // Crear y descargar archivo JSON
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
        
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      } else {
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    } catch (error) {
      console.error('Error exportando datos:', error);
      this.snackBar.open('Error al exportar los datos', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }
}