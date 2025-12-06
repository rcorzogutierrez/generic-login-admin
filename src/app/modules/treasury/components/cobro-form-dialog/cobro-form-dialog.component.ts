import { Component, OnInit, Inject, inject, signal } from '@angular/core';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Timestamp } from 'firebase/firestore';

import { TreasuryService } from '../../services/treasury.service';
import { ClientsService } from '../../../clients/services/clients.service';
import { ProposalsService } from '../../../projects/services/proposals.service';
import { Cobro, CreateCobroData, PAYMENT_METHOD_LABELS, PaymentMethod } from '../../models';

export interface CobroFormDialogData {
  cobro?: Cobro;
}

@Component({
  selector: 'app-cobro-form-dialog',
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
    MatSnackBarModule
  ],
  template: `
    <div class="dialog-container">
      <!-- Header -->
      <div class="dialog-header">
        <div class="header-title">
          <div class="icon-wrapper">
            <mat-icon>{{ isEditMode ? 'edit' : 'savings' }}</mat-icon>
          </div>
          <div>
            <h2>{{ isEditMode ? 'Editar Cobro' : 'Nuevo Cobro' }}</h2>
            <p>{{ isEditMode ? 'Modifica los datos del cobro' : 'Registra un nuevo cobro de cliente' }}</p>
          </div>
        </div>
        <button mat-icon-button (click)="cancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="save()" class="dialog-content">
        <!-- Client & Proposal -->
        <div class="form-section">
          <h3><mat-icon>business</mat-icon> Cliente y Proyecto</h3>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Cliente</mat-label>
            <mat-select formControlName="clientId" (selectionChange)="onClientChange($event.value)">
              @for (client of clients(); track client.id) {
                <mat-option [value]="client.id">{{ client.name }}</mat-option>
              }
            </mat-select>
            @if (form.get('clientId')?.hasError('required') && form.get('clientId')?.touched) {
              <mat-error>Selecciona un cliente</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Proyecto / Factura</mat-label>
            <mat-select formControlName="proposalId" (selectionChange)="onProposalChange($event.value)">
              @for (proposal of filteredProposals(); track proposal.id) {
                <mat-option [value]="proposal.id">
                  {{ proposal.proposalNumber }} - {{ proposal.address }}
                  ({{ proposal.total | currency:'USD':'symbol':'1.2-2' }})
                </mat-option>
              }
            </mat-select>
            @if (form.get('proposalId')?.hasError('required') && form.get('proposalId')?.touched) {
              <mat-error>Selecciona un proyecto</mat-error>
            }
            @if (filteredProposals().length === 0 && form.get('clientId')?.value) {
              <mat-hint class="warning-hint">No hay proyectos facturados para este cliente</mat-hint>
            }
          </mat-form-field>
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
                <mat-label>Banco Emisor</mat-label>
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
          <button type="submit" mat-raised-button color="primary" [disabled]="form.invalid || isSaving()">
            @if (isSaving()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              <mat-icon>{{ isEditMode ? 'save' : 'add' }}</mat-icon>
              {{ isEditMode ? 'Guardar Cambios' : 'Registrar Cobro' }}
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
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
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

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .full-width {
      width: 100%;
    }

    .method-icon {
      margin-right: 8px;
      font-size: 18px;
      vertical-align: middle;
    }

    .warning-hint {
      color: #f59e0b;
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
export class CobroFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private treasuryService = inject(TreasuryService);
  private clientsService = inject(ClientsService);
  private proposalsService = inject(ProposalsService);
  private snackBar = inject(MatSnackBar);

  form!: FormGroup;
  isEditMode = false;
  isSaving = signal<boolean>(false);

  clients = this.clientsService.clients;
  proposals = this.proposalsService.proposals;
  filteredProposals = signal<any[]>([]);

  paymentMethods = [
    { value: 'check', label: PAYMENT_METHOD_LABELS.check, icon: 'money' },
    { value: 'transfer', label: PAYMENT_METHOD_LABELS.transfer, icon: 'account_balance' },
    { value: 'cash', label: PAYMENT_METHOD_LABELS.cash, icon: 'payments' }
  ];

  constructor(
    public dialogRef: MatDialogRef<CobroFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CobroFormDialogData
  ) {}

  async ngOnInit(): Promise<void> {
    this.isEditMode = !!this.data?.cobro;
    this.initForm();

    // Initialize services
    await Promise.all([
      this.clientsService.initialize(),
      this.proposalsService.initialize()
    ]);

    // If editing, populate form
    if (this.isEditMode && this.data.cobro) {
      this.populateForm(this.data.cobro);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      clientId: ['', Validators.required],
      clientName: [''],
      proposalId: ['', Validators.required],
      proposalNumber: [''],
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

  private populateForm(cobro: Cobro): void {
    this.form.patchValue({
      clientId: cobro.clientId,
      clientName: cobro.clientName,
      proposalId: cobro.proposalId,
      proposalNumber: cobro.proposalNumber,
      amount: cobro.amount,
      transactionDate: cobro.transactionDate?.toDate() || new Date(),
      paymentMethod: cobro.paymentMethod,
      checkNumber: cobro.checkNumber || '',
      bankName: cobro.bankName || '',
      checkImageUrl: cobro.checkImageUrl || '',
      referenceNumber: cobro.referenceNumber || '',
      notes: cobro.notes || ''
    });

    // Filter proposals for this client
    this.filterProposalsByClient(cobro.clientId);
  }

  onClientChange(clientId: string): void {
    const client = this.clients().find(c => c.id === clientId);
    if (client) {
      this.form.patchValue({ clientName: client.name });
    }
    this.filterProposalsByClient(clientId);
    this.form.patchValue({ proposalId: '', proposalNumber: '' });
  }

  onProposalChange(proposalId: string): void {
    const proposal = this.proposals().find(p => p.id === proposalId);
    if (proposal) {
      this.form.patchValue({ proposalNumber: proposal.proposalNumber });
    }
  }

  private filterProposalsByClient(clientId: string): void {
    // Filter proposals by client and status (converted_to_invoice or paid)
    const filtered = this.proposals().filter(p =>
      p.ownerId === clientId &&
      (p.status === 'converted_to_invoice' || p.status === 'paid' || p.status === 'approved')
    );
    this.filteredProposals.set(filtered);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    try {
      const formValue = this.form.value;
      const cobroData: CreateCobroData = {
        clientId: formValue.clientId,
        clientName: formValue.clientName,
        proposalId: formValue.proposalId,
        proposalNumber: formValue.proposalNumber,
        amount: formValue.amount,
        transactionDate: Timestamp.fromDate(formValue.transactionDate),
        paymentMethod: formValue.paymentMethod as PaymentMethod,
        checkNumber: formValue.checkNumber || undefined,
        bankName: formValue.bankName || undefined,
        checkImageUrl: formValue.checkImageUrl || undefined,
        referenceNumber: formValue.referenceNumber || undefined,
        notes: formValue.notes || undefined
      };

      if (this.isEditMode && this.data.cobro) {
        await this.treasuryService.updateCobro(this.data.cobro.id, cobroData);
      } else {
        await this.treasuryService.createCobro(cobroData);
      }

      this.dialogRef.close({ saved: true });
    } catch (error) {
      console.error('Error saving cobro:', error);
      this.snackBar.open('Error al guardar el cobro', 'OK', { duration: 3000 });
    } finally {
      this.isSaving.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
