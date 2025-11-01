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
      console.log('❌ No hay configuración de campos');
      return [];
    }

    // Filtrar campos que sean personalizados (no default) y que estén activos
    const customFields = config.fields.filter(field =>
      !field.isDefault && field.isActive
    );

    console.log('🔍 Total campos custom activos:', customFields.length);
    console.log('📋 Campos custom:', customFields.map(f => ({ id: f.id, label: f.label, isActive: f.isActive, isDefault: f.isDefault })));

    // Tomar los primeros 3 para mostrar en cada cliente
    const fieldsToShow = customFields.slice(0, 3);
    console.log('✅ Mostrando:', fieldsToShow.map(f => f.label));

    return fieldsToShow;
  });

  constructor(
    public dialogRef: MatDialogRef<DeleteMultipleClientsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteMultipleClientsDialogData
  ) {
    console.log('🚀 DeleteMultipleClientsDialogComponent constructor');
    console.log('📦 Clientes recibidos:', this.data.clients);
    console.log('🔧 Config service:', this.configService);
    console.log('⚙️ Config actual:', this.configService.config());

    // Log de los primeros clientes con sus customFields
    if (this.data.clients.length > 0) {
      console.log('👤 Primer cliente completo:', this.data.clients[0]);
      console.log('📝 customFields del primer cliente:', this.data.clients[0].customFields);
    }
  }

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

  getCustomFieldValue(client: Client, field: FieldConfig): any {
    // Usar field.name como clave en customFields (no field.id)
    const value = client.customFields?.[field.name];
    console.log(`🔎 Buscando valor para campo ${field.name} (id: ${field.id}) en cliente ${client.id}:`, value);
    return value !== undefined && value !== null && value !== '' ? value : '-';
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
