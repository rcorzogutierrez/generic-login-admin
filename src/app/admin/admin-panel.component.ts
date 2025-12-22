// src/app/admin/admin-panel.component.ts - SIMPLIFICADO: Hub de Administración
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { AuthService } from '../core/services/auth.service';
import { AdminService } from './services/admin.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPanelComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private adminService = inject(AdminService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  currentUser = this.authService.authorizedUser;

  // Stats del dashboard
  totalUsers = 0;
  activeUsers = 0;
  totalModules = 0;
  adminUsers = 0;

  // Control de carga
  isLoading = false;

  async ngOnInit() {
    this.isLoading = true;
    this.cdr.markForCheck();

    await this.loadData();

    this.isLoading = false;
    this.cdr.markForCheck();
  }

  /**
   * Cargar estadísticas del sistema
   */
  private async loadData() {
    try {
      await this.adminService.initialize();

      const stats = await this.adminService.getAdminStats();
      this.totalUsers = stats.totalUsers;
      this.activeUsers = stats.activeUsers;
      this.totalModules = stats.totalModules;
      this.adminUsers = stats.adminUsers;

      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.snackBar.open('Error cargando datos del panel', 'Cerrar', {
        duration: 3000
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
      this.snackBar.open('Datos actualizados', 'Cerrar', { duration: 2000 });
    } catch (error) {
      this.snackBar.open('Error al actualizar', 'Cerrar', { duration: 2000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  // ============================================
  // NAVEGACIÓN
  // ============================================

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Ir a gestión de usuarios
   */
  goToUsers() {
    this.router.navigate(['/admin/users']);
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
}
