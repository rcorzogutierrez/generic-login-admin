// src/app/modules/workers/components/worker-form/worker-form.component.ts

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

import { WorkersService } from '../../services/workers.service';
import { Worker } from '../../models';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

type FormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-worker-form',
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
  templateUrl: './worker-form.component.html',
  styleUrl: './worker-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkerFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workersService = inject(WorkersService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  mode = signal<FormMode>('create');
  workerForm!: FormGroup;
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  currentWorker = signal<Worker | null>(null);

  constructor() {}

  async ngOnInit() {
    await this.initializeForm();
  }

  private async initializeForm() {
    try {
      this.isLoading.set(true);

      // Determinar modo según ruta
      const workerId = this.route.snapshot.paramMap.get('id');
      const isViewMode = this.route.snapshot.data['mode'] === 'view';

      if (workerId) {
        // Modo editar o ver
        this.mode.set(isViewMode ? 'view' : 'edit');
        await this.loadWorker(workerId);
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

  private async loadWorker(workerId: string) {
    try {
      // Inicializar servicio si no está inicializado
      await this.workersService.initialize();

      const worker = this.workersService.workers().find(w => w.id === workerId);

      if (!worker) {
        this.snackBar.open('Trabajador no encontrado', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/workers']);
        return;
      }

      this.currentWorker.set(worker);
      this.buildForm(worker);

    } catch (error) {
      console.error('Error cargando trabajador:', error);
      this.snackBar.open('Error al cargar el trabajador', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/workers']);
    }
  }

  private buildForm(worker?: Worker) {
    const isViewMode = this.mode() === 'view';

    this.workerForm = this.fb.group({
      name: [
        { value: worker?.name || '', disabled: isViewMode },
        [Validators.required, Validators.minLength(2), Validators.maxLength(100)]
      ],
      email: [
        { value: worker?.email || '', disabled: isViewMode },
        [Validators.required, Validators.email]
      ],
      phone: [
        { value: worker?.phone || '', disabled: isViewMode },
        [Validators.maxLength(20)]
      ],
      position: [
        { value: worker?.position || '', disabled: isViewMode },
        [Validators.maxLength(100)]
      ],
      isActive: [
        { value: worker?.isActive ?? true, disabled: isViewMode }
      ]
    });
  }

  async onSubmit() {
    if (this.workerForm.invalid) {
      this.workerForm.markAllAsTouched();
      this.snackBar.open('Por favor, completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.isSaving.set(true);
      const formValue = this.workerForm.value;

      if (this.mode() === 'create') {
        // Crear nuevo trabajador
        const result = await this.workersService.createWorker(formValue, 'current-user-uid');

        if (result.success) {
          this.snackBar.open('Trabajador creado exitosamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/workers']);
        } else {
          this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
        }

      } else if (this.mode() === 'edit') {
        // Actualizar trabajador existente
        const worker = this.currentWorker();
        if (!worker) return;

        const result = await this.workersService.updateWorker(worker.id, formValue);

        if (result.success) {
          this.snackBar.open('Trabajador actualizado exitosamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/workers']);
        } else {
          this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
        }
      }

    } catch (error) {
      console.error('Error guardando trabajador:', error);
      this.snackBar.open('Error al guardar el trabajador', 'Cerrar', { duration: 3000 });
    } finally {
      this.isSaving.set(false);
    }
  }

  onCancel() {
    if (this.workerForm.dirty) {
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
          this.router.navigate(['/workers']);
        }
      });
    } else {
      this.router.navigate(['/workers']);
    }
  }

  enableEdit() {
    this.mode.set('edit');
    this.workerForm.enable();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.workerForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors = control.errors;

    if (errors['required']) return 'Este campo es requerido';
    if (errors['email']) return 'Formato de email inválido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;

    return 'Campo inválido';
  }

  hasError(fieldName: string): boolean {
    const control = this.workerForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }
}
