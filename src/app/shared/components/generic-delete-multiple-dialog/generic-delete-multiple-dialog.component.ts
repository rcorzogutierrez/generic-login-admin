import { Component, Inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GenericDeleteMultipleDialogData, GenericEntity, GenericFieldConfig } from '../../models/generic-entity.interface';
import { validateConfirmation } from '../../utils/confirmation.utils';

/**
 * Componente genérico para confirmar eliminación múltiple
 * Muestra tabla con datos adicionales de las entidades a eliminar
 *
 * @example
 * const dialogRef = this.dialog.open(GenericDeleteMultipleDialogComponent, {
 *   data: {
 *     entities: selectedProductos,
 *     count: selectedProductos.length,
 *     config: this.moduleConfig
 *   },
 *   width: '800px'
 * });
 */
@Component({
  selector: 'app-generic-delete-multiple-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './generic-delete-multiple-dialog.component.html',
  styleUrls: ['./generic-delete-multiple-dialog.component.css']
})
export class GenericDeleteMultipleDialogComponent<T extends GenericEntity = GenericEntity> {
  confirmationText = '';
  isDeleting = false;

  // Computed para obtener los campos a mostrar en la tabla
  fieldsToShow = computed(() => {
    const count = this.data.config.deleteDialogFieldsCount || 3;
    const fields = this.data.config.fields.filter(f =>
      f.showInDelete !== false && !f.isDefault
    );
    return fields.slice(0, count);
  });

  constructor(
    public dialogRef: MatDialogRef<GenericDeleteMultipleDialogComponent<T>>,
    @Inject(MAT_DIALOG_DATA) public data: GenericDeleteMultipleDialogData<T>
  ) {}

  /**
   * Obtiene el valor de un campo para una entidad
   */
  getFieldValue(entity: T, fieldName: string): any {
    const entityObj = entity as any;
    if (fieldName in entityObj) {
      return entityObj[fieldName];
    }
    return entityObj.customFields?.[fieldName];
  }

  /**
   * Formatea un valor según el tipo de campo
   */
  formatFieldValue(value: any, field: GenericFieldConfig): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    // Si hay función de formateo personalizada
    if (field.format) {
      return field.format(value);
    }

    switch (field.type) {
      case 'date':
        return new Date(value).toLocaleDateString();

      case 'datetime':
        return new Date(value).toLocaleString();

      case 'checkbox':
        return value ? 'Sí' : 'No';

      case 'currency':
        return new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: 'USD'
        }).format(value);

      case 'select':
        if (field.options) {
          const option = field.options.find(opt => opt.value === value);
          return option ? option.label : String(value);
        }
        return String(value);

      case 'multiselect':
        if (Array.isArray(value) && field.options) {
          const options = field.options;
          const labels = value.map(val => {
            const option = options.find(opt => opt.value === val);
            return option ? option.label : val;
          });
          return labels.join(', ');
        }
        return String(value);

      case 'dictionary':
        if (typeof value === 'object' && value !== null) {
          const entries = Object.entries(value);
          if (entries.length === 0) return '-';

          const fieldOptions = field.options;
          const display = entries.slice(0, 2).map(([key, val]) => {
            let displayKey = key;
            if (fieldOptions) {
              const option = fieldOptions.find(opt => opt.value === key);
              if (option) displayKey = option.label;
            }
            return `${displayKey}: ${val}`;
          }).join(', ');
          return entries.length > 2 ? `${display}, ...` : display;
        }
        return String(value);

      default:
        return String(value);
    }
  }

  /**
   * Obtiene el valor formateado de un campo para una entidad
   */
  getCustomFieldValue(entity: T, field: GenericFieldConfig): string {
    const value = this.getFieldValue(entity, field.name);
    return this.formatFieldValue(value, field);
  }

  canConfirm(): boolean {
    return validateConfirmation(this.confirmationText, 'ELIMINAR');
  }

  onConfirm(): void {
    if (this.canConfirm() && !this.isDeleting) {
      this.isDeleting = true;
      this.dialogRef.close({ confirmed: true });
    }
  }

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }
}
