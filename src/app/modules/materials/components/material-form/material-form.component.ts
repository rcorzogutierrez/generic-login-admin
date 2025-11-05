// src/app/modules/materials/components/material-form/material-form.component.ts

import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';

import { MaterialsService } from '../../services/materials.service';
import { Material } from '../../models';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

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
    MatCheckboxModule,
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
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  mode = signal<FormMode>('create');
  materialForm!: FormGroup;
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  currentMaterial = signal<Material | null>(null);

  constructor() {}

  async ngOnInit() {
    await this.initializeForm();
  }

  private async initializeForm() {
    try {
      this.isLoading.set(true);

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

    } catch (error) {
      console.error('Error inicializando formulario:', error);
      this.snackBar.open('Error al cargar el formulario', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadMaterial(materialId: string) {
    try {
      // Inicializar servicio si no está inicializado
      await this.materialsService.initialize();

      const material = this.materialsService.materials().find(m => m.id === materialId);

      if (!material) {
        this.snackBar.open('Material no encontrado', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/materials']);
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
    const isViewMode = this.mode() === 'view';

    this.materialForm = this.fb.group({
      name: [
        { value: material?.name || '', disabled: isViewMode },
        [Validators.required, Validators.minLength(2), Validators.maxLength(100)]
      ],
      code: [
        { value: material?.code || '', disabled: isViewMode },
        [Validators.required, Validators.minLength(2), Validators.maxLength(50)]
      ],
      description: [
        { value: material?.description || '', disabled: isViewMode },
        [Validators.maxLength(500)]
      ],
      isActive: [
        { value: material?.isActive ?? true, disabled: isViewMode }
      ]
    });
  }

  async onSubmit() {
    if (this.materialForm.invalid) {
      this.materialForm.markAllAsTouched();
      this.snackBar.open('Por favor, completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.isSaving.set(true);
      const formValue = this.materialForm.value;

      if (this.mode() === 'create') {
        // Crear nuevo material
        const result = await this.materialsService.createMaterial(formValue, 'current-user-uid');

        if (result.success) {
          this.snackBar.open('Material creado exitosamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/materials']);
        } else {
          this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
        }

      } else if (this.mode() === 'edit') {
        // Actualizar material existente
        const material = this.currentMaterial();
        if (!material) return;

        const result = await this.materialsService.updateMaterial(material.id, formValue);

        if (result.success) {
          this.snackBar.open('Material actualizado exitosamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/materials']);
        } else {
          this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
        }
      }

    } catch (error) {
      console.error('Error guardando material:', error);
      this.snackBar.open('Error al guardar el material', 'Cerrar', { duration: 3000 });
    } finally {
      this.isSaving.set(false);
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
          this.router.navigate(['/materials']);
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

    const errors = control.errors;

    if (errors['required']) return 'Este campo es requerido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;

    return 'Campo inválido';
  }

  hasError(fieldName: string): boolean {
    const control = this.materialForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }
}
