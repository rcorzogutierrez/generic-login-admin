import { Component, OnInit, signal, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';

import { CompaniesService } from '../../services/companies.service';
import { Company } from '../../models';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../../core/services/auth.service';

type FormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './company-form.component.html',
  styleUrl: './company-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompanyFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private companiesService = inject(CompaniesService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  mode = signal<FormMode>('create');
  companyForm!: FormGroup;
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  currentCompany = signal<Company | null>(null);

  constructor() {}

  async ngOnInit() {
    await this.initializeForm();
  }

  private async initializeForm() {
    try {
      this.isLoading.set(true);

      // Determinar modo según ruta
      const companyId = this.route.snapshot.paramMap.get('id');
      const isViewMode = this.route.snapshot.data['mode'] === 'view';

      if (companyId) {
        this.mode.set(isViewMode ? 'view' : 'edit');
        await this.loadCompany(companyId);
      } else {
        this.mode.set('create');
        this.buildForm();
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

  private async loadCompany(companyId: string) {
    try {
      await this.companiesService.initialize();

      const company = this.companiesService.companies().find(c => c.id === companyId);

      if (!company) {
        this.snackBar.open('Empresa no encontrada', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/modules/companies']);
        return;
      }

      this.currentCompany.set(company);
      this.buildForm(company);

    } catch (error) {
      console.error('Error cargando empresa:', error);
      this.snackBar.open('Error al cargar la empresa', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/modules/companies']);
    }
  }

  private buildForm(company?: Company) {
    const isViewMode = this.mode() === 'view';

    this.companyForm = this.fb.group({
      legalName: [
        { value: company?.legalName || '', disabled: isViewMode },
        [Validators.required, Validators.minLength(2), Validators.maxLength(200)]
      ],
      taxId: [
        { value: company?.taxId || '', disabled: isViewMode },
        [Validators.required, Validators.minLength(2), Validators.maxLength(50)]
      ],
      address: [
        { value: company?.address || '', disabled: isViewMode },
        [Validators.maxLength(300)]
      ],
      phone: [
        { value: company?.phone || '', disabled: isViewMode },
        [Validators.maxLength(20)]
      ],
      email: [
        { value: company?.email || '', disabled: isViewMode },
        [Validators.email, Validators.maxLength(100)]
      ]
    });
  }

  async onSubmit() {
    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      this.snackBar.open('Por favor, completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.isSaving.set(true);
      this.cdr.markForCheck();

      const formValue = this.companyForm.value;
      const currentUser = this.authService.authorizedUser();
      const currentUserUid = currentUser?.uid || '';

      if (this.mode() === 'create') {
        const result = await this.companiesService.createCompany(formValue, currentUserUid);

        if (result.success) {
          this.snackBar.open('Empresa creada exitosamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/modules/companies']);
        } else {
          this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
        }

      } else if (this.mode() === 'edit') {
        const company = this.currentCompany();
        if (!company) return;

        const result = await this.companiesService.updateCompany(company.id, formValue, currentUserUid);

        if (result.success) {
          this.snackBar.open('Empresa actualizada exitosamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/modules/companies']);
        } else {
          this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
        }
      }

    } catch (error) {
      console.error('Error guardando empresa:', error);
      this.snackBar.open('Error al guardar la empresa', 'Cerrar', { duration: 3000 });
    } finally {
      this.isSaving.set(false);
      this.cdr.markForCheck();
    }
  }

  onCancel() {
    if (this.companyForm.dirty) {
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
          this.router.navigate(['/modules/companies']);
        }
      });
    } else {
      this.router.navigate(['/modules/companies']);
    }
  }

  enableEdit() {
    this.mode.set('edit');
    this.companyForm.enable();
    this.cdr.markForCheck();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.companyForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const labels: Record<string, string> = {
      legalName: 'Nombre Legal',
      taxId: 'Tax ID',
      address: 'Dirección',
      phone: 'Teléfono',
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

  hasError(fieldName: string): boolean {
    const control = this.companyForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
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
