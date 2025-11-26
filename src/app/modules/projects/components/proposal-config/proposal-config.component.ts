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
import { ProposalClientFieldsMapping, ProposalAddressMapping } from '../../models';
import { FieldConfig } from '../../../clients/models/field-config.interface';

/**
 * Configuración de un campo de mapeo
 */
interface FieldMappingConfig {
  formControlName: string;
  icon: string;
  destinationIcon?: string;  // Icono para el campo destino (si es diferente al de origen)
  label: string;
  targetTheme: 'purple' | 'green';
  badge?: string;
}

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

  // Configuraciones de mapeo de campos básicos
  basicFieldMappings: FieldMappingConfig[] = [
    { formControlName: 'name', icon: 'badge', label: 'Nombre del Cliente', targetTheme: 'purple' },
    { formControlName: 'email', icon: 'email', label: 'Email del Cliente', targetTheme: 'purple' },
    { formControlName: 'phone', icon: 'phone', label: 'Teléfono del Cliente', targetTheme: 'purple' },
    { formControlName: 'company', icon: 'business', label: 'Compañía del Cliente', targetTheme: 'purple' }
  ];

  // Configuraciones de mapeo de campos de dirección
  addressFieldMappings: FieldMappingConfig[] = [
    { formControlName: 'address', icon: 'home', destinationIcon: 'location_on', label: 'Dirección del Trabajo', targetTheme: 'green' },
    { formControlName: 'city', icon: 'location_city', label: 'Ciudad', targetTheme: 'green' },
    { formControlName: 'state', icon: 'map', label: 'Estado', targetTheme: 'green', badge: 'IMPORTANTE' },
    { formControlName: 'zipCode', icon: 'markunread_mailbox', label: 'Código Postal', targetTheme: 'green' }
  ];

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
      // Mapeo de campos básicos del cliente
      name: ['name', Validators.required],
      email: ['email', Validators.required],
      phone: ['phone', Validators.required],
      company: ['company', Validators.required],
      // Mapeo de campos de dirección
      address: ['address', Validators.required],
      city: ['city', Validators.required],
      state: ['estado', Validators.required],
      zipCode: ['codigo_postal', Validators.required],
      // Valores por defecto
      defaultTaxPercentage: [0, [Validators.min(0), Validators.max(100)]],
      defaultValidityDays: [30, [Validators.min(1)]],
      defaultWorkType: ['residential', Validators.required],
      defaultTerms: ['']
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

      // Agregar campos estándar que siempre existen (sin todas las propiedades de FieldConfig)
      const standardFields: Pick<FieldConfig, 'name' | 'label' | 'type'>[] = [
        { name: 'address', label: 'Dirección', type: 'text' as any },
        { name: 'city', label: 'Ciudad', type: 'text' as any }
      ];

      // Combinar campos estándar con campos personalizados
      // Convertimos standardFields a FieldConfig parcial
      const allFields: FieldConfig[] = [
        ...standardFields.map(f => ({ ...f, id: f.name } as any as FieldConfig)),
        ...fields
      ];

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
   * Sugerir el mejor campo del cliente por similitud de nombre
   * @param targetFieldName Nombre del campo destino (ej: 'state', 'zipCode')
   * @returns El nombre del campo sugerido del cliente
   */
  suggestClientField(targetFieldName: string): string {
    const available = this.availableFields();
    if (available.length === 0) return targetFieldName;

    // Mapeo de sinónimos comunes
    const synonyms: Record<string, string[]> = {
      name: ['name', 'nombre', 'client_name', 'nombre_cliente'],
      email: ['email', 'correo', 'email_address', 'correo_electronico'],
      phone: ['phone', 'telefono', 'phone_number', 'tel'],
      company: ['company', 'empresa', 'compania', 'compañia'],
      address: ['address', 'direccion', 'domicilio', 'calle'],
      city: ['city', 'ciudad'],
      state: ['state', 'estado', 'provincia'],
      zipCode: ['zipcode', 'zip_code', 'codigo_postal', 'codigopostal', 'cp', 'postal']
    };

    const targetSynonyms = synonyms[targetFieldName] || [targetFieldName];

    // Buscar coincidencia exacta (case insensitive)
    for (const synonym of targetSynonyms) {
      const exact = available.find(f =>
        f.name.toLowerCase() === synonym.toLowerCase()
      );
      if (exact) return exact.name;
    }

    // Buscar coincidencia parcial
    for (const synonym of targetSynonyms) {
      const partial = available.find(f =>
        f.name.toLowerCase().includes(synonym.toLowerCase()) ||
        synonym.toLowerCase().includes(f.name.toLowerCase())
      );
      if (partial) return partial.name;
    }

    // Si no hay coincidencia, retornar el primero disponible
    return available[0]?.name || targetFieldName;
  }

  /**
   * Cargar configuración actual o usar sugerencias inteligentes
   */
  loadCurrentConfig() {
    const config = this.proposalConfigService.config();

    if (config) {
      // Cargar configuración existente
      this.configForm.patchValue({
        name: config.clientFieldsMapping?.name || 'name',
        email: config.clientFieldsMapping?.email || 'email',
        phone: config.clientFieldsMapping?.phone || 'phone',
        company: config.clientFieldsMapping?.company || 'company',
        address: config.clientAddressMapping.address,
        city: config.clientAddressMapping.city,
        state: config.clientAddressMapping.state,
        zipCode: config.clientAddressMapping.zipCode,
        defaultTaxPercentage: config.defaultTaxPercentage || 0,
        defaultValidityDays: config.defaultValidityDays || 30,
        defaultWorkType: config.defaultWorkType || 'residential',
        defaultTerms: config.defaultTerms || this.proposalConfigService.getDefaultTerms()
      });

      console.log('✅ Configuración actual cargada:', config);
    } else {
      // No hay configuración, usar sugerencias inteligentes
      this.configForm.patchValue({
        name: this.suggestClientField('name'),
        email: this.suggestClientField('email'),
        phone: this.suggestClientField('phone'),
        company: this.suggestClientField('company'),
        address: this.suggestClientField('address'),
        city: this.suggestClientField('city'),
        state: this.suggestClientField('state'),
        zipCode: this.suggestClientField('zipCode'),
        defaultTaxPercentage: 0,
        defaultValidityDays: 30,
        defaultWorkType: 'residential',
        defaultTerms: this.proposalConfigService.getDefaultTerms()
      });

      console.log('💡 Usando sugerencias automáticas para configuración inicial');
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

      const clientFieldsMapping = {
        name: formValue.name,
        email: formValue.email,
        phone: formValue.phone,
        company: formValue.company
      };

      const addressMapping: ProposalAddressMapping = {
        address: formValue.address,
        city: formValue.city,
        state: formValue.state,
        zipCode: formValue.zipCode
      };

      await this.proposalConfigService.updateConfig({
        clientFieldsMapping: clientFieldsMapping,
        clientAddressMapping: addressMapping,
        defaultTaxPercentage: formValue.defaultTaxPercentage,
        defaultValidityDays: formValue.defaultValidityDays,
        defaultWorkType: formValue.defaultWorkType,
        defaultTerms: formValue.defaultTerms
      });

      this.snackBar.open('✅ Configuración guardada exitosamente', 'Cerrar', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });

      console.log('✅ Configuración guardada - Campos básicos:', clientFieldsMapping, 'Dirección:', addressMapping);
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
   * Restablecer a sugerencias automáticas
   */
  resetToDefaults() {
    this.configForm.patchValue({
      name: this.suggestClientField('name'),
      email: this.suggestClientField('email'),
      phone: this.suggestClientField('phone'),
      company: this.suggestClientField('company'),
      address: this.suggestClientField('address'),
      city: this.suggestClientField('city'),
      state: this.suggestClientField('state'),
      zipCode: this.suggestClientField('zipCode'),
      defaultTaxPercentage: 0,
      defaultValidityDays: 30,
      defaultWorkType: 'residential',
      defaultTerms: this.proposalConfigService.getDefaultTerms()
    });

    this.snackBar.open('💡 Valores restablecidos con sugerencias automáticas', 'Cerrar', {
      duration: 3000
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
