import { Component, OnInit, Inject, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Timestamp } from 'firebase/firestore';

import { TreasuryService } from '../../services/treasury.service';
import { WorkersService } from '../../../workers/services/workers.service';
import { ProposalsService } from '../../../projects/services/proposals.service';
import { Pago, CreatePagoData, PAYMENT_METHOD_LABELS, PaymentMethod } from '../../models';

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
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dialog-container">
      <!-- Header -->
      <div class="dialog-header">
        <div class="header-title">
          <div class="icon-wrapper">
            <mat-icon>{{ isEditMode ? 'edit' : 'payments' }}</mat-icon>
          </div>
          <div>
            <h2>{{ isEditMode ? 'Editar Pago' : 'Nuevo Pago' }}</h2>
            <p>{{ isEditMode ? 'Modifica los datos del pago' : 'Registra un pago a trabajador' }}</p>
          </div>
        </div>
        <button mat-icon-button (click)="cancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="save()" class="dialog-content">
        <!-- Worker Selection -->
        <div class="form-section">
          <h3><mat-icon>person</mat-icon> Trabajador</h3>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Trabajador</mat-label>
            <mat-select formControlName="workerId" (selectionChange)="onWorkerChange($event.value)">
              @for (worker of activeWorkers(); track worker.id) {
                <mat-option [value]="worker.id">
                  {{ worker.fullName }}
                  @if (worker.companyName) {
                    <span class="worker-company"> - {{ worker.companyName }}</span>
                  }
                </mat-option>
              }
            </mat-select>
            @if (form.get('workerId')?.hasError('required') && form.get('workerId')?.touched) {
              <mat-error>Selecciona un trabajador</mat-error>
            }
          </mat-form-field>
        </div>

        <!-- Projects Selection -->
        <div class="form-section">
          <h3><mat-icon>assignment</mat-icon> Proyectos</h3>
          <p class="section-hint">Selecciona uno o varios proyectos completados por este trabajador</p>

          <div class="projects-selection">
            @if (invoicedProposals().length === 0) {
              <div class="no-projects">
                <mat-icon>info</mat-icon>
                <span>No hay proyectos facturados disponibles</span>
              </div>
            } @else {
              @for (proposal of invoicedProposals(); track proposal.id) {
                <div class="project-item"
                     [class.selected]="isProjectSelected(proposal.id)"
                     (click)="toggleProject(proposal)">
                  <mat-checkbox
                    [checked]="isProjectSelected(proposal.id)"
                    (click)="$event.stopPropagation()">
                  </mat-checkbox>
                  <div class="project-info">
                    <span class="project-number">{{ proposal.proposalNumber }}</span>
                    <span class="project-address">{{ proposal.address }}</span>
                    <span class="project-client">{{ proposal.ownerName }}</span>
                  </div>
                  <span class="project-total">{{ proposal.total | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
              }
            }
          </div>
          @if (selectedProposalIds().length === 0 && form.touched) {
            <mat-error class="projects-error">Selecciona al menos un proyecto</mat-error>
          }
        </div>

        <!-- Payment Details -->
        <div class="form-section">
          <h3><mat-icon>payments</mat-icon> Detalles del Pago</h3>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Monto</mat-label>
              <span matPrefix>$ &nbsp;</span>
              <input matInput type="number" formControlName="amount" placeholder="0.00">
              @if (form.get('amount')?.hasError('required') && form.get('amount')?.touched) {
                <mat-error>Ingresa el monto</mat-error>
              }
              @if (form.get('amount')?.hasError('min')) {
                <mat-error>El monto debe ser mayor a 0</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Fecha</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="transactionDate">
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
              @if (form.get('transactionDate')?.hasError('required') && form.get('transactionDate')?.touched) {
                <mat-error>Selecciona la fecha</mat-error>
              }
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Método de Pago</mat-label>
            <mat-select formControlName="paymentMethod">
              @for (method of paymentMethods; track method.value) {
                <mat-option [value]="method.value">
                  <mat-icon class="method-icon">{{ method.icon }}</mat-icon>
                  {{ method.label }}
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Check/Transfer Details -->
        @if (form.get('paymentMethod')?.value === 'check') {
          <div class="form-section">
            <h3><mat-icon>money</mat-icon> Datos del Cheque</h3>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Número de Cheque</mat-label>
                <input matInput formControlName="checkNumber" placeholder="Ej: 001234">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Banco</mat-label>
                <input matInput formControlName="bankName" placeholder="Ej: Bank of America">
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>URL de imagen del cheque</mat-label>
              <input matInput formControlName="checkImageUrl" placeholder="https://...">
              <mat-icon matSuffix>image</mat-icon>
              <mat-hint>Pega la URL de la imagen del cheque (opcional)</mat-hint>
            </mat-form-field>
          </div>
        }

        @if (form.get('paymentMethod')?.value === 'transfer') {
          <div class="form-section">
            <h3><mat-icon>account_balance</mat-icon> Datos de la Transferencia</h3>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Número de Referencia</mat-label>
                <input matInput formControlName="referenceNumber" placeholder="Ej: REF123456">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Banco</mat-label>
                <input matInput formControlName="bankName" placeholder="Ej: Chase">
              </mat-form-field>
            </div>
          </div>
        }

        <!-- Notes -->
        <div class="form-section">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Notas (opcional)</mat-label>
            <textarea matInput formControlName="notes" rows="2" placeholder="Observaciones adicionales..."></textarea>
          </mat-form-field>
        </div>

        <!-- Actions -->
        <div class="dialog-actions">
          <button type="button" mat-stroked-button (click)="cancel()">
            Cancelar
          </button>
          <button type="submit" mat-raised-button color="accent"
                  [disabled]="form.invalid || selectedProposalIds().length === 0 || isSaving()">
            @if (isSaving()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              <mat-icon>{{ isEditMode ? 'save' : 'add' }}</mat-icon>
              {{ isEditMode ? 'Guardar Cambios' : 'Registrar Pago' }}
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.5rem 1.5rem 1rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .icon-wrapper {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        color: white;
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .header-title h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1e293b;
    }

    .header-title p {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      color: #64748b;
    }

    .dialog-content {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .form-section {
      margin-bottom: 1.5rem;

      h3 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0 0 1rem;
        font-size: 0.9rem;
        font-weight: 600;
        color: #475569;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: #64748b;
        }
      }
    }

    .section-hint {
      margin: -0.5rem 0 1rem;
      font-size: 0.85rem;
      color: #64748b;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .full-width {
      width: 100%;
    }

    .worker-company {
      color: #64748b;
      font-size: 0.85rem;
    }

    .projects-selection {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      max-height: 200px;
      overflow-y: auto;
    }

    .project-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      transition: background 0.2s;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: #f8fafc;
      }

      &.selected {
        background: #eff6ff;
      }
    }

    .project-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .project-number {
      font-weight: 600;
      color: #1e293b;
      font-size: 0.9rem;
    }

    .project-address {
      font-size: 0.8rem;
      color: #64748b;
    }

    .project-client {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .project-total {
      font-weight: 600;
      color: #475569;
      font-size: 0.9rem;
    }

    .no-projects {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2rem;
      color: #64748b;

      mat-icon {
        color: #94a3b8;
      }
    }

    .projects-error {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.75rem;
    }

    .method-icon {
      margin-right: 8px;
      font-size: 18px;
      vertical-align: middle;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
    }

    @media (max-width: 600px) {
      .form-row {
        grid-template-columns: 1fr;
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

  // Workers
  activeWorkers = this.workersService.activeWorkers;

  // Proposals - only invoiced/completed ones
  invoicedProposals = computed(() =>
    this.proposalsService.proposals().filter(p =>
      p.status === 'converted_to_invoice' || p.status === 'paid' || p.status === 'approved'
    )
  );

  // Selected projects
  selectedProposalIds = signal<string[]>([]);
  selectedProposalNumbers = signal<string[]>([]);

  paymentMethods = [
    { value: 'check', label: PAYMENT_METHOD_LABELS.check, icon: 'money' },
    { value: 'transfer', label: PAYMENT_METHOD_LABELS.transfer, icon: 'account_balance' },
    { value: 'cash', label: PAYMENT_METHOD_LABELS.cash, icon: 'payments' }
  ];

  constructor(
    public dialogRef: MatDialogRef<PagoFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PagoFormDialogData
  ) {}

  async ngOnInit(): Promise<void> {
    this.isEditMode = !!this.data?.pago;
    this.initForm();

    // Initialize services
    await Promise.all([
      this.workersService.initialize(),
      this.proposalsService.initialize()
    ]);

    // If editing, populate form
    if (this.isEditMode && this.data.pago) {
      this.populateForm(this.data.pago);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      workerId: ['', Validators.required],
      workerName: [''],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      transactionDate: [new Date(), Validators.required],
      paymentMethod: ['check', Validators.required],
      checkNumber: [''],
      bankName: [''],
      checkImageUrl: [''],
      referenceNumber: [''],
      notes: ['']
    });
  }

  private populateForm(pago: Pago): void {
    this.form.patchValue({
      workerId: pago.workerId,
      workerName: pago.workerName,
      amount: pago.amount,
      transactionDate: pago.transactionDate?.toDate() || new Date(),
      paymentMethod: pago.paymentMethod,
      checkNumber: pago.checkNumber || '',
      bankName: pago.bankName || '',
      checkImageUrl: pago.checkImageUrl || '',
      referenceNumber: pago.referenceNumber || '',
      notes: pago.notes || ''
    });

    // Set selected projects
    this.selectedProposalIds.set(pago.proposalIds || []);
    this.selectedProposalNumbers.set(pago.proposalNumbers || []);
  }

  onWorkerChange(workerId: string): void {
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
      // Remove
      this.selectedProposalIds.set(currentIds.filter(id => id !== proposal.id));
      this.selectedProposalNumbers.set(currentNumbers.filter(n => n !== proposal.proposalNumber));
    } else {
      // Add
      this.selectedProposalIds.set([...currentIds, proposal.id]);
      this.selectedProposalNumbers.set([...currentNumbers, proposal.proposalNumber]);
    }
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
        transactionDate: Timestamp.fromDate(formValue.transactionDate),
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
