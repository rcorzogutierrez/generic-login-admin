// src/app/modules/materials/components/material-config/material-config.component.ts
import { Component, OnInit, effect, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialsConfigService } from '../../services/materials-config.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FieldConfig } from '../../../../modules/clients/models';
import { FormLayoutConfig } from '../../../../modules/clients/models/client-module-config.interface';
import { FormDesignerComponent } from '../../../../shared/modules/dynamic-form-builder';

@Component({
  selector: 'app-material-config',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    FormDesignerComponent
  ],
  templateUrl: './material-config.component.html',
  styleUrl: './material-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaterialConfigComponent implements OnInit {
  // Hacer configService público para que pueda ser pasado al template
  configService = inject(MaterialsConfigService);
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

      // Validar que exista al menos un campo obligatorio
      const activeFields = this.configService.getActiveFields();
      const hasRequiredField = activeFields.some(field => field.validation?.required === true);

      if (!hasRequiredField) {

        this.snackBar.open('⚠️ Debes tener al menos un campo obligatorio en el formulario', 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['snackbar-warning']
        });
        return;
      }

      await this.configService.saveFormLayout(layout);

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
   * Vuelve a la lista de materiales
   */
  goBack() {
    this.router.navigate(['/modules/materials']);
  }

  /**
   * Tracking para @for
   */
  trackByFieldId(index: number, field: FieldConfig): string {
    return field.id;
  }
}
