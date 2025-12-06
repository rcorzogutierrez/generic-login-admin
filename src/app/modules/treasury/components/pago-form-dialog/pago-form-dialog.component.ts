import { Component, OnInit, Inject, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Timestamp } from 'firebase/firestore';

import { TreasuryService } from '../../services/treasury.service';
import { WorkersService } from '../../../workers/services/workers.service';
import { ProposalsService } from '../../../projects/services/proposals.service';
import { Pago, CreatePagoData, PaymentMethod } from '../../models';

export interface PagoFormDialogData {
  pago?: Pago;
}

@Component({
  selector: 'app-pago-form-dialog',
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
          <div class="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center">
            <mat-icon class="text-white !text-2xl">{{ isEditMode ? 'edit' : 'payments' }}</mat-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-800 m-0">
              {{ isEditMode ? 'Editar Pago' : 'Nuevo Pago' }}
            </h2>
            <p class="text-sm text-slate-500 m-0">
              {{ isEditMode ? 'Modifica los datos del pago' : 'Registra un pago a trabajador' }}
            </p>
          </div>
        </div>
        <button mat-icon-button (click)="cancel()" class="!text-slate-400">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <form [formGroup]="form" (ngSubmit)="save()" class="p-6 overflow-y-auto max-h-[65vh]">

        <!-- Trabajador -->
        <div class="mb-6">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-4">
            <mat-icon class="!text-lg text-red-500">person</mat-icon>
            Trabajador
          </h3>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">
              Trabajador <span class="text-red-500">*</span>
            </label>
            <select
              class="input-field"
              formControlName="workerId"
              (change)="onWorkerChange($event)">
              <option value="">Seleccionar trabajador...</option>
              @for (worker of activeWorkers(); track worker.id) {
                <option [value]="worker.id">
                  {{ worker.fullName }}{{ worker.companyName ? ' - ' + worker.companyName : '' }}
                </option>
              }
            </select>
            @if (hasError('workerId')) {
              <span class="text-xs text-red-500 mt-1">Selecciona un trabajador</span>
            }
          </div>
        </div>

        <!-- Proyectos -->
        <div class="mb-6">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3">
            <mat-icon class="!text-lg text-red-500">assignment</mat-icon>
            Proyectos
          </h3>
          <p class="text-xs text-slate-500 mb-3">Selecciona uno o varios proyectos completados</p>

          <div class="projects-container">
            @if (invoicedProposals().length === 0) {
              <div class="flex items-center justify-center gap-2 p-6 text-slate-500">
                <mat-icon class="!text-lg">info</mat-icon>
                <span>No hay proyectos facturados disponibles</span>
              </div>
            } @else {
              @for (proposal of invoicedProposals(); track proposal.id) {
                <div
                  class="project-item"
                  [class.selected]="isProjectSelected(proposal.id)"
                  (click)="toggleProject(proposal)">
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="checkbox-indicator" [class.checked]="isProjectSelected(proposal.id)">
                      @if (isProjectSelected(proposal.id)) {
                        <mat-icon class="!text-sm">check</mat-icon>
                      }
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-slate-800 text-sm">{{ proposal.proposalNumber }}</div>
                      <div class="text-xs text-slate-500 truncate">{{ proposal.address }}</div>
                      <div class="text-xs text-slate-400">{{ proposal.ownerName }}</div>
                    </div>
                  </div>
                  <div class="text-sm font-semibold text-slate-600">
                    {{ proposal.total | currency:'USD':'symbol':'1.2-2' }}
                  </div>
                </div>
              }
            }
          </div>
          @if (selectedProposalIds().length === 0 && form.touched) {
            <span class="text-xs text-red-500 mt-2 block">Selecciona al menos un proyecto</span>
          }
          @if (selectedProposalIds().length > 0) {
            <div class="mt-2 text-xs text-slate-500">
              {{ selectedProposalIds().length }} proyecto(s) seleccionado(s)
            </div>
          }
        </div>

        <!-- Detalles del Pago -->
        <div class="mb-6">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-4">
            <mat-icon class="!text-lg text-red-500">payments</mat-icon>
            Detalles del Pago
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Monto -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">
                Monto <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  class="input-field pl-7"
                  formControlName="amount"
                  placeholder="0.00"
                  step="0.01">
              </div>
              @if (hasError('amount')) {
                <span class="text-xs text-red-500 mt-1">Ingresa un monto válido</span>
              }
            </div>

            <!-- Fecha -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">
                Fecha <span class="text-red-500">*</span>
              </label>
              <input
                type="date"
                class="input-field"
                formControlName="transactionDate">
              @if (hasError('transactionDate')) {
                <span class="text-xs text-red-500 mt-1">Selecciona la fecha</span>
              }
            </div>

            <!-- Método de pago -->
            <div class="md:col-span-2">
              <label class="block text-sm font-semibold text-slate-700 mb-2">
                Método de Pago
              </label>
              <div class="flex gap-3">
                @for (method of paymentMethods; track method.value) {
                  <label
                    class="payment-option"
                    [class.selected]="form.get('paymentMethod')?.value === method.value">
                    <input
                      type="radio"
                      formControlName="paymentMethod"
                      [value]="method.value"
                      class="hidden">
                    <mat-icon class="!text-xl">{{ method.icon }}</mat-icon>
                    <span>{{ method.label }}</span>
                  </label>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Datos del Cheque -->
        @if (form.get('paymentMethod')?.value === 'check') {
          <div class="mb-6 p-4 bg-slate-50 rounded-xl">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-4">
              <mat-icon class="!text-lg text-red-500">money</mat-icon>
              Datos del Cheque
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Número de Cheque</label>
                <input
                  type="text"
                  class="input-field"
                  formControlName="checkNumber"
                  placeholder="Ej: 001234">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Banco</label>
                <input
                  type="text"
                  class="input-field"
                  formControlName="bankName"
                  placeholder="Ej: Bank of America">
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-600 mb-2">
                  <mat-icon class="!text-sm align-middle mr-1">image</mat-icon>
                  URL de imagen del cheque
                </label>
                <input
                  type="url"
                  class="input-field"
                  formControlName="checkImageUrl"
                  placeholder="https://...">
                <span class="text-xs text-slate-400 mt-1">Opcional</span>
              </div>
            </div>
          </div>
        }

        <!-- Datos de Transferencia -->
        @if (form.get('paymentMethod')?.value === 'transfer') {
          <div class="mb-6 p-4 bg-slate-50 rounded-xl">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-4">
              <mat-icon class="!text-lg text-red-500">account_balance</mat-icon>
              Datos de la Transferencia
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Número de Referencia</label>
                <input
                  type="text"
                  class="input-field"
                  formControlName="referenceNumber"
                  placeholder="Ej: REF123456">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Banco</label>
                <input
                  type="text"
                  class="input-field"
                  formControlName="bankName"
                  placeholder="Ej: Chase">
              </div>
            </div>
          </div>
        }

        <!-- Notas -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2">
            <mat-icon class="!text-sm align-middle mr-1 text-slate-400">notes</mat-icon>
            Notas (opcional)
          </label>
          <textarea
            class="input-field resize-none"
            formControlName="notes"
            rows="2"
            placeholder="Observaciones adicionales..."></textarea>
        </div>
      </form>

      <!-- Footer -->
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
        <button mat-stroked-button (click)="cancel()" [disabled]="isSaving()">
          Cancelar
        </button>
        <button
          mat-raised-button
          (click)="save()"
          [disabled]="form.invalid || selectedProposalIds().length === 0 || isSaving()"
          class="!bg-red-600 !text-white">
          @if (isSaving()) {
            <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          } @else {
            <mat-icon>{{ isEditMode ? 'save' : 'add' }}</mat-icon>
          }
          {{ isEditMode ? 'Guardar' : 'Registrar Pago' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      background: white;
      border-radius: 1rem;
      overflow: hidden;
      min-width: 500px;
      max-width: 600px;
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
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .input-field::placeholder {
      color: #94a3b8;
    }

    .payment-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.75rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
      color: #475569;
    }

    .payment-option:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }

    .payment-option.selected {
      border-color: #ef4444;
      background: #fef2f2;
      color: #b91c1c;
    }

    .projects-container {
      border: 2px solid #e2e8f0;
      border-radius: 0.75rem;
      overflow: hidden;
      max-height: 180px;
      overflow-y: auto;
    }

    .project-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 1px solid #f1f5f9;
    }

    .project-item:last-child {
      border-bottom: none;
    }

    .project-item:hover {
      background: #f8fafc;
    }

    .project-item.selected {
      background: #fef2f2;
    }

    .checkbox-indicator {
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 0.25rem;
      border: 2px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .checkbox-indicator.checked {
      background: #ef4444;
      border-color: #ef4444;
      color: white;
    }

    @media (max-width: 640px) {
      .dialog-container {
        min-width: auto;
        width: 100%;
      }
    }
  `]
})
export class PagoFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private treasuryService = inject(TreasuryService);
  private workersService = inject(WorkersService);
  private proposalsService = inject(ProposalsService);
  private snackBar = inject(MatSnackBar);

  form!: FormGroup;
  isEditMode = false;
  isSaving = signal<boolean>(false);

  activeWorkers = this.workersService.activeWorkers;

  invoicedProposals = computed(() =>
    this.proposalsService.proposals().filter(p =>
      p.status === 'converted_to_invoice' || p.status === 'paid' || p.status === 'approved'
    )
  );

  selectedProposalIds = signal<string[]>([]);
  selectedProposalNumbers = signal<string[]>([]);

  paymentMethods = [
    { value: 'check', label: 'Cheque', icon: 'money' },
    { value: 'transfer', label: 'Transferencia', icon: 'account_balance' },
    { value: 'cash', label: 'Efectivo', icon: 'payments' }
  ];

  constructor(
    public dialogRef: MatDialogRef<PagoFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PagoFormDialogData
  ) {}

  async ngOnInit(): Promise<void> {
    this.isEditMode = !!this.data?.pago;
    this.initForm();

    await Promise.all([
      this.workersService.initialize(),
      this.proposalsService.initialize()
    ]);

    if (this.isEditMode && this.data.pago) {
      this.populateForm(this.data.pago);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      workerId: ['', Validators.required],
      workerName: [''],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      transactionDate: [this.formatDateForInput(new Date()), Validators.required],
      paymentMethod: ['check', Validators.required],
      checkNumber: [''],
      bankName: [''],
      checkImageUrl: [''],
      referenceNumber: [''],
      notes: ['']
    });
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private populateForm(pago: Pago): void {
    const transactionDate = pago.transactionDate?.toDate?.() || new Date();

    this.form.patchValue({
      workerId: pago.workerId,
      workerName: pago.workerName,
      amount: pago.amount,
      transactionDate: this.formatDateForInput(transactionDate),
      paymentMethod: pago.paymentMethod,
      checkNumber: pago.checkNumber || '',
      bankName: pago.bankName || '',
      checkImageUrl: pago.checkImageUrl || '',
      referenceNumber: pago.referenceNumber || '',
      notes: pago.notes || ''
    });

    this.selectedProposalIds.set(pago.proposalIds || []);
    this.selectedProposalNumbers.set(pago.proposalNumbers || []);
  }

  onWorkerChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const workerId = select.value;
    const worker = this.activeWorkers().find(w => w.id === workerId);

    if (worker) {
      this.form.patchValue({ workerName: worker.fullName });
    }
  }

  isProjectSelected(proposalId: string): boolean {
    return this.selectedProposalIds().includes(proposalId);
  }

  toggleProject(proposal: any): void {
    const currentIds = this.selectedProposalIds();
    const currentNumbers = this.selectedProposalNumbers();

    if (currentIds.includes(proposal.id)) {
      this.selectedProposalIds.set(currentIds.filter(id => id !== proposal.id));
      this.selectedProposalNumbers.set(currentNumbers.filter(n => n !== proposal.proposalNumber));
    } else {
      this.selectedProposalIds.set([...currentIds, proposal.id]);
      this.selectedProposalNumbers.set([...currentNumbers, proposal.proposalNumber]);
    }
  }

  hasError(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.selectedProposalIds().length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    try {
      const formValue = this.form.value;
      const pagoData: CreatePagoData = {
        workerId: formValue.workerId,
        workerName: formValue.workerName,
        proposalIds: this.selectedProposalIds(),
        proposalNumbers: this.selectedProposalNumbers(),
        amount: formValue.amount,
        transactionDate: Timestamp.fromDate(new Date(formValue.transactionDate)),
        paymentMethod: formValue.paymentMethod as PaymentMethod,
        checkNumber: formValue.checkNumber || undefined,
        bankName: formValue.bankName || undefined,
        checkImageUrl: formValue.checkImageUrl || undefined,
        referenceNumber: formValue.referenceNumber || undefined,
        notes: formValue.notes || undefined
      };

      if (this.isEditMode && this.data.pago) {
        await this.treasuryService.updatePago(this.data.pago.id, pagoData);
      } else {
        await this.treasuryService.createPago(pagoData);
      }

      this.dialogRef.close({ saved: true });
    } catch (error) {
      console.error('Error saving pago:', error);
      this.snackBar.open('Error al guardar el pago', 'OK', { duration: 3000 });
    } finally {
      this.isSaving.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
