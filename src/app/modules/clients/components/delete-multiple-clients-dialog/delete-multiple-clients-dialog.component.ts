// src/app/modules/clients/components/delete-multiple-clients-dialog/delete-multiple-clients-dialog.component.ts

import { Component, Inject, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Client } from '../../models/client.interface';
import { validateConfirmation } from '../../../../shared/utils/confirmation.utils';
import { ClientConfigServiceRefactored } from '../../services/client-config-refactored.service';
import { FieldConfig } from '../../../../shared/modules/dynamic-form-builder/models/field-config.interface';

export interface DeleteMultipleClientsDialogData {
  clients: Client[];
  count: number;
}

@Component({
  selector: 'app-delete-multiple-clients-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './delete-multiple-clients-dialog.component.html',
  styleUrl: './delete-multiple-clients-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteMultipleClientsDialogComponent {
  confirmationText = '';
  isDeleting = false;

  private configService = inject(ClientConfigServiceRefactored);

  // Computed signal para obtener los campos personalizados a mostrar
  customFieldsToShow = computed(() => {
    const config = this.configService.config();
    if (!config?.fields) {
      return [];
    }

    // Filtrar campos que sean personalizados (no default) y que estén activos
    const customFields = config.fields.filter(field =>
      !field.isDefault && field.isActive
    );

    // Tomar los primeros 3 para mostrar en cada cliente
    return customFields.slice(0, 3);
  });

  constructor(
    public dialogRef: MatDialogRef<DeleteMultipleClientsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteMultipleClientsDialogData
  ) {}

  getClientInitials(client: Client): string {
    const name = client.name || 'NN';
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getClientColor(client: Client): string {
    const email = client.email || client.name || 'default';
    const colors = [
      '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
      '#10b981', '#06b6d4', '#6366f1', '#ef4444'
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Obtener valor del campo dinámicamente
   */
  getFieldValue(client: Client, fieldName: string): any {
    if (fieldName in client) {
      return (client as any)[fieldName];
    }
    return client.customFields?.[fieldName];
  }

  /**
   * Formatear valor del campo según su tipo
   */
  formatFieldValue(value: any, field: FieldConfig): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    const fieldType = field.type;

    switch (fieldType) {
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
        // Buscar el label correspondiente al value en las opciones
        if (field.options && Array.isArray(field.options)) {
          const option = field.options.find((opt: any) => opt.value === value);
          return option ? option.label : String(value);
        }
        return String(value);

      case 'multiselect':
        // Manejar múltiples valores
        if (Array.isArray(value) && field.options) {
          const labels = value.map((val: string) => {
            const option = field.options.find((opt: any) => opt.value === val);
            return option ? option.label : val;
          });
          return labels.join(', ');
        }
        return String(value);

      case 'dictionary':
        // Formatear objeto como pares clave-valor
        if (typeof value === 'object' && value !== null) {
          const entries = Object.entries(value);
          if (entries.length === 0) {
            return '-';
          }
          // Mostrar los primeros 2 pares clave-valor con labels
          const display = entries.slice(0, 2).map(([key, val]) => {
            // Buscar el label correspondiente al key en las opciones
            let displayKey = key;
            if (field.options && Array.isArray(field.options)) {
              const option = field.options.find((opt: any) => opt.value === key);
              if (option) {
                displayKey = option.label;
              }
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
   * Obtener valor formateado del campo personalizado
   */
  getCustomFieldValue(client: Client, field: FieldConfig): string {
    const value = this.getFieldValue(client, field.name);
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
