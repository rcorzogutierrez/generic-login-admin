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
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { ClientConfigService } from '../../services/client-config.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FieldConfig, FieldType } from '../../models';
import { FormLayoutConfig } from '../../models/client-module-config.interface';
import { FieldConfigDialogComponent } from '../field-config-dialog/field-config-dialog.component';
import { FormDesignerComponent } from '../form-designer/form-designer.component';

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
    DragDropModule,
    FormDesignerComponent
  ],
  templateUrl: './client-config.component.html',
  styleUrl: './client-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientConfigComponent implements OnInit {
  private configService = inject(ClientConfigService);
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
   * Abre el dialog para agregar un campo nuevo
   */
  addField() {
    const dialogRef = this.dialog.open(FieldConfigDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
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
   * Abre el dialog para editar un campo
   */
  editField(field: FieldConfig) {
    const dialogRef = this.dialog.open(FieldConfigDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: true,
      data: { mode: 'edit', field }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
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
      console.log('Layout changed:', layout);

      await this.configService.updateFormLayout(layout);

      this.snackBar.open('✅ Diseño del formulario guardado correctamente', '', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error guardando layout:', error);
      this.snackBar.open('❌ Error al guardar el diseño del formulario', '', {
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
    this.router.navigate(['/clients']);
  }

  /**
   * Tracking para @for
   */
  trackByFieldId(index: number, field: FieldConfig): string {
    return field.id;
  }
}
