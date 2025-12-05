import { Component, OnInit, signal, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { WorkersService } from '../../services/workers.service';
import { Worker, WorkerType, WORKER_TYPE_LABELS } from '../../models';
import { CompaniesService } from '../../companies/services/companies.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../../core/services/auth.service';
import { CreateCompanyDialogComponent } from '../create-company-dialog/create-company-dialog.component';

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
    MatSelectModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule
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
  private companiesService = inject(CompaniesService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  mode = signal<FormMode>('create');
  workerForm!: FormGroup;
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  currentWorker = signal<Worker | null>(null);

  // Lista de empresas para el selector
  companies = this.companiesService.activeCompanies;

  // Labels para tipos de trabajador
  workerTypeLabels = WORKER_TYPE_LABELS;

  // Controlar visibilidad del selector de empresa
  showCompanySelector = signal<boolean>(false);

  constructor() {}

  async ngOnInit() {
    await this.initializeForm();
  }

  private async initializeForm() {
    try {
      this.isLoading.set(true);

      // Cargar empresas
      await this.companiesService.initialize();

      // Determinar modo según ruta
      const workerId = this.route.snapshot.paramMap.get('id');
      const isViewMode = this.route.snapshot.data['mode'] === 'view';

      // Verificar si viene con companyId preseleccionada
      const preselectedCompanyId = this.route.snapshot.queryParams['companyId'];

      if (workerId) {
        this.mode.set(isViewMode ? 'view' : 'edit');
        await this.loadWorker(workerId);
      } else {
        this.mode.set('create');
        this.buildForm(undefined, preselectedCompanyId);
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

  private async loadWorker(workerId: string) {
    try {
      await this.workersService.initialize();

      const worker = this.workersService.workers().find(w => w.id === workerId);

      if (!worker) {
        this.snackBar.open('Trabajador no encontrado', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/modules/workers']);
        return;
      }

      this.currentWorker.set(worker);
      this.buildForm(worker);

    } catch (error) {
      console.error('Error cargando trabajador:', error);
      this.snackBar.open('Error al cargar el trabajador', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/modules/workers']);
    }
  }

  private buildForm(worker?: Worker, preselectedCompanyId?: string) {
    const isViewMode = this.mode() === 'view';

    // Determinar tipo de trabajador inicial
    let initialWorkerType: WorkerType = 'internal';
    let initialCompanyId = '';

    if (worker) {
      initialWorkerType = worker.workerType || 'internal';
      initialCompanyId = worker.companyId || '';
    } else if (preselectedCompanyId) {
      initialWorkerType = 'contractor';
      initialCompanyId = preselectedCompanyId;
    }

    this.showCompanySelector.set(initialWorkerType === 'contractor');

    this.workerForm = this.fb.group({
      // Tipo de trabajador
      workerType: [
        { value: initialWorkerType, disabled: isViewMode },
        [Validators.required]
      ],
      companyId: [
        { value: initialCompanyId, disabled: isViewMode }
      ],

      // Datos personales
      fullName: [
        { value: worker?.fullName || '', disabled: isViewMode },
        [Validators.required, Validators.minLength(2), Validators.maxLength(200)]
      ],
      idOrLicense: [
        { value: worker?.idOrLicense || '', disabled: isViewMode },
        [Validators.maxLength(50)]
      ],
      socialSecurity: [
        { value: worker?.socialSecurity || '', disabled: isViewMode },
        [Validators.maxLength(20)]
      ],
      address: [
        { value: worker?.address || '', disabled: isViewMode },
        [Validators.maxLength(300)]
      ],
      phone: [
        { value: worker?.phone || '', disabled: isViewMode },
        [Validators.maxLength(20)]
      ]
    });

    // Escuchar cambios en workerType
    this.workerForm.get('workerType')?.valueChanges.subscribe((type: WorkerType) => {
      this.showCompanySelector.set(type === 'contractor');
      if (type !== 'contractor') {
        this.workerForm.patchValue({ companyId: '' });
      }
      this.cdr.markForCheck();
    });
  }

  onWorkerTypeChange(type: WorkerType) {
    this.showCompanySelector.set(type === 'contractor');
    if (type !== 'contractor') {
      this.workerForm.patchValue({ companyId: '' });
    }
  }

  openCreateCompanyDialog() {
    const dialogRef = this.dialog.open(CreateCompanyDialogComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.companyId) {
        // Recargar empresas y seleccionar la nueva
        await this.companiesService.forceReload();
        this.workerForm.patchValue({ companyId: result.companyId });
        this.snackBar.open('Empresa creada y seleccionada', 'Cerrar', { duration: 3000 });
        this.cdr.markForCheck();
      }
    });
  }

  async onSubmit() {
    if (this.workerForm.invalid) {
      this.workerForm.markAllAsTouched();
      this.snackBar.open('Por favor, completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    // Validar que si es contractor, tenga empresa seleccionada
    const formValue = this.workerForm.value;
    if (formValue.workerType === 'contractor' && !formValue.companyId) {
      this.snackBar.open('Por favor, selecciona una empresa para el trabajador subcontratado', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.isSaving.set(true);
      this.cdr.markForCheck();

      const currentUser = this.authService.authorizedUser();
      const currentUserUid = currentUser?.uid || '';

      // Obtener nombre de la empresa si es contractor
      let companyName = '';
      if (formValue.workerType === 'contractor' && formValue.companyId) {
        const company = this.companiesService.getCompanyById(formValue.companyId);
        companyName = company?.legalName || '';
      }

      const workerData: Partial<Worker> = {
        fullName: formValue.fullName,
        idOrLicense: formValue.idOrLicense || '',
        socialSecurity: formValue.socialSecurity || '',
        address: formValue.address || '',
        phone: formValue.phone || '',
        workerType: formValue.workerType,
        companyId: formValue.workerType === 'contractor' ? formValue.companyId : '',
        companyName: formValue.workerType === 'contractor' ? companyName : ''
      };

      if (this.mode() === 'create') {
        const result = await this.workersService.createWorker(workerData, currentUserUid);

        if (result.success) {
          this.snackBar.open('Trabajador creado exitosamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/modules/workers']);
        } else {
          this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
        }

      } else if (this.mode() === 'edit') {
        const worker = this.currentWorker();
        if (!worker) return;

        const result = await this.workersService.updateWorker(worker.id, workerData, currentUserUid);

        if (result.success) {
          this.snackBar.open('Trabajador actualizado exitosamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/modules/workers']);
        } else {
          this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
        }
      }

    } catch (error) {
      console.error('Error guardando trabajador:', error);
      this.snackBar.open('Error al guardar el trabajador', 'Cerrar', { duration: 3000 });
    } finally {
      this.isSaving.set(false);
      this.cdr.markForCheck();
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
          this.router.navigate(['/modules/workers']);
        }
      });
    } else {
      this.router.navigate(['/modules/workers']);
    }
  }

  enableEdit() {
    this.mode.set('edit');
    this.workerForm.enable();
    this.cdr.markForCheck();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.workerForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const labels: Record<string, string> = {
      fullName: 'Nombre',
      idOrLicense: 'ID/Licencia',
      socialSecurity: 'Social Security',
      address: 'Dirección',
      phone: 'Teléfono',
      workerType: 'Tipo de trabajador',
      companyId: 'Empresa'
    };

    const errors = control.errors;
    const label = labels[fieldName] || fieldName;

    if (errors['required']) return `${label} es requerido`;
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;

    return 'Campo inválido';
  }

  hasError(fieldName: string): boolean {
    const control = this.workerForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  getCompanyName(companyId: string): string {
    const company = this.companiesService.getCompanyById(companyId);
    return company?.legalName || 'Empresa no encontrada';
  }
}
