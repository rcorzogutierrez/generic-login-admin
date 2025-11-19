// src/app/modules/projects/components/proposal-config/proposal-config.component.ts

import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';

// Services
import { ProposalConfigService } from '../../services/proposal-config.service';
import { ClientsService } from '../../../clients/services/clients.service';
import { ClientConfigServiceRefactored } from '../../../clients/services/client-config-refactored.service';

// Models
import { ProposalAddressMapping } from '../../models';
import { FieldConfig } from '../../../clients/models/field-config.interface';

@Component({
  selector: 'app-proposal-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
    MatCardModule
  ],
  templateUrl: './proposal-config.component.html',
  styleUrl: './proposal-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProposalConfigComponent implements OnInit {
  private fb = inject(FormBuilder);
  private proposalConfigService = inject(ProposalConfigService);
  private clientsService = inject(ClientsService);
  private clientConfigService = inject(ClientConfigServiceRefactored);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  // Signals
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  availableFields = signal<FieldConfig[]>([]);

  // Form
  configForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  async ngOnInit() {
    // Cargar servicios necesarios
    await Promise.all([
      this.proposalConfigService.initialize(),
      this.clientConfigService.initialize()
    ]);

    // Cargar campos disponibles del cliente
    this.loadAvailableFields();

    // Cargar configuración actual
    this.loadCurrentConfig();
  }

  /**
   * Inicializar formulario
   */
  initForm() {
    this.configForm = this.fb.group({
      address: ['address', Validators.required],
      city: ['city', Validators.required],
      state: ['estado', Validators.required],
      zipCode: ['codigo_postal', Validators.required],
      defaultTaxPercentage: [0, [Validators.min(0), Validators.max(100)]],
      defaultValidityDays: [30, [Validators.min(1)]],
      defaultWorkType: ['residential', Validators.required]
    });
  }

  /**
   * Cargar campos disponibles del módulo de clientes
   */
  loadAvailableFields() {
    try {
      this.isLoading.set(true);

      // Obtener todos los campos configurados en el módulo de clientes
      const fields = this.clientConfigService.getFieldsInUse();

      // Agregar campos estándar que siempre existen
      const standardFields: FieldConfig[] = [
        { name: 'address', label: 'Dirección (Campo Estándar)', type: 'text' as any, enabled: true, required: false, order: 0 },
        { name: 'city', label: 'Ciudad (Campo Estándar)', type: 'text' as any, enabled: true, required: false, order: 1 }
      ];

      // Combinar campos estándar con campos personalizados
      const allFields = [...standardFields, ...fields];

      // Ordenar alfabéticamente
      allFields.sort((a, b) => a.label.localeCompare(b.label));

      this.availableFields.set(allFields);

      console.log('✅ Campos disponibles cargados:', allFields);
    } catch (error) {
      console.error('❌ Error cargando campos disponibles:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Cargar configuración actual
   */
  loadCurrentConfig() {
    const config = this.proposalConfigService.config();

    if (config) {
      this.configForm.patchValue({
        address: config.clientAddressMapping.address,
        city: config.clientAddressMapping.city,
        state: config.clientAddressMapping.state,
        zipCode: config.clientAddressMapping.zipCode,
        defaultTaxPercentage: config.defaultTaxPercentage || 0,
        defaultValidityDays: config.defaultValidityDays || 30,
        defaultWorkType: config.defaultWorkType || 'residential'
      });

      console.log('✅ Configuración actual cargada:', config);
    }
  }

  /**
   * Guardar configuración
   */
  async saveConfig() {
    if (this.configForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    try {
      this.isSaving.set(true);

      const formValue = this.configForm.value;

      const mapping: ProposalAddressMapping = {
        address: formValue.address,
        city: formValue.city,
        state: formValue.state,
        zipCode: formValue.zipCode
      };

      await this.proposalConfigService.updateConfig({
        clientAddressMapping: mapping,
        defaultTaxPercentage: formValue.defaultTaxPercentage,
        defaultValidityDays: formValue.defaultValidityDays,
        defaultWorkType: formValue.defaultWorkType
      });

      this.snackBar.open('✅ Configuración guardada exitosamente', 'Cerrar', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });

      console.log('✅ Configuración guardada:', mapping);
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      this.snackBar.open('❌ Error al guardar la configuración', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Restablecer a valores por defecto
   */
  resetToDefaults() {
    this.configForm.patchValue({
      address: 'address',
      city: 'city',
      state: 'estado',
      zipCode: 'codigo_postal',
      defaultTaxPercentage: 0,
      defaultValidityDays: 30,
      defaultWorkType: 'residential'
    });

    this.snackBar.open('Valores restablecidos a configuración por defecto', 'Cerrar', {
      duration: 2000
    });
  }

  /**
   * Volver a la lista de estimados
   */
  goBack() {
    this.router.navigate(['/modules/projects']);
  }

  /**
   * Obtener el label de un campo por su nombre
   */
  getFieldLabel(fieldName: string): string {
    const field = this.availableFields().find(f => f.name === fieldName);
    return field ? field.label : fieldName;
  }
}
