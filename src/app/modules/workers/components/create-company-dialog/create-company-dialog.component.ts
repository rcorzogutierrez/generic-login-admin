import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CompaniesService } from '../../../companies/services/companies.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-create-company-dialog',
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
      <!-- Header -->
      <div class="dialog-header">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <mat-icon class="text-white !text-2xl">add_business</mat-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-800 m-0">Nueva Empresa</h2>
            <p class="text-sm text-slate-500 m-0">Crear empresa subcontratista</p>
          </div>
        </div>
        <button mat-icon-button (click)="cancel()" class="!text-slate-400">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <form [formGroup]="companyForm" (ngSubmit)="save()" class="dialog-content">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

          <!-- Nombre Legal -->
          <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              <mat-icon class="!text-lg text-indigo-500 align-middle mr-1">business</mat-icon>
              Nombre Legal <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              class="input-field"
              formControlName="legalName"
              placeholder="Ej: Construcciones ABC, S.A.">
            @if (hasError('legalName')) {
              <span class="text-xs text-red-500 mt-1">{{ getErrorMessage('legalName') }}</span>
            }
          </div>

          <!-- Tax ID -->
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              <mat-icon class="!text-lg text-indigo-500 align-middle mr-1">badge</mat-icon>
              Tax ID <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              class="input-field font-mono"
              formControlName="taxId"
              placeholder="12-3456789">
            @if (hasError('taxId')) {
              <span class="text-xs text-red-500 mt-1">{{ getErrorMessage('taxId') }}</span>
            }
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              <mat-icon class="!text-lg text-indigo-500 align-middle mr-1">email</mat-icon>
              Email
            </label>
            <input
              type="email"
              class="input-field"
              formControlName="email"
              placeholder="contacto@empresa.com">
            @if (hasError('email')) {
              <span class="text-xs text-red-500 mt-1">{{ getErrorMessage('email') }}</span>
            }
          </div>

          <!-- Teléfono -->
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              <mat-icon class="!text-lg text-indigo-500 align-middle mr-1">phone</mat-icon>
              Teléfono
            </label>
            <input
              type="tel"
              class="input-field"
              formControlName="phone"
              placeholder="+1 (555) 123-4567">
          </div>

          <!-- Dirección -->
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-2">
              <mat-icon class="!text-lg text-indigo-500 align-middle mr-1">location_on</mat-icon>
              Dirección
            </label>
            <textarea
              class="input-field !h-auto"
              formControlName="address"
              placeholder="Dirección completa"
              rows="2"></textarea>
          </div>

        </div>
      </form>

      <!-- Footer -->
      <div class="dialog-footer">
        <button mat-stroked-button (click)="cancel()" [disabled]="isSaving()">
          Cancelar
        </button>
        <button
          mat-raised-button
          color="primary"
          (click)="save()"
          [disabled]="isSaving() || companyForm.invalid"
          class="!bg-indigo-600">
          @if (isSaving()) {
            <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          } @else {
            <mat-icon>save</mat-icon>
          }
          Crear Empresa
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      min-width: 500px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .dialog-content {
      padding: 1.5rem;
      max-height: 60vh;
      overflow-y: auto;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .input-field {
      width: 100%;
      padding: 10px 14px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
      outline: none;
    }

    .input-field:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .input-field::placeholder {
      color: #94a3b8;
    }

    @media (max-width: 640px) {
      .dialog-container {
        min-width: auto;
        width: 100%;
      }
    }
  `]
})
export class CreateCompanyDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CreateCompanyDialogComponent>);
  private companiesService = inject(CompaniesService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  isSaving = signal(false);

  companyForm: FormGroup = this.fb.group({
    legalName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    taxId: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    email: ['', [Validators.email, Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(20)]],
    address: ['', [Validators.maxLength(300)]]
  });

  async save() {
    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    try {
      const currentUser = this.authService.authorizedUser();
      const currentUserUid = currentUser?.uid || '';

      const result = await this.companiesService.createCompany(
        this.companyForm.value,
        currentUserUid
      );

      if (result.success) {
        this.snackBar.open('Empresa creada exitosamente', 'Cerrar', { duration: 3000 });
        this.dialogRef.close({ companyId: result.data?.id });
      } else {
        this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
      }
    } catch (error) {
      console.error('Error creando empresa:', error);
      this.snackBar.open('Error al crear la empresa', 'Cerrar', { duration: 3000 });
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

    const labels: Record<string, string> = {
      legalName: 'Nombre Legal',
      taxId: 'Tax ID',
      email: 'Email'
    };

    const errors = control.errors;
    const label = labels[fieldName] || fieldName;

    if (errors['required']) return `${label} es requerido`;
    if (errors['email']) return 'Formato de email inválido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;

    return 'Campo inválido';
  }
}
