import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CompaniesService } from '../../companies/services/companies.service';
import { Company } from '../../companies/models';
import { AuthService } from '../../../../core/services/auth.service';

export interface CompanyFormDialogData {
  company?: Company;  // Si existe, es modo edición; si no, es creación
}

export interface CompanyFormDialogResult {
  companyId?: string;
  updated?: boolean;
}

type DialogMode = 'create' | 'edit';

@Component({
  selector: 'app-company-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule
  ],
  template: `
    <div class="dialog-container">
      <!-- Header Compacto -->
      <div class="dialog-header">
        <div class="flex items-center gap-3">
          <div class="header-icon-box">
            <mat-icon>{{ mode() === 'create' ? 'add_business' : 'edit_note' }}</mat-icon>
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-800 m-0">
              {{ mode() === 'create' ? 'Nueva Empresa' : 'Editar Empresa' }}
            </h2>
            <p class="text-xs text-slate-500 m-0">
              {{ mode() === 'create' ? 'Crear empresa subcontratista' : data?.company?.legalName }}
            </p>
          </div>
        </div>
        <button type="button" class="close-btn" (click)="cancel()" title="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <form [formGroup]="companyForm" (ngSubmit)="save()" class="dialog-content">
        <div class="form-grid">

          <!-- Nombre Legal -->
          <div class="form-group full-width">
            <label class="form-label">
              <mat-icon>business</mat-icon>
              Nombre Legal <span class="required">*</span>
            </label>
            <input
              type="text"
              class="form-input"
              formControlName="legalName"
              placeholder="Ej: Construcciones ABC, S.A.">
            @if (hasError('legalName')) {
              <span class="form-error">{{ getErrorMessage('legalName') }}</span>
            }
          </div>

          <!-- Tax ID -->
          <div class="form-group">
            <label class="form-label">
              <mat-icon>badge</mat-icon>
              Tax ID <span class="required">*</span>
            </label>
            <input
              type="text"
              class="form-input font-mono"
              formControlName="taxId"
              placeholder="12-3456789">
            @if (hasError('taxId')) {
              <span class="form-error">{{ getErrorMessage('taxId') }}</span>
            }
          </div>

          <!-- Email -->
          <div class="form-group">
            <label class="form-label">
              <mat-icon>email</mat-icon>
              Email
            </label>
            <input
              type="email"
              class="form-input"
              formControlName="email"
              placeholder="contacto@empresa.com">
            @if (hasError('email')) {
              <span class="form-error">{{ getErrorMessage('email') }}</span>
            }
          </div>

          <!-- Teléfono -->
          <div class="form-group">
            <label class="form-label">
              <mat-icon>phone</mat-icon>
              Teléfono
            </label>
            <input
              type="tel"
              class="form-input"
              formControlName="phone"
              placeholder="+1 (555) 123-4567">
          </div>

          <!-- Dirección -->
          <div class="form-group">
            <label class="form-label">
              <mat-icon>location_on</mat-icon>
              Dirección
            </label>
            <textarea
              class="form-input form-textarea"
              formControlName="address"
              placeholder="Dirección completa"
              rows="2"></textarea>
          </div>

        </div>

        <!-- Info de creación (solo en modo edición) -->
        @if (mode() === 'edit' && data?.company?.createdAt) {
          <div class="creation-info">
            <mat-icon>calendar_today</mat-icon>
            Creada: {{ formatDate(data!.company!.createdAt) }}
          </div>
        }
      </form>

      <!-- Footer Compacto -->
      <div class="dialog-footer">
        <button type="button" class="btn-cancel" (click)="cancel()" [disabled]="isSaving()">
          Cancelar
        </button>
        <button
          type="button"
          class="btn-save"
          (click)="save()"
          [disabled]="isSaving() || companyForm.invalid || (mode() === 'edit' && !companyForm.dirty)">
          @if (isSaving()) {
            <div class="btn-spinner"></div>
          } @else {
            <mat-icon>save</mat-icon>
          }
          <span>{{ mode() === 'create' ? 'Crear Empresa' : 'Guardar Cambios' }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* Container */
    .dialog-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }

    /* Header Compacto */
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid #e2e8f0;
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    }

    .header-icon-box {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    }

    .header-icon-box mat-icon {
      color: white;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      transition: all 0.15s;
    }

    .close-btn:hover {
      background: #fee2e2;
      color: #dc2626;
    }

    .close-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Content */
    .dialog-content {
      padding: 18px;
      overflow-y: auto;
      max-height: 60vh;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      grid-column: span 2;
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }

    .form-label mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #f59e0b;
    }

    .form-label .required {
      color: #dc2626;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      transition: all 0.15s;
      background: white;
    }

    .form-input:focus {
      border-color: #f59e0b;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
    }

    .form-input::placeholder {
      color: #94a3b8;
    }

    .form-textarea {
      resize: vertical;
      min-height: 60px;
    }

    .form-error {
      font-size: 11px;
      color: #dc2626;
      margin-top: 4px;
    }

    .creation-info {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 16px;
      padding: 10px 12px;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 12px;
      color: #64748b;
    }

    .creation-info mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    /* Footer Compacto */
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 18px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .btn-cancel {
      padding: 8px 16px;
      background: white;
      color: #475569;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-cancel:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .btn-cancel:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-save {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
    }

    .btn-save:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }

    .btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-save mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 640px) {
      .dialog-container {
        width: 100%;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .form-group.full-width {
        grid-column: span 1;
      }
    }
  `]
})
export class CompanyFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CompanyFormDialogComponent>);
  private companiesService = inject(CompaniesService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  data = inject<CompanyFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  mode = signal<DialogMode>('create');
  isSaving = signal(false);
  companyForm!: FormGroup;

  // Labels para mensajes de error
  private readonly fieldLabels: Record<string, string> = {
    legalName: 'Nombre Legal',
    taxId: 'Tax ID',
    email: 'Email'
  };

  ngOnInit() {
    this.mode.set(this.data?.company ? 'edit' : 'create');
    this.initForm();
  }

  private initForm() {
    const company = this.data?.company;

    this.companyForm = this.fb.group({
      legalName: [company?.legalName || '', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      taxId: [company?.taxId || '', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: [company?.email || '', [Validators.email, Validators.maxLength(100)]],
      phone: [company?.phone || '', [Validators.maxLength(20)]],
      address: [company?.address || '', [Validators.maxLength(300)]]
    });
  }

  async save() {
    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }

    if (this.mode() === 'edit' && !this.companyForm.dirty) {
      return;
    }

    this.isSaving.set(true);

    try {
      const currentUser = this.authService.authorizedUser();
      const currentUserUid = currentUser?.uid || '';

      let result;

      if (this.mode() === 'create') {
        result = await this.companiesService.createCompany(this.companyForm.value, currentUserUid);

        if (result.success) {
          this.snackBar.open('Empresa creada exitosamente', 'Cerrar', { duration: 3000 });
          this.dialogRef.close({ companyId: result.data?.id } as CompanyFormDialogResult);
        }
      } else {
        result = await this.companiesService.updateCompany(
          this.data!.company!.id,
          this.companyForm.value,
          currentUserUid
        );

        if (result.success) {
          this.snackBar.open('Empresa actualizada exitosamente', 'Cerrar', { duration: 3000 });
          this.dialogRef.close({ updated: true } as CompanyFormDialogResult);
        }
      }

      if (!result.success) {
        this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
      }
    } catch (error) {
      console.error('Error guardando empresa:', error);
      this.snackBar.open('Error al guardar la empresa', 'Cerrar', { duration: 3000 });
    } finally {
      this.isSaving.set(false);
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  hasError(fieldName: string): boolean {
    const control = this.companyForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.companyForm.get(fieldName);
    if (!control?.errors) return '';

    const errors = control.errors;
    const label = this.fieldLabels[fieldName] || fieldName;

    if (errors['required']) return `${label} es requerido`;
    if (errors['email']) return 'Formato de email inválido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;

    return 'Campo inválido';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }
}
