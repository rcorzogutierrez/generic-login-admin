// src/app/admin/components/module-form-dialog/module-form-dialog.component.ts
import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

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
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="dialog-container">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <div class="header-icon-box">
            <mat-icon class="header-icon">{{ isEditMode ? 'edit' : 'extension' }}</mat-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-800 m-0">
              {{ isEditMode ? 'Editar Módulo' : 'Nuevo Módulo' }}
            </h2>
            <p class="text-sm text-slate-500 m-0">
              {{ isEditMode ? 'Modifica la información del módulo' : 'Configura un nuevo módulo del sistema' }}
            </p>
          </div>
        </div>
        <button mat-icon-button (click)="onCancel()" class="!text-slate-400" [disabled]="isSaving()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <form [formGroup]="moduleForm" (ngSubmit)="onSubmit()" class="p-6 overflow-y-auto max-h-[65vh]">

        <!-- Información Básica -->
        <div class="mb-6">
          <h3 class="section-title">
            <mat-icon class="section-icon">info</mat-icon>
            <span>Información Básica</span>
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Identificador -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">
                Identificador <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input
                  type="text"
                  class="input-field"
                  [class.input-readonly]="isEditMode"
                  formControlName="value"
                  placeholder="ej: clients, materials"
                  [readonly]="isEditMode">
                @if (!isEditMode) {
                  <button
                    type="button"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                    (click)="generateValueFromLabel()"
                    title="Generar desde el nombre">
                    <mat-icon class="!text-lg">auto_fix_high</mat-icon>
                  </button>
                }
              </div>
              @if (isFieldInvalid('value')) {
                <span class="text-xs text-red-500 mt-1">{{ getErrorMessage('value') }}</span>
              }
              @if (isEditMode) {
                <span class="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <mat-icon class="!text-xs">info</mat-icon>
                  El identificador no se puede modificar
                </span>
              } @else {
                <span class="text-xs text-slate-400 mt-1">Solo minúsculas, números y guiones</span>
              }
            </div>

            <!-- Nombre del Módulo -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">
                Nombre del Módulo <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                class="input-field"
                formControlName="label"
                placeholder="ej: Gestión de Usuarios">
              @if (isFieldInvalid('label')) {
                <span class="text-xs text-red-500 mt-1">{{ getErrorMessage('label') }}</span>
              }
            </div>
          </div>

          <!-- Descripción -->
          <div class="mt-4">
            <label class="block text-sm font-semibold text-slate-700 mb-2">
              Descripción <span class="text-red-500">*</span>
            </label>
            <textarea
              class="input-field resize-none"
              formControlName="description"
              rows="2"
              placeholder="Describe brevemente la funcionalidad del módulo..."></textarea>
            @if (isFieldInvalid('description')) {
              <span class="text-xs text-red-500 mt-1">{{ getErrorMessage('description') }}</span>
            }
          </div>
        </div>

        <!-- Icono -->
        <div class="mb-6">
          <h3 class="section-title">
            <mat-icon class="section-icon">emoji_symbols</mat-icon>
            <span>Icono del Módulo</span>
          </h3>

          <div class="flex gap-4 items-start mb-4">
            <div class="flex-1">
              <label class="block text-sm font-semibold text-slate-700 mb-2">
                Nombre del icono <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                class="input-field"
                formControlName="icon"
                placeholder="ej: dashboard, people">
              @if (isFieldInvalid('icon')) {
                <span class="text-xs text-red-500 mt-1">{{ getErrorMessage('icon') }}</span>
              }
            </div>

            <!-- Preview -->
            <div class="flex flex-col items-center gap-1">
              <span class="text-xs text-slate-500">Vista previa</span>
              <div class="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <mat-icon class="!text-3xl text-white">
                  {{ moduleForm.get('icon')?.value || 'extension' }}
                </mat-icon>
              </div>
            </div>
          </div>

          <!-- Iconos sugeridos -->
          <div class="bg-slate-50 rounded-xl p-4">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Iconos sugeridos (click para seleccionar)
            </p>
            <div class="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-[160px] overflow-y-auto">
              @for (icon of suggestedIcons; track icon) {
                <button
                  type="button"
                  class="icon-btn-selector"
                  [class.selected]="moduleForm.get('icon')?.value === icon"
                  (click)="selectIcon(icon)"
                  [title]="icon">
                  <mat-icon>{{ icon }}</mat-icon>
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Configuración -->
        <div class="mb-6">
          <h3 class="section-title">
            <mat-icon class="section-icon">settings</mat-icon>
            <span>Configuración</span>
          </h3>

          <!-- Ruta -->
          <div class="mb-4">
            <label class="block text-sm font-semibold text-slate-700 mb-2">
              Ruta Asociada
              <span class="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              class="input-field"
              formControlName="route"
              placeholder="ej: /admin/users">
            <span class="text-xs text-slate-400 mt-1">Deja vacío si no tiene ruta específica</span>
          </div>

          <!-- Estado Activo -->
          <label class="status-toggle">
            <input
              type="checkbox"
              formControlName="isActive"
              class="sr-only peer">
            <div class="toggle-track peer-checked:bg-green-500">
              <div class="toggle-thumb peer-checked:translate-x-5"></div>
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-semibold text-slate-700">Módulo Activo</span>
              <span class="text-xs text-slate-500">
                Los módulos inactivos no estarán disponibles para asignar
              </span>
            </div>
          </label>
        </div>

      </form>

      <!-- Footer -->
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
        <button mat-stroked-button (click)="onCancel()" [disabled]="isSaving()">
          Cancelar
        </button>
        <button
          mat-raised-button
          (click)="onSubmit()"
          [disabled]="moduleForm.invalid || isSaving()"
          class="!bg-purple-600 !text-white">
          @if (isSaving()) {
            <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          } @else {
            <mat-icon>{{ isEditMode ? 'save' : 'add' }}</mat-icon>
          }
          {{ isEditMode ? 'Guardar Cambios' : 'Crear Módulo' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .dialog-container {
      display: flex;
      flex-direction: column;
      background: white;
      overflow: hidden;
      width: 100%;
    }

    /* Fix mat-icon vertical alignment */
    mat-icon {
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
    }

    /* Header Icon */
    .header-icon-box {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .header-icon {
      font-size: 24px !important;
      width: 24px !important;
      height: 24px !important;
      color: white;
    }

    /* Section Title */
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #475569;
      margin: 0 0 16px 0;
    }

    .section-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      color: #a855f7;
    }

    .input-field {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 2px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      transition: all 0.2s;
      outline: none;
      background: white;
    }

    .input-field:focus {
      border-color: #a855f7;
      box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
    }

    .input-field::placeholder {
      color: #94a3b8;
    }

    .input-field.input-readonly {
      background: #f8fafc;
      color: #64748b;
      cursor: not-allowed;
    }

    /* Icon Selector Button */
    .icon-btn-selector {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #e2e8f0;
      border-radius: 0.5rem;
      background: white;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s;
    }

    .icon-btn-selector:hover {
      border-color: #a855f7;
      background: #faf5ff;
      color: #a855f7;
    }

    .icon-btn-selector.selected {
      border-color: #a855f7;
      background: #f3e8ff;
      color: #9333ea;
    }

    .icon-btn-selector mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Status Toggle */
    .status-toggle {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .status-toggle:hover {
      border-color: #cbd5e1;
    }

    .status-toggle:has(input:checked) {
      background: #f0fdf4;
      border-color: #86efac;
    }

    .toggle-track {
      position: relative;
      width: 44px;
      height: 24px;
      background: #cbd5e1;
      border-radius: 9999px;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .toggle-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 9999px;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .status-toggle:has(input:checked) .toggle-track {
      background: #22c55e;
    }

    .status-toggle:has(input:checked) .toggle-thumb {
      transform: translateX(20px);
    }

    /* Scrollbar */
    .overflow-y-auto::-webkit-scrollbar {
      width: 6px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 3px;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
      background: #d8b4fe;
      border-radius: 3px;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
      background: #c084fc;
    }

    @media (max-width: 640px) {
      .dialog-container {
        width: 100%;
      }
    }
  `]
})
export class ModuleFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private modulesService = inject(ModulesService);
  private authService = inject(AuthService);
  public dialogRef = inject(MatDialogRef<ModuleFormDialogComponent>);

  moduleForm!: FormGroup;
  isSaving = signal<boolean>(false);
  isEditMode = false;

  suggestedIcons = [
    // Sistema y Admin
    'dashboard', 'settings', 'admin_panel_settings', 'security', 'vpn_key',
    // Usuarios y Personas
    'people', 'group', 'person', 'contacts', 'badge',
    // Negocio y Comercio
    'store', 'shopping_cart', 'payment', 'receipt', 'attach_money',
    // Inventario y Materiales
    'inventory', 'inventory_2', 'warehouse', 'package', 'local_shipping',
    // Trabajadores
    'engineering', 'construction', 'work', 'business_center', 'card_travel',
    // Analítica
    'analytics', 'assessment', 'bar_chart', 'pie_chart', 'timeline',
    // Documentos
    'description', 'assignment', 'folder', 'folder_open', 'article',
    // Comunicación
    'email', 'chat', 'forum', 'notifications', 'campaign',
    // Calendario
    'calendar_today', 'event', 'schedule', 'alarm', 'access_time',
    // Apps y Módulos
    'apps', 'extension', 'widgets', 'view_module', 'grid_view',
    // Tesorería
    'account_balance', 'savings', 'currency_exchange', 'request_quote', 'paid'
  ];

  constructor(@Inject(MAT_DIALOG_DATA) public data: ModuleFormDialogData) {}

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

  selectIcon(icon: string) {
    this.moduleForm.patchValue({ icon });
  }

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

  async onSubmit() {
    if (this.moduleForm.invalid || this.isSaving()) {
      this.moduleForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    try {
      const formValue = this.moduleForm.getRawValue();
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
      this.isSaving.set(false);
    }
  }

  onCancel() {
    this.dialogRef.close({ success: false });
  }

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
