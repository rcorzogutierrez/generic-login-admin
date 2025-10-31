// src/app/modules/clients/components/delete-client-dialog/delete-client-dialog.component.ts

import { Component, Inject, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Client } from '../../models/client.interface';
import { validateConfirmation } from '../../../../shared/utils/confirmation.utils';
import { ClientConfigServiceRefactored } from '../../services/client-config-refactored.service';
import { FieldConfig } from '../../../../shared/modules/dynamic-form-builder/models/field-config.interface';

export interface DeleteClientDialogData {
  client: Client;
}

@Component({
  selector: 'app-delete-client-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './delete-client-dialog.component.html',
  styleUrl: './delete-client-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteClientDialogComponent {
  confirmationText = '';
  isDeleting = false;

  private configService = inject(ClientConfigServiceRefactored);

  // Computed signal para obtener los primeros 3 campos personalizados
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

    // Tomar los primeros 3
    const fieldsToShow = customFields.slice(0, 3);
    console.log('✅ Mostrando:', fieldsToShow.map(f => f.label));

    return fieldsToShow;
  });

  constructor(
    public dialogRef: MatDialogRef<DeleteClientDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteClientDialogData
  ) {}

  getInitials(): string {
    const name = this.data.client.name || '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getClientColor(): string {
    const email = this.data.client.email || this.data.client.name || '';

    // Return default color if no email or name
    if (!email) {
      return '#3b82f6';
    }

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

  getCustomFieldValue(fieldId: string): any {
    const value = this.data.client.customFields?.[fieldId];
    console.log(`🔎 Buscando valor para campo ${fieldId}:`, value);
    console.log('📦 customFields completo:', this.data.client.customFields);
    return value || '-';
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
