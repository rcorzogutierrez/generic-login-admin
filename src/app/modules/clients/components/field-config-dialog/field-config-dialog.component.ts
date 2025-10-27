// src/app/modules/clients/components/field-config-dialog/field-config-dialog.component.ts
import { Component, Inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { ClientConfigService } from '../../services/client-config.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FieldConfig, FieldType } from '../../models';

export interface FieldConfigDialogData {
  mode: 'create' | 'edit';
  field?: FieldConfig;
}

@Component({
  selector: 'app-field-config-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './field-config-dialog.component.html',
  styleUrl: './field-config-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class FieldConfigDialogComponent implements OnInit {
  fieldForm!: FormGroup;
  isSaving = false;
  isEditMode = false;

  // Tipos de campo disponibles
  fieldTypes: { value: FieldType; label: string; icon: string }[] = [
    { value: FieldType.TEXT, label: 'Texto', icon: 'text_fields' },
    { value: FieldType.NUMBER, label: 'Número', icon: 'numbers' },
    { value: FieldType.EMAIL, label: 'Email', icon: 'email' },
    { value: FieldType.PHONE, label: 'Teléfono', icon: 'phone' },
    { value: FieldType.SELECT, label: 'Selector', icon: 'arrow_drop_down_circle' },
    { value: FieldType.MULTISELECT, label: 'Multi-selector', icon: 'checklist' },
    { value: FieldType.DATE, label: 'Fecha', icon: 'calendar_today' },
    { value: FieldType.DATETIME, label: 'Fecha/Hora', icon: 'event' },
    { value: FieldType.CHECKBOX, label: 'Casilla', icon: 'check_box' },
    { value: FieldType.TEXTAREA, label: 'Área de texto', icon: 'notes' },
    { value: FieldType.URL, label: 'URL', icon: 'link' },
    { value: FieldType.CURRENCY, label: 'Moneda', icon: 'attach_money' }
  ];

  // Anchos de formulario
  formWidths = [
    { value: 'full', label: 'Ancho completo' },
    { value: 'half', label: 'Mitad' },
    { value: 'third', label: 'Un tercio' }
  ];

  // Iconos sugeridos de Material
  suggestedIcons = [
    'person', 'email', 'phone', 'business', 'location_on',
    'description', 'attach_money', 'calendar_today', 'event',
    'text_fields', 'numbers', 'check_box', 'link', 'image',
    'folder', 'star', 'favorite', 'settings', 'account_circle',
    'badge', 'credit_card', 'verified', 'work', 'home',
    'language', 'public', 'category', 'label', 'local_offer'
  ];

  constructor(
    private fb: FormBuilder,
    private configService: ClientConfigService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<FieldConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FieldConfigDialogData
  ) {}

  ngOnInit() {
    this.isEditMode = this.data.mode === 'edit';
    this.initializeForm();
  }

  private initializeForm() {
    const field = this.data.field;

    this.fieldForm = this.fb.group({
      // Información básica
      name: [
        { value: field?.name || '', disabled: this.isEditMode || field?.isSystem },
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
          Validators.pattern(/^[a-z][a-z0-9_]*$/i)
        ]
      ],
      label: [
        field?.label || '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(100)]
      ],
      type: [
        { value: field?.type || 'TEXT', disabled: field?.isSystem },
        [Validators.required]
      ],
      icon: [
        field?.icon || '',
        [Validators.maxLength(50)]
      ],
      placeholder: [
        field?.placeholder || '',
        [Validators.maxLength(200)]
      ],
      helpText: [
        field?.helpText || '',
        [Validators.maxLength(500)]
      ],

      // Validaciones
      required: [field?.validation.required || false],
      minLength: [field?.validation.minLength || null],
      maxLength: [field?.validation.maxLength || null],
      min: [field?.validation.min || null],
      max: [field?.validation.max || null],
      pattern: [field?.validation.pattern || ''],

      // Configuración de formulario
      formWidth: [field?.formWidth || 'full'],
      defaultValue: [field?.defaultValue || ''],

      // Configuración de grid
      showInGrid: [field?.gridConfig.showInGrid ?? true],
      gridWidth: [field?.gridConfig.gridWidth || ''],
      sortable: [field?.gridConfig.sortable ?? true],
      filterable: [field?.gridConfig.filterable ?? true],

      // Estado
      isActive: [field?.isActive ?? true]
    });

    // Watch type changes para actualizar validaciones sugeridas
    this.fieldForm.get('type')?.valueChanges.subscribe(type => {
      this.updateValidationSuggestions(type);
    });
  }

  /**
   * Actualiza sugerencias de validación basado en el tipo
   */
  private updateValidationSuggestions(type: FieldType) {
    switch (type) {
      case FieldType.EMAIL:
        if (!this.fieldForm.get('pattern')?.value) {
          this.fieldForm.patchValue({
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
            icon: this.fieldForm.get('icon')?.value || 'email'
          });
        }
        break;
      case FieldType.PHONE:
        if (!this.fieldForm.get('icon')?.value) {
          this.fieldForm.patchValue({ icon: 'phone' });
        }
        break;
      case FieldType.URL:
        if (!this.fieldForm.get('pattern')?.value) {
          this.fieldForm.patchValue({
            pattern: '^https?://.+',
            icon: this.fieldForm.get('icon')?.value || 'link'
          });
        }
        break;
      case FieldType.NUMBER:
      case FieldType.CURRENCY:
        if (!this.fieldForm.get('icon')?.value) {
          this.fieldForm.patchValue({
            icon: type === FieldType.CURRENCY ? 'attach_money' : 'numbers'
          });
        }
        break;
    }
    this.cdr.markForCheck();
  }

  /**
   * Selecciona un icono sugerido
   */
  selectIcon(icon: string) {
    this.fieldForm.patchValue({ icon });
  }

  /**
   * Genera el name automáticamente desde el label
   */
  generateNameFromLabel() {
    if (this.isEditMode || this.data.field?.isSystem) return;

    const label = this.fieldForm.get('label')?.value || '';
    const name = label
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    this.fieldForm.patchValue({ name });
  }

  /**
   * Verifica si el tipo seleccionado soporta min/max
   */
  supportsMinMax(): boolean {
    const type = this.fieldForm.get('type')?.value;
    return [FieldType.NUMBER, FieldType.CURRENCY, FieldType.DATE, FieldType.DATETIME].includes(type);
  }

  /**
   * Verifica si el tipo seleccionado soporta minLength/maxLength
   */
  supportsLength(): boolean {
    const type = this.fieldForm.get('type')?.value;
    return [FieldType.TEXT, FieldType.TEXTAREA, FieldType.EMAIL, FieldType.PHONE, FieldType.URL].includes(type);
  }

  /**
   * Verifica si el tipo seleccionado soporta pattern
   */
  supportsPattern(): boolean {
    const type = this.fieldForm.get('type')?.value;
    return [FieldType.TEXT, FieldType.TEXTAREA, FieldType.EMAIL, FieldType.PHONE, FieldType.URL].includes(type);
  }

  /**
   * Guarda el campo
   */
  async onSubmit() {
    if (this.fieldForm.invalid || this.isSaving) {
      this.fieldForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    try {
      const formValue = this.fieldForm.getRawValue();
      const currentUserUid = this.authService.authorizedUser()?.uid || '';

      // Construir objeto de validación
      const validation: any = {
        required: formValue.required
      };

      if (this.supportsLength()) {
        if (formValue.minLength) validation.minLength = formValue.minLength;
        if (formValue.maxLength) validation.maxLength = formValue.maxLength;
      }

      if (this.supportsMinMax()) {
        if (formValue.min !== null) validation.min = formValue.min;
        if (formValue.max !== null) validation.max = formValue.max;
      }

      if (this.supportsPattern() && formValue.pattern) {
        validation.pattern = formValue.pattern;
      }

      // Configuración de grid
      const gridConfig = {
        showInGrid: formValue.showInGrid,
        gridOrder: this.data.field?.gridConfig.gridOrder || 0,
        gridWidth: formValue.gridWidth || undefined,
        sortable: formValue.sortable,
        filterable: formValue.filterable
      };

      if (this.isEditMode && this.data.field) {
        // Editar campo existente
        const updateData: Partial<FieldConfig> = {
          label: formValue.label.trim(),
          icon: formValue.icon?.trim() || undefined,
          placeholder: formValue.placeholder?.trim() || undefined,
          helpText: formValue.helpText?.trim() || undefined,
          validation,
          formWidth: formValue.formWidth,
          defaultValue: formValue.defaultValue || undefined,
          gridConfig,
          isActive: formValue.isActive
        };

        // Si no es campo del sistema, permitir cambiar tipo
        if (!this.data.field.isSystem) {
          updateData.type = formValue.type;
        }

        await this.configService.updateField(this.data.field.id, updateData);
        this.dialogRef.close({ success: true, message: 'Campo actualizado exitosamente' });
      } else {
        // Crear nuevo campo
        const newField: Partial<FieldConfig> = {
          name: formValue.name.trim(),
          label: formValue.label.trim(),
          type: formValue.type,
          icon: formValue.icon?.trim() || undefined,
          placeholder: formValue.placeholder?.trim() || undefined,
          helpText: formValue.helpText?.trim() || undefined,
          validation,
          formWidth: formValue.formWidth,
          defaultValue: formValue.defaultValue || undefined,
          gridConfig,
          isActive: formValue.isActive,
          isSystem: false,
          isDefault: false
        };

        await this.configService.addCustomField(newField as any);
        this.dialogRef.close({ success: true, message: 'Campo creado exitosamente' });
      }
    } catch (error: any) {
      console.error('Error guardando campo:', error);
      alert('Error al guardar: ' + (error.message || 'Error desconocido'));
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  onCancel() {
    this.dialogRef.close({ success: false });
  }

  /**
   * Obtiene el mensaje de error de un campo
   */
  getErrorMessage(fieldName: string): string {
    const control = this.fieldForm.get(fieldName);

    if (control?.hasError('required')) {
      return 'Este campo es requerido';
    }

    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }

    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Máximo ${maxLength} caracteres`;
    }

    if (control?.hasError('pattern')) {
      return 'Solo letras, números y guiones bajos. Debe empezar con letra.';
    }

    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.fieldForm.get(fieldName);
    return !!(control?.invalid && (control?.dirty || control?.touched));
  }
}
