// src/app/admin/components/module-form-dialog/module-form-dialog.component.ts
import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ModulesService } from '../../services/modules.service';
import { AuthService } from '../../../core/services/auth.service';
import { SystemModule, ModuleFormData } from '../../models/system-module.interface';

export interface ModuleFormDialogData {
  mode: 'create' | 'edit';
  module?: SystemModule;
}

@Component({
  selector: 'app-module-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './module-form-dialog.component.html',
  styleUrl: './module-form-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleFormDialogComponent implements OnInit {
  moduleForm!: FormGroup;
  isSaving = false;
  isEditMode = false;

  // Iconos sugeridos de Material - Organizados por categoría
  suggestedIcons = [
    // Sistema y Admin
    'dashboard', 'settings', 'admin_panel_settings', 'security', 'vpn_key',
    // Usuarios y Personas
    'people', 'group', 'person', 'contacts', 'badge',
    // Negocio y Comercio
    'store', 'shopping_cart', 'payment', 'receipt', 'attach_money',
    // Inventario y Materiales
    'inventory', 'inventory_2', 'warehouse', 'package', 'local_shipping',
    // Trabajadores y Recursos Humanos
    'engineering', 'construction', 'work', 'business_center', 'card_travel',
    // Analítica y Reportes
    'analytics', 'assessment', 'bar_chart', 'pie_chart', 'timeline',
    // Documentos y Archivos
    'description', 'assignment', 'folder', 'folder_open', 'article',
    // Comunicación
    'email', 'chat', 'forum', 'notifications', 'campaign',
    // Calendario y Tiempo
    'calendar_today', 'event', 'schedule', 'alarm', 'access_time',
    // Aplicaciones y Módulos
    'apps', 'extension', 'widgets', 'view_module', 'grid_view',
    // Almacenamiento y Nube
    'storage', 'cloud', 'cloud_upload', 'cloud_download', 'backup'
  ];

  constructor(
    private fb: FormBuilder,
    private modulesService: ModulesService,
    private authService: AuthService,
    public dialogRef: MatDialogRef<ModuleFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ModuleFormDialogData
  ) {}

  ngOnInit() {
    this.isEditMode = this.data.mode === 'edit';
    this.initializeForm();
  }

  private initializeForm() {
    const module = this.data.module;

    this.moduleForm = this.fb.group({
      value: [
        { value: module?.value || '', disabled: this.isEditMode },
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
          Validators.pattern(/^[a-z0-9-_]+$/i)
        ]
      ],
      label: [
        module?.label || '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(100)]
      ],
      description: [
        module?.description || '',
        [Validators.required, Validators.minLength(5), Validators.maxLength(500)]
      ],
      icon: [
        module?.icon || 'extension',
        [Validators.required, Validators.minLength(2)]
      ],
      route: [
        module?.route || '',
        [Validators.maxLength(200)]
      ],
      isActive: [module?.isActive ?? true]
    });
  }

  /**
   * Selecciona un icono sugerido
   */
  selectIcon(icon: string) {
    this.moduleForm.patchValue({ icon });
  }

  /**
   * Genera el value automáticamente desde el label
   */
  generateValueFromLabel() {
    if (this.isEditMode) return;

    const label = this.moduleForm.get('label')?.value || '';
    const value = label
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    this.moduleForm.patchValue({ value });
  }

  /**
   * Guarda el módulo
   */
  async onSubmit() {
    if (this.moduleForm.invalid || this.isSaving) {
      this.moduleForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    try {
      const formValue = this.moduleForm.getRawValue(); // getRawValue para incluir campos disabled
      const currentUserUid = this.authService.authorizedUser()?.uid || '';

      const moduleData: ModuleFormData = {
        value: formValue.value.trim().toLowerCase(),
        label: formValue.label.trim(),
        description: formValue.description.trim(),
        icon: formValue.icon.trim(),
        route: formValue.route?.trim() || '',
        isActive: formValue.isActive
      };

      let result;

      if (this.isEditMode && this.data.module) {
        result = await this.modulesService.updateModule(
          this.data.module.id,
          moduleData,
          currentUserUid
        );
      } else {
        result = await this.modulesService.createModule(
          moduleData,
          currentUserUid
        );
      }

      if (result.success) {
        this.dialogRef.close({ success: true, message: result.message });
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      alert('Error inesperado: ' + error.message);
    } finally {
      this.isSaving = false;
    }
  }

  onCancel() {
    this.dialogRef.close({ success: false });
  }

  /**
   * Obtiene el mensaje de error de un campo
   */
  getErrorMessage(fieldName: string): string {
    const control = this.moduleForm.get(fieldName);

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
      return 'Solo letras, números, guiones y guiones bajos';
    }

    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.moduleForm.get(fieldName);
    return !!(control?.invalid && (control?.dirty || control?.touched));
  }
}