// src/app/modules/clients/components/client-config/client-config.component.ts
import { Component, OnInit, effect, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { ClientConfigServiceRefactored } from '../../services/client-config-refactored.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FieldConfig, FieldType } from '../../models';
import { FormLayoutConfig, GridConfiguration } from '../../models/client-module-config.interface';
// Importar componentes compartidos del módulo dynamic-form-builder
import { FormDesignerComponent, FieldConfigDialogComponent } from '../../../../shared/modules/dynamic-form-builder';

@Component({
  selector: 'app-client-config',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDividerModule,
    MatChipsModule,
    MatTabsModule,
    MatSlideToggleModule,
    DragDropModule,
    FormDesignerComponent
  ],
  templateUrl: './client-config.component.html',
  styleUrl: './client-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientConfigComponent implements OnInit {
  // Hacer configService público para que pueda ser pasado al template
  configService = inject(ClientConfigServiceRefactored);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
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

  // Grid configuration como computed signal para mejor reactividad
  gridConfig = computed(() => this.configService.config()?.gridConfig);

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
   * Abre el dialog para editar un campo
   */
  editField(field: FieldConfig) {
    const dialogRef = this.dialog.open(FieldConfigDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: true,
      data: {
        mode: 'edit',
        field,
        configService: this.configService,
        moduleName: 'clientes'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
        // Recargar configuración después de editar
        this.loadConfig();
      }
    });
  }

  /**
   * Elimina un campo personalizado
   */
  async deleteField(field: FieldConfig) {
    if (field.isSystem) {
      this.snackBar.open('No se pueden eliminar campos del sistema', 'Cerrar', { duration: 3000 });
      return;
    }

    const confirm = window.confirm(
      `¿Estás seguro de eliminar el campo "${field.label}"?\n\nEsta acción no se puede deshacer y los datos existentes se perderán.`
    );

    if (!confirm) return;

    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      await this.configService.deleteField(field.id);
      this.snackBar.open('Campo eliminado exitosamente', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error eliminando campo:', error);
      this.snackBar.open('Error al eliminar el campo', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Toggle del estado activo/inactivo de un campo
   */
  async toggleFieldStatus(field: FieldConfig) {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      await this.configService.toggleFieldActive(field.id, !field.isActive);
      this.snackBar.open(
        `Campo ${!field.isActive ? 'activado' : 'desactivado'}`,
        'Cerrar',
        { duration: 2000 }
      );
    } catch (error) {
      console.error('Error cambiando estado:', error);
      this.snackBar.open('Error al cambiar el estado del campo', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Toggle de visibilidad en el grid
   */
  async toggleGridVisibility(field: FieldConfig) {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      await this.configService.updateField(field.id, {
        gridConfig: {
          ...field.gridConfig,
          showInGrid: !field.gridConfig.showInGrid
        }
      });
      this.snackBar.open(
        `Campo ${!field.gridConfig.showInGrid ? 'visible' : 'oculto'} en tabla`,
        'Cerrar',
        { duration: 2000 }
      );
    } catch (error) {
      console.error('Error cambiando visibilidad:', error);
      this.snackBar.open('Error al cambiar la visibilidad', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Maneja el reordenamiento drag & drop
   */
  async onFieldDrop(event: CdkDragDrop<FieldConfig[]>) {
    if (event.previousIndex === event.currentIndex) return;

    const fieldsCopy = [...this.fields];
    moveItemInArray(fieldsCopy, event.previousIndex, event.currentIndex);

    // Actualizar orden localmente
    this.fields = fieldsCopy;
    this.cdr.markForCheck();

    // Guardar en Firestore
    const fieldIds = fieldsCopy.map(f => f.id);

    try {
      await this.configService.reorderFields(fieldIds);
      this.snackBar.open('Orden actualizado', '', { duration: 2000 });
    } catch (error) {
      console.error('Error reordenando campos:', error);
      this.snackBar.open('Error al guardar el orden', 'Cerrar', { duration: 3000 });
      await this.loadConfig(); // Recargar si falla
    }
  }

  /**
   * Obtiene el icono según el tipo de campo
   */
  getFieldTypeIcon(type: FieldType): string {
    const icons: Record<FieldType, string> = {
      [FieldType.TEXT]: 'text_fields',
      [FieldType.NUMBER]: 'numbers',
      [FieldType.EMAIL]: 'email',
      [FieldType.PHONE]: 'phone',
      [FieldType.SELECT]: 'arrow_drop_down_circle',
      [FieldType.MULTISELECT]: 'checklist',
      [FieldType.DICTIONARY]: 'list_alt',
      [FieldType.DATE]: 'calendar_today',
      [FieldType.DATETIME]: 'event',
      [FieldType.CHECKBOX]: 'check_box',
      [FieldType.TEXTAREA]: 'notes',
      [FieldType.URL]: 'link',
      [FieldType.CURRENCY]: 'attach_money'
    };
    return icons[type] || 'help_outline';
  }

  /**
   * Obtiene el label legible del tipo
   */
  getFieldTypeLabel(type: FieldType): string {
    const labels: Record<FieldType, string> = {
      [FieldType.TEXT]: 'Texto',
      [FieldType.NUMBER]: 'Número',
      [FieldType.EMAIL]: 'Email',
      [FieldType.PHONE]: 'Teléfono',
      [FieldType.SELECT]: 'Selector',
      [FieldType.MULTISELECT]: 'Multi-selector',
      [FieldType.DICTIONARY]: 'Diccionario',
      [FieldType.DATE]: 'Fecha',
      [FieldType.DATETIME]: 'Fecha/Hora',
      [FieldType.CHECKBOX]: 'Casilla',
      [FieldType.TEXTAREA]: 'Área de texto',
      [FieldType.URL]: 'URL',
      [FieldType.CURRENCY]: 'Moneda'
    };
    return labels[type] || type;
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
   * Actualiza una configuración del grid
   */
  async updateGridConfig(key: keyof GridConfiguration, value: any) {
    try {
      const currentConfig = this.configService.config();
      if (!currentConfig || !currentConfig.gridConfig) return;

      const updatedConfig = {
        ...currentConfig,
        gridConfig: {
          ...currentConfig.gridConfig,
          [key]: value
        }
      };

      await this.configService.updateConfig(updatedConfig);

      this.snackBar.open('✅ Configuración actualizada correctamente', '', {
        duration: 2000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error actualizando configuración del grid:', error);
      this.snackBar.open('❌ Error al actualizar la configuración', '', {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Vuelve a la lista de clientes
   */
  goBack() {
    this.router.navigate(['/modules/clients']);
  }

  /**
   * Tracking para @for
   */
  trackByFieldId(index: number, field: FieldConfig): string {
    return field.id;
  }
}
