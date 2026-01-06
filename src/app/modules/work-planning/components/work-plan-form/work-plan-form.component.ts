import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { WorkPlansService } from '../../services/work-plans.service';
import { WorkPlansConfigService } from '../../services/work-plans-config.service';
import { WorkersService } from '../../../workers/services/workers.service';
import { ProposalsService } from '../../../projects/services/proposals.service';
import { WorkPlan, WorkPlanStatus } from '../../models';
import { Worker } from '../../../workers/models';
import { Proposal } from '../../../projects/models/proposal.interface';

interface DialogData {
  mode: 'create' | 'edit';
  plan?: WorkPlan;
}

@Component({
  selector: 'app-work-plan-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './work-plan-form.component.html',
  styleUrl: './work-plan-form.component.css'
})
export class WorkPlanFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private workPlansService = inject(WorkPlansService);
  private configService = inject(WorkPlansConfigService);
  private workersService = inject(WorkersService);
  private proposalsService = inject(ProposalsService);

  form!: FormGroup;
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  workers = signal<Worker[]>([]);
  proposals = signal<Proposal[]>([]);
  availableColors = this.configService.getAvailableColors();

  statuses: { value: WorkPlanStatus; label: string; icon: string }[] = [
    { value: 'scheduled', label: 'Planificado', icon: 'schedule' },
    { value: 'in_progress', label: 'En Progreso', icon: 'play_circle' },
    { value: 'completed', label: 'Completado', icon: 'check_circle' },
    { value: 'cancelled', label: 'Cancelado', icon: 'cancel' }
  ];

  constructor(
    public dialogRef: MatDialogRef<WorkPlanFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  async ngOnInit() {
    this.initForm();
    await this.loadData();

    if (this.data.mode === 'edit' && this.data.plan) {
      this.populateForm(this.data.plan);
    }
  }

  /**
   * Inicializar formulario
   */
  private initForm() {
    this.form = this.fb.group({
      planDate: [new Date(), Validators.required],
      workerId: [''],
      proposalId: [''],
      durationDays: [0, [Validators.required, Validators.min(0)]],
      durationHours: [0, [Validators.required, Validators.min(0), Validators.max(23)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      notes: ['', Validators.maxLength(1000)],
      location: ['', Validators.maxLength(200)],
      status: ['scheduled', Validators.required],
      color: ['#8b5cf6']
    });
  }

  /**
   * Cargar datos necesarios
   */
  private async loadData() {
    this.isLoading.set(true);
    try {
      await Promise.all([
        this.loadWorkers(),
        this.loadProposals()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Cargar trabajadores activos
   */
  private async loadWorkers() {
    try {
      await this.workersService.loadWorkers();
      const allWorkers = this.workersService.workers();
      this.workers.set(allWorkers.filter(w => w.isActive));
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  }

  /**
   * Cargar propuestas activas
   */
  private async loadProposals() {
    try {
      await this.proposalsService.loadProposals();
      const allProposals = this.proposalsService.proposals();
      // Filtrar propuestas aprobadas o enviadas
      this.proposals.set(
        allProposals.filter(p =>
          p.isActive && (p.status === 'approved' || p.status === 'sent')
        )
      );
    } catch (error) {
      console.error('Error loading proposals:', error);
    }
  }

  /**
   * Poblar formulario con datos existentes
   */
  private populateForm(plan: WorkPlan) {
    const planDate = plan.planDate instanceof Date
      ? plan.planDate
      : (plan.planDate as any).toDate();

    this.form.patchValue({
      planDate,
      workerId: plan.workerId || '',
      proposalId: plan.proposalId || '',
      durationDays: plan.durationDays,
      durationHours: plan.durationHours,
      description: plan.description || '',
      notes: plan.notes || '',
      location: plan.location || '',
      status: plan.status,
      color: plan.color || '#8b5cf6'
    });
  }

  /**
   * Guardar plan de trabajo
   */
  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    try {
      const formValue = this.form.value;

      // Obtener nombres denormalizados
      let workerName: string | undefined;
      let proposalNumber: string | undefined;
      let proposalOwnerName: string | undefined;

      if (formValue.workerId) {
        const worker = this.workers().find(w => w.id === formValue.workerId);
        workerName = worker?.fullName;
      }

      if (formValue.proposalId) {
        const proposal = this.proposals().find(p => p.id === formValue.proposalId);
        proposalNumber = proposal?.proposalNumber;
        proposalOwnerName = proposal?.ownerName;
      }

      const planData = {
        planDate: formValue.planDate,
        workerId: formValue.workerId || undefined,
        workerName,
        proposalId: formValue.proposalId || undefined,
        proposalNumber,
        proposalOwnerName,
        durationDays: formValue.durationDays,
        durationHours: formValue.durationHours,
        description: formValue.description,
        notes: formValue.notes || undefined,
        location: formValue.location || undefined,
        status: formValue.status,
        color: formValue.color
      };

      let result;
      if (this.data.mode === 'create') {
        result = await this.workPlansService.createWorkPlan(planData);
      } else {
        result = await this.workPlansService.updateWorkPlan(
          this.data.plan!.id,
          planData
        );
      }

      if (result.success) {
        this.dialogRef.close(true);
      } else {
        console.error('Error saving work plan:', result.message);
        alert(result.message);
      }
    } catch (error: any) {
      console.error('Error saving work plan:', error);
      alert('Error al guardar el plan de trabajo');
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Cerrar diálogo
   */
  onCancel() {
    this.dialogRef.close(false);
  }

  /**
   * Obtener título del diálogo
   */
  getTitle(): string {
    return this.data.mode === 'create'
      ? 'Nuevo Plan de Trabajo'
      : 'Editar Plan de Trabajo';
  }

  /**
   * Obtener icono del diálogo
   */
  getIcon(): string {
    return this.data.mode === 'create' ? 'add_circle' : 'edit';
  }

  /**
   * Obtener texto del botón guardar
   */
  getSaveButtonText(): string {
    return this.data.mode === 'create' ? 'Crear Plan' : 'Guardar Cambios';
  }

  /**
   * Validar si al menos uno de trabajador o propuesta está asignado
   */
  hasAssignment(): boolean {
    return !!(this.form.get('workerId')?.value || this.form.get('proposalId')?.value);
  }

  /**
   * Verificar si el formulario tiene errores
   */
  hasErrors(): boolean {
    return this.form.invalid || (!this.hasAssignment() && this.form.touched);
  }

  /**
   * Obtener mensaje de error para un campo
   */
  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) return 'Este campo es requerido';
    if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
    if (field.errors['max']) return `Valor máximo: ${field.errors['max'].max}`;
    if (field.errors['maxlength']) {
      return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }

    return 'Campo inválido';
  }

  /**
   * Incrementar días
   */
  incrementDays() {
    const current = this.form.get('durationDays')?.value || 0;
    this.form.patchValue({ durationDays: current + 1 });
  }

  /**
   * Decrementar días
   */
  decrementDays() {
    const current = this.form.get('durationDays')?.value || 0;
    if (current > 0) {
      this.form.patchValue({ durationDays: current - 1 });
    }
  }

  /**
   * Incrementar horas
   */
  incrementHours() {
    const current = this.form.get('durationHours')?.value || 0;
    if (current < 23) {
      this.form.patchValue({ durationHours: current + 1 });
    }
  }

  /**
   * Decrementar horas
   */
  decrementHours() {
    const current = this.form.get('durationHours')?.value || 0;
    if (current > 0) {
      this.form.patchValue({ durationHours: current - 1 });
    }
  }
}
