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
      <!-- Header -->
      <div class="dialog-header">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <mat-icon class="text-white !text-2xl">{{ mode() === 'create' ? 'add_business' : 'edit_note' }}</mat-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-800 m-0">
              {{ mode() === 'create' ? 'Nueva Empresa' : 'Editar Empresa' }}
            </h2>
            <p class="text-sm text-slate-500 m-0">
              {{ mode() === 'create' ? 'Crear empresa subcontratista' : data?.company?.legalName }}
            </p>
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

        <!-- Info de creación (solo en modo edición) -->
        @if (mode() === 'edit' && data?.company?.createdAt) {
          <div class="mt-6 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
            <p class="flex items-center gap-1">
              <mat-icon class="!text-sm">calendar_today</mat-icon>
              Creada: {{ formatDate(data.company.createdAt) }}
            </p>
          </div>
        }
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
          [disabled]="isSaving() || companyForm.invalid || (mode() === 'edit' && !companyForm.dirty)"
          class="!bg-indigo-600">
          @if (isSaving()) {
            <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          } @else {
            <mat-icon>save</mat-icon>
          }
          {{ mode() === 'create' ? 'Crear Empresa' : 'Guardar Cambios' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      @apply flex flex-col;
      min-width: 500px;
    }

    .dialog-header {
      @apply flex items-center justify-between p-6 border-b border-slate-200;
    }

    .dialog-content {
      @apply p-6 overflow-y-auto;
      max-height: 60vh;
    }

    .dialog-footer {
      @apply flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50;
    }

    .input-field {
      @apply w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-lg text-sm transition-all outline-none;
    }

    .input-field:focus {
      @apply border-indigo-500;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .input-field::placeholder {
      @apply text-slate-400;
    }

    @media (max-width: 640px) {
      .dialog-container {
        min-width: auto;
        width: 100%;
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
