// src/app/modules/materials/components/material-form/material-form.component.ts

import { Component, OnInit, signal, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';

import { MaterialsService } from '../../services/materials.service';
import { MaterialsConfigService } from '../../services/materials-config.service';
import { Material } from '../../models';
import { FieldConfig, FieldType } from '../../../../modules/clients/models';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../../core/services/auth.service';

type FormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-material-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './material-form.component.html',
  styleUrl: './material-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaterialFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private materialsService = inject(MaterialsService);
  private configService = inject(MaterialsConfigService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  mode = signal<FormMode>('create');
  materialForm!: FormGroup;
  fields = signal<FieldConfig[]>([]);
  formLayout = signal<any>(null); // FormLayoutConfig
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  currentMaterial = signal<Material | null>(null);

  // Expose FieldType to template
  FieldType = FieldType;

  constructor() {}

  async ngOnInit() {
    await this.initializeForm();
  }

  private async initializeForm() {
    try {
      this.isLoading.set(true);

      // Cargar configuración de campos
      await this.configService.initialize();

      // Obtener campos activos ordenados
      const activeFields = this.configService.getActiveFields();
      console.log('📝 FORMULARIO MATERIALS: Campos activos cargados:', activeFields.length);

      // Validar que existan campos configurados
      if (activeFields.length === 0) {
        console.warn('⚠️ No hay campos configurados en el módulo de Materials');

        const currentUser = this.authService.authorizedUser();
        const isAdmin = currentUser?.role === 'admin';

        if (isAdmin) {
          // Admin: mostrar botón para ir a configuración
          this.snackBar.open(
            '⚠️ No hay campos configurados. Por favor, configura los campos del formulario primero.',
            'Ir a Configuración',
            {
              duration: 8000,
              horizontalPosition: 'center',
              verticalPosition: 'top'
            }
          ).onAction().subscribe(() => {
            this.router.navigate(['/modules/materials/config']);
          });
        } else {
          // Usuario normal: solo mostrar mensaje
          this.snackBar.open(
            '⚠️ No hay campos configurados. Contacta al administrador para configurar este módulo.',
            'Cerrar',
            {
              duration: 8000,
              horizontalPosition: 'center',
              verticalPosition: 'top'
            }
          );
        }

        this.router.navigate(['/modules/materials']);
        return;
      }

      this.fields.set(activeFields);

      // Cargar layout del formulario
      const layout = this.configService.getFormLayout();
      this.formLayout.set(layout);
      console.log('📐 Layout del formulario cargado:', layout ? `${layout.columns} columnas` : 'sin layout');

      // Determinar modo según ruta
      const materialId = this.route.snapshot.paramMap.get('id');
      const isViewMode = this.route.snapshot.data['mode'] === 'view';

      if (materialId) {
        // Modo editar o ver
        this.mode.set(isViewMode ? 'view' : 'edit');
        await this.loadMaterial(materialId);
      } else {
        // Modo crear
        this.mode.set('create');
        this.buildForm();
      }

      this.cdr.markForCheck();

    } catch (error) {
      console.error('Error inicializando formulario:', error);
      this.snackBar.open('Error al cargar el formulario', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  private async loadMaterial(materialId: string) {
    try {
      await this.materialsService.initialize();

      const material = this.materialsService.materials().find(m => m.id === materialId);

      if (!material) {
        this.snackBar.open('Material no encontrado', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/modules/materials']);
        return;
      }

      this.currentMaterial.set(material);
      this.buildForm(material);

    } catch (error) {
      console.error('Error cargando material:', error);
      this.snackBar.open('Error al cargar el material', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/materials']);
    }
  }

  private buildForm(material?: Material) {
    const formControls: any = {};
    const fields = this.fields();

    console.log('🔨 buildForm(): Construyendo formulario con', fields.length, 'campos');

    fields.forEach(field => {
      const initialValue = this.getInitialValue(field, material);
      const validators = this.createValidators(field);

      formControls[field.name] = [
        { value: initialValue, disabled: this.mode() === 'view' },
        validators
      ];
    });

    this.materialForm = this.fb.group(formControls);
  }

  private getInitialValue(field: FieldConfig, material?: Material): any {
    if (!material) {
      return field.defaultValue ?? this.getDefaultValueByType(field.type);
    }

    // Buscar en campos por defecto
    if (field.name in material) {
      return (material as any)[field.name];
    }

    // Buscar en customFields
    if (material.customFields && field.name in material.customFields) {
      return material.customFields[field.name];
    }

    return field.defaultValue ?? this.getDefaultValueByType(field.type);
  }

  private getDefaultValueByType(type: FieldType): any {
    switch (type) {
      case FieldType.CHECKBOX:
        return false;
      case FieldType.NUMBER:
      case FieldType.CURRENCY:
        return null;
      case FieldType.MULTISELECT:
        return [];
      default:
        return '';
    }
  }

  private createValidators(field: FieldConfig): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    const validation = field.validation;

    if (validation.required) {
      validators.push(Validators.required);
    }

    if (validation.minLength) {
      validators.push(Validators.minLength(validation.minLength));
    }

    if (validation.maxLength) {
      validators.push(Validators.maxLength(validation.maxLength));
    }

    if (validation.pattern) {
      validators.push(Validators.pattern(validation.pattern));
    }

    if (validation.email || field.type === FieldType.EMAIL) {
      validators.push(Validators.email);
    }

    if (validation.min !== undefined) {
      validators.push(Validators.min(validation.min));
    }

    if (validation.max !== undefined) {
      validators.push(Validators.max(validation.max));
    }

    if (validation.url || field.type === FieldType.URL) {
      validators.push(this.urlValidator());
    }

    return validators;
  }

  private urlValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) {
        return null;
      }

      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      const valid = urlPattern.test(control.value);

      return valid ? null : { url: { value: control.value } };
    };
  }

  async onSubmit() {
    if (this.materialForm.invalid) {
      this.materialForm.markAllAsTouched();
      this.snackBar.open('Por favor, completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.isSaving.set(true);
      this.cdr.markForCheck();

      const formValue = this.materialForm.value;

      // Separar campos por defecto y personalizados
      const defaultFields: any = {};
      const customFields: any = {};

      this.fields().forEach(field => {
        const value = formValue[field.name];

        if (field.isDefault) {
          defaultFields[field.name] = value;
        } else {
          customFields[field.name] = value;
        }
      });

      // Get current user ID
      const currentUser = this.authService.authorizedUser();
      const currentUserUid = currentUser?.uid || '';

      if (this.mode() === 'create') {
        // Crear nuevo material
        const materialData = {
          ...defaultFields,
          customFields
        };

        const result = await this.materialsService.createMaterial(materialData, currentUserUid);

        if (result.success) {
          this.snackBar.open('Material creado exitosamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/modules/materials']);
        } else {
          this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
        }

      } else if (this.mode() === 'edit') {
        // Actualizar material existente
        const material = this.currentMaterial();
        if (!material) return;

        const updateData = {
          ...defaultFields,
          customFields: {
            ...material.customFields,
            ...customFields
          }
        };

        const result = await this.materialsService.updateMaterial(material.id, updateData, currentUserUid);

        if (result.success) {
          this.snackBar.open('Material actualizado exitosamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/modules/materials']);
        } else {
          this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
        }
      }

    } catch (error) {
      console.error('Error guardando material:', error);
      this.snackBar.open('Error al guardar el material', 'Cerrar', { duration: 3000 });
    } finally {
      this.isSaving.set(false);
      this.cdr.markForCheck();
    }
  }

  onCancel() {
    if (this.materialForm.dirty) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: '¿Descartar cambios?',
          message: 'Tienes cambios sin guardar. ¿Estás seguro de que deseas descartarlos?',
          confirmText: 'Descartar',
          cancelText: 'Continuar editando',
          type: 'warning'
        } as ConfirmDialogData
      });

      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.router.navigate(['/modules/materials']);
        }
      });
    } else {
      this.router.navigate(['/materials']);
    }
  }

  enableEdit() {
    this.mode.set('edit');
    this.materialForm.enable();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.materialForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const field = this.fields().find(f => f.name === fieldName);
    const errors = control.errors;

    if (errors['required']) return `${field?.label || fieldName} es requerido`;
    if (errors['email']) return 'Formato de correo electrónico inválido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['min']) return `El valor mínimo es ${errors['min'].min}`;
    if (errors['max']) return `El valor máximo es ${errors['max'].max}`;
    if (errors['pattern']) return 'Formato inválido';
    if (errors['url']) return 'URL inválida';

    return 'Campo inválido';
  }

  hasError(fieldName: string): boolean {
    const control = this.materialForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  getFieldWidth(field: FieldConfig): string {
    switch (field.formWidth) {
      case 'full':
        return 'col-span-2';
      case 'half':
        return 'col-span-2 md:col-span-1';
      case 'third':
        return 'col-span-2 md:col-span-1 lg:col-span-1';
      default:
        return 'col-span-2 md:col-span-1';
    }
  }

  /**
   * Obtener número de columnas del grid
   */
  getGridColumns(): number {
    const layout = this.formLayout();
    return layout?.columns || 2;
  }

  /**
   * Obtener estilo inline para el grid según el número de columnas
   */
  getGridStyle(): { [key: string]: string } {
    const columns = this.getGridColumns();
    return {
      'display': 'grid',
      'grid-template-columns': `repeat(${columns}, minmax(0, 1fr))`,
      'gap': '1.5rem'
    };
  }

  /**
   * Obtener estilo inline para posicionar un campo en el grid
   */
  getFieldStyle(field: any): { [key: string]: string } {
    const layout = this.formLayout();

    // Si no hay layout, usar comportamiento por defecto (flow normal del grid)
    if (!layout || !layout.fields || !field.id) {
      return {};
    }

    const position = layout.fields[field.id];

    // Si el campo no tiene posición en el layout, usar flow normal
    if (!position) {
      return {};
    }

    // Calcular grid-column basado en la columna y colSpan
    const colStart = position.col + 1; // CSS Grid usa índices 1-based
    const colEnd = colStart + (position.colSpan || 1);

    // Calcular grid-row
    const rowStart = position.row + 1; // CSS Grid usa índices 1-based

    return {
      'grid-column': `${colStart} / ${colEnd}`,
      'grid-row': `${rowStart}`
    };
  }
}
