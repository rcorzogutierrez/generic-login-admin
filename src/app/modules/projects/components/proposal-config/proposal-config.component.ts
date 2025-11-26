// src/app/modules/projects/components/proposal-config/proposal-config.component.ts

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';

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
import { ProposalFieldMapping } from '../../models';
import { FieldConfig } from '../../../clients/models/field-config.interface';

/**
 * Definición de campos del estimado disponibles para mapeo
 */
interface TargetFieldDefinition {
  value: 'name' | 'email' | 'phone' | 'company' | 'address' | 'city' | 'state' | 'zipCode';
  label: string;
  icon: string;
  category: 'basic' | 'address';
  important?: boolean;
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

  // Campos disponibles del estimado (destino)
  targetFieldsDefinitions: TargetFieldDefinition[] = [
    { value: 'name', label: 'Nombre del Cliente', icon: 'badge', category: 'basic' },
    { value: 'email', label: 'Email del Cliente', icon: 'email', category: 'basic' },
    { value: 'phone', label: 'Teléfono del Cliente', icon: 'phone', category: 'basic' },
    { value: 'company', label: 'Compañía del Cliente', icon: 'business', category: 'basic' },
    { value: 'address', label: 'Dirección del Trabajo', icon: 'location_on', category: 'address' },
    { value: 'city', label: 'Ciudad', icon: 'location_city', category: 'address' },
    { value: 'state', label: 'Estado', icon: 'map', category: 'address', important: true },
    { value: 'zipCode', label: 'Código Postal', icon: 'markunread_mailbox', category: 'address' }
  ];

  // Computed: Campos destino que ya están mapeados
  mappedTargetFields = computed(() => {
    const mappings = this.fieldMappingsArray.value as ProposalFieldMapping[];
    return new Set(mappings.map(m => m.targetField));
  });

  // Computed: Campos destino disponibles para agregar (los que no están mapeados)
  availableTargetFields = computed(() => {
    const mapped = this.mappedTargetFields();
    return this.targetFieldsDefinitions.filter(tf => !mapped.has(tf.value));
  });

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
      // Array dinámico de mapeos de campos
      fieldMappings: this.fb.array([]),
      // Valores por defecto
      defaultTaxPercentage: [0, [Validators.min(0), Validators.max(100)]],
      defaultValidityDays: [30, [Validators.min(1)]],
      defaultWorkType: ['residential', Validators.required],
      defaultTerms: ['']
    });
  }

  /**
   * Obtener el FormArray de mapeos de campos
   */
  get fieldMappingsArray(): FormArray {
    return this.configForm.get('fieldMappings') as FormArray;
  }

  /**
   * Crear un FormGroup para un mapeo individual
   */
  createMappingFormGroup(mapping?: ProposalFieldMapping): FormGroup {
    return this.fb.group({
      sourceField: [mapping?.sourceField || '', Validators.required],
      targetField: [mapping?.targetField || '', Validators.required],
      order: [mapping?.order || 0]
    });
  }

  /**
   * Agregar un nuevo mapeo de campo
   */
  addMapping(targetField?: string) {
    const newMapping = this.createMappingFormGroup({
      sourceField: this.suggestClientField(targetField || ''),
      targetField: targetField as any || this.availableTargetFields()[0]?.value,
      order: this.fieldMappingsArray.length + 1
    });
    this.fieldMappingsArray.push(newMapping);
  }

  /**
   * Eliminar un mapeo de campo
   */
  removeMapping(index: number) {
    this.fieldMappingsArray.removeAt(index);
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
      const standardFields: Pick<FieldConfig, 'name' | 'label' | 'type'>[] = [
        { name: 'address', label: 'Dirección', type: 'text' as any },
        { name: 'city', label: 'Ciudad', type: 'text' as any }
      ];

      // Combinar campos estándar con campos personalizados
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
   * Cargar configuración actual o crear mapeos por defecto
   */
  loadCurrentConfig() {
    const config = this.proposalConfigService.config();

    // Limpiar array actual
    this.fieldMappingsArray.clear();

    if (config && config.fieldMappings && config.fieldMappings.length > 0) {
      // Cargar mapeos existentes
      config.fieldMappings
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .forEach(mapping => {
          this.fieldMappingsArray.push(this.createMappingFormGroup(mapping));
        });

      console.log('✅ Configuración actual cargada:', config.fieldMappings);
    } else {
      // No hay configuración, crear mapeos por defecto
      this.targetFieldsDefinitions.forEach((targetField, index) => {
        this.fieldMappingsArray.push(this.createMappingFormGroup({
          sourceField: this.suggestClientField(targetField.value),
          targetField: targetField.value,
          order: index + 1
        }));
      });

      console.log('💡 Usando mapeos por defecto con sugerencias automáticas');
    }

    // Cargar valores por defecto
    this.configForm.patchValue({
      defaultTaxPercentage: config?.defaultTaxPercentage || 0,
      defaultValidityDays: config?.defaultValidityDays || 30,
      defaultWorkType: config?.defaultWorkType || 'residential',
      defaultTerms: config?.defaultTerms || this.proposalConfigService.getDefaultTerms()
    });
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

      await this.proposalConfigService.updateConfig({
        fieldMappings: formValue.fieldMappings,
        defaultTaxPercentage: formValue.defaultTaxPercentage,
        defaultValidityDays: formValue.defaultValidityDays,
        defaultWorkType: formValue.defaultWorkType,
        defaultTerms: formValue.defaultTerms
      });

      this.snackBar.open('✅ Configuración guardada exitosamente', 'Cerrar', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });

      console.log('✅ Configuración guardada:', formValue.fieldMappings);
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
    // Limpiar array actual
    this.fieldMappingsArray.clear();

    // Crear mapeos por defecto para todos los campos
    this.targetFieldsDefinitions.forEach((targetField, index) => {
      this.fieldMappingsArray.push(this.createMappingFormGroup({
        sourceField: this.suggestClientField(targetField.value),
        targetField: targetField.value,
        order: index + 1
      }));
    });

    this.configForm.patchValue({
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

  /**
   * Obtener la definición de un campo destino
   */
  getTargetFieldDefinition(targetField: string): TargetFieldDefinition | undefined {
    return this.targetFieldsDefinitions.find(tf => tf.value === targetField);
  }
}
