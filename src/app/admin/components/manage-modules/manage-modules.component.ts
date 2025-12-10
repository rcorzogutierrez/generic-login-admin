// src/app/admin/components/manage-modules/manage-modules.component.ts
import { Component, OnInit, effect, inject, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { ModulesService } from '../../services/modules.service';
import { AuthService } from '../../../core/services/auth.service';
import { SystemModule } from '../../models/system-module.interface';
import { ModuleFormDialogComponent } from '../module-form-dialog/module-form-dialog.component';
import { DeleteModuleDialogComponent } from '../delete-module-dialog/delete-module-dialog.component';

@Component({
  selector: 'app-manage-modules',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './manage-modules.component.html',
  styleUrl: './manage-modules.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageModulesComponent implements OnInit {
  // ============================================
  // DEPENDENCY INJECTION (Angular 20 pattern)
  // ============================================
  private modulesService = inject(ModulesService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // ============================================
  // STATE
  // ============================================
  currentUser = this.authService.authorizedUser;
  modules: SystemModule[] = [];
  isLoading = false;

  // ============================================
  // COMPUTED SIGNALS (Angular 20)
  // ============================================

  /**
   * Cuenta de módulos activos en el sistema
   */
  readonly activeModulesCount = computed(() =>
    this.modules.filter(m => m.isActive).length
  );

  /**
   * Cuenta de módulos inactivos en el sistema
   */
  readonly inactiveModulesCount = computed(() =>
    this.modules.filter(m => !m.isActive).length
  );

  /**
   * Total de asignaciones de módulos a usuarios
   */
  readonly totalAssignments = computed(() =>
    this.modules.reduce((sum, m) => sum + (m.usersCount || 0), 0)
  );

  constructor() {
    // Effect para reaccionar a cambios en módulos
    effect(() => {
      const modules = this.modulesService.modules();
      this.modules = modules;
      this.cdr.markForCheck();
    });
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  async ngOnInit() {
    await this.loadModules();
  }

  /**
   * ✅ OPTIMIZADO: Carga los módulos solo cuando es necesario
   */
  async loadModules() {
    this.isLoading = true;
    this.cdr.markForCheck(); // ✅ Forzar detección de cambios para mostrar loading

    try {
      await this.modulesService.initialize();
    } catch (error) {
      console.error('Error cargando módulos:', error);
      this.snackBar.open('Error al cargar módulos', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck(); // ✅ Forzar detección de cambios para ocultar loading
    }
  }

  /**
   * Abre el dialog para crear un nuevo módulo
   *
   * Muestra el formulario modal de creación de módulo. Al cerrarse con éxito,
   * muestra un mensaje de confirmación.
   *
   * @example
   * ```typescript
   * this.addModule();
   * // Abre el dialog de creación
   * ```
   */
  addModule() {
    const dialogRef = this.dialog.open(ModuleFormDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      disableClose: true,
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
      }
    });
  }

  /**
   * Abre el dialog para editar módulo
   */
  editModule(module: SystemModule) {
    const dialogRef = this.dialog.open(ModuleFormDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      disableClose: true,
      data: { mode: 'edit', module }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
      }
    });
  }

  /**
   * Elimina un módulo
   */
  deleteModule(module: SystemModule) {
    const dialogRef = this.dialog.open(DeleteModuleDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: { module }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        await this.performModuleDeletion(module, result.hardDelete);
      }
    });
  }

  /**
   * Ejecuta la eliminación del módulo
   */
  private async performModuleDeletion(module: SystemModule, hardDelete: boolean) {
    this.isLoading = true;
    
    const loadingSnack = this.snackBar.open(
      `Eliminando módulo "${module.label}"...`,
      '',
      { duration: 0 }
    );

    try {
      const result = await this.modulesService.deleteModule(
        module.id,
        this.currentUser()?.uid || '',
        hardDelete
      );

      loadingSnack.dismiss();

      if (result.success) {
        this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
      } else {
        this.snackBar.open(result.message, 'Cerrar', { duration: 5000 });
      }
    } catch (error: any) {
      loadingSnack.dismiss();
      this.snackBar.open('Error al eliminar el módulo', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Toggle del estado activo/inactivo
   */
  async toggleModuleStatus(module: SystemModule) {
    this.isLoading = true;

    try {
      const result = await this.modulesService.updateModule(
        module.id,
        { isActive: !module.isActive },
        this.currentUser()?.uid || ''
      );

      if (result.success) {
        this.snackBar.open(
          `Módulo ${!module.isActive ? 'activado' : 'desactivado'}`,
          'Cerrar',
          { duration: 3000 }
        );
      } else {
        this.snackBar.open(result.message, 'Cerrar', { duration: 3000 });
      }
    } catch (error) {
      this.snackBar.open('Error al cambiar el estado', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Inicializa módulos por defecto (para migración)
   */
  async initializeDefaultModules() {
    if (this.modules.length > 0) {
      const confirm = window.confirm(
        '⚠️ Ya existen módulos en el sistema. ¿Seguro que quieres agregar los módulos por defecto?'
      );
      if (!confirm) return;
    }

    this.isLoading = true;
    
    try {
      await this.modulesService.initializeDefaultModules(
        this.currentUser()?.uid || ''
      );
      
      this.snackBar.open(
        'Módulos por defecto inicializados exitosamente',
        'Cerrar',
        { duration: 4000 }
      );
    } catch (error) {
      this.snackBar.open(
        'Error al inicializar módulos',
        'Cerrar',
        { duration: 3000 }
      );
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Vuelve al panel de admin
   */
  goBack() {
    this.router.navigate(['/admin']);
  }

  /**
   * Tracking para @for
   */
  trackByModuleId(index: number, module: SystemModule): string {
    return module.id;
  }
}