// src/app/modules/workers/components/worker-config/worker-config.component.ts
import { Component, OnInit, effect, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { WorkersConfigService } from '../../services/workers-config.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FieldConfig } from '../../../../modules/clients/models';
import { FormLayoutConfig } from '../../../../modules/clients/models/client-module-config.interface';
import { FormDesignerComponent } from '../../../../shared/modules/dynamic-form-builder';

@Component({
  selector: 'app-worker-config',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    FormDesignerComponent
  ],
  templateUrl: './worker-config.component.html',
  styleUrl: './worker-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkerConfigComponent implements OnInit {
  // Hacer configService público para que pueda ser pasado al template
  configService = inject(WorkersConfigService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  currentUser = this.authService.authorizedUser;
  fields: FieldConfig[] = [];
  isLoading = false;

  // Form layout
  get formLayout(): FormLayoutConfig | undefined {
    return this.configService.getFormLayout();
  }

  // Stats
  get totalFields(): number {
    return this.fields.length;
  }

  get activeFields(): number {
    return this.fields.filter(f => f.isActive).length;
  }

  get customFields(): number {
    return this.fields.filter(f => !f.isSystem).length;
  }

  get systemFields(): number {
    return this.fields.filter(f => f.isSystem).length;
  }

  get gridColumns(): number {
    return this.fields.filter(f => f.gridConfig.showInGrid).length;
  }

  constructor() {
    // Effect para reaccionar a cambios en los campos
    effect(() => {
      const fields = this.configService.fields();
      this.fields = [...fields].sort((a, b) => a.formOrder - b.formOrder);
      this.cdr.markForCheck();
    });
  }

  async ngOnInit() {
    await this.loadConfig();
  }

  /**
   * Carga la configuración del módulo
   */
  async loadConfig() {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      await this.configService.loadConfig();
    } catch (error) {
      console.error('Error cargando configuración:', error);
      this.snackBar.open('Error al cargar la configuración', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Maneja cambios en el layout del formulario
   */
  async onLayoutChange(layout: FormLayoutConfig) {
    try {
      console.log('📥 WorkerConfigComponent.onLayoutChange() - Layout recibido:', layout);
      console.log('   Campos en layout:', Object.keys(layout.fields).length);
      console.log('   Columnas:', layout.columns);
      console.log('   Spacing:', layout.spacing);

      console.log('🔄 Llamando a configService.saveFormLayout()...');
      await this.configService.saveFormLayout(layout);
      console.log('✅ saveFormLayout() completado exitosamente');

      this.snackBar.open('✅ Diseño del formulario guardado correctamente', '', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error guardando layout:', error);
      this.snackBar.open('❌ Error al guardar el diseño del formulario', '', {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Maneja cuando se agrega un nuevo campo desde el diseñador
   */
  async onFieldAdded() {
    // Recargar la configuración para obtener el nuevo campo
    await this.loadConfig();
  }

  /**
   * Vuelve a la lista de trabajadores
   */
  goBack() {
    this.router.navigate(['/modules/workers']);
  }

  /**
   * Tracking para @for
   */
  trackByFieldId(index: number, field: FieldConfig): string {
    return field.id;
  }
}
