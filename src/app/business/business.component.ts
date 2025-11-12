// src/app/business/business.component.ts
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

import { BusinessInfoService } from './services/business-info.service';
import { AuthService } from '../core/services/auth.service';
import { BusinessInfo, BusinessInfoFormData } from './models/business-info.interface';

/**
 * Componente de gestión de información de empresa
 *
 * Permite a los administradores crear y editar la información completa
 * de la empresa, incluyendo datos de contacto, dirección, branding y redes sociales.
 *
 * Características:
 * - Formulario reactivo con validaciones
 * - Tabs organizados por categoría
 * - Upload de logo a Firebase Storage con preview
 * - Color picker para branding
 * - Solo accesible para administradores
 *
 * @example
 * ```html
 * <app-business></app-business>
 * ```
 */
@Component({
  selector: 'app-business',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './business.component.html',
  styleUrl: './business.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BusinessComponent implements OnInit {
  // ============================================
  // DEPENDENCY INJECTION (Angular 20 pattern)
  // ============================================
  private fb = inject(FormBuilder);
  private businessService = inject(BusinessInfoService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  // ============================================
  // STATE (Signals - Angular 20)
  // ============================================

  /**
   * Usuario autenticado actual
   */
  user = this.authService.authorizedUser;

  /**
   * Información de empresa cargada
   */
  businessInfo = signal<BusinessInfo | null>(null);

  /**
   * Estado de carga inicial
   */
  loading = signal(true);

  /**
   * Estado de guardado
   */
  saving = signal(false);

  /**
   * Modo de edición activado
   */
  editMode = signal(false);

  /**
   * Progreso de upload de logo (0-100)
   */
  uploadProgress = signal(0);

  /**
   * Preview del logo seleccionado
   */
  logoPreview = signal<string>('');

  /**
   * Archivo de logo seleccionado
   */
  selectedLogoFile = signal<File | null>(null);

  // ============================================
  // COMPUTED SIGNALS (Angular 20)
  // ============================================

  /**
   * Verifica si el usuario es administrador
   */
  readonly isAdmin = computed(() => {
    const currentUser = this.user();
    return currentUser?.role === 'admin' ||
           currentUser?.permissions?.includes('manage_users') ||
           false;
  });

  /**
   * Verifica si hay cambios sin guardar
   */
  readonly hasUnsavedChanges = computed(() => {
    return this.businessForm.dirty && !this.saving();
  });

  /**
   * Determina si existe información de empresa
   */
  readonly businessExists = computed(() => {
    return this.businessInfo() !== null;
  });

  // ============================================
  // FORM
  // ============================================

  /**
   * Formulario reactivo para información de empresa
   */
  businessForm: FormGroup;

  constructor() {
    this.businessForm = this.createForm();
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  async ngOnInit() {
    // El roleGuard ya verifica permisos de admin en la ruta
    await this.loadBusinessInfo();
  }

  // ============================================
  // DATA LOADING
  // ============================================

  /**
   * Carga la información de la empresa desde Firestore
   *
   * @example
   * ```typescript
   * await this.loadBusinessInfo();
   * ```
   */
  private async loadBusinessInfo() {
    this.loading.set(true);
    this.cdr.markForCheck();

    try {
      const business = await this.businessService.getBusinessInfo();

      if (business) {
        this.businessInfo.set(business);
        this.populateForm(business);
        this.logoPreview.set(business.logoUrl || '');
      } else {
        // No existe, habilitar modo edición para crear
        this.editMode.set(true);
      }
    } catch (error) {
      console.error('Error cargando información de empresa:', error);
      this.snackBar.open('Error al cargar información de empresa', 'Cerrar', {
        duration: 3000
      });
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  // ============================================
  // FORM METHODS
  // ============================================

  /**
   * Crea el formulario reactivo con todas las validaciones
   *
   * @returns FormGroup configurado
   */
  private createForm(): FormGroup {
    return this.fb.group({
      // Identificación
      businessName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      legalName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      taxId: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(30)]],

      // Contacto
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.minLength(7), Validators.maxLength(20)]],
      mobilePhone: ['', [Validators.minLength(7), Validators.maxLength(20)]],
      website: ['', [Validators.pattern(/^https?:\/\/.+/)]],

      // Dirección
      address: this.fb.group({
        street: ['', [Validators.required, Validators.maxLength(200)]],
        city: ['', [Validators.required, Validators.maxLength(100)]],
        state: ['', [Validators.required, Validators.maxLength(100)]],
        zipCode: ['', [Validators.required, Validators.maxLength(20)]],
        country: ['', [Validators.required, Validators.maxLength(100)]]
      }),

      // Branding
      logoUrl: ['', [Validators.required]],
      primaryColor: ['#3b82f6'],
      secondaryColor: ['#8b5cf6'],

      // Adicional
      description: ['', [Validators.maxLength(500)]],

      // Redes sociales
      socialMedia: this.fb.group({
        facebook: ['', [Validators.pattern(/^https?:\/\/(www\.)?facebook\.com\/.+/)]],
        instagram: ['', [Validators.pattern(/^https?:\/\/(www\.)?instagram\.com\/.+/)]],
        twitter: ['', [Validators.pattern(/^https?:\/\/(www\.)?twitter\.com\/.+/)]],
        linkedin: ['', [Validators.pattern(/^https?:\/\/(www\.)?linkedin\.com\/.+/)]]
      })
    });
  }

  /**
   * Puebla el formulario con datos existentes
   *
   * @param business - Información de empresa a cargar en el formulario
   */
  private populateForm(business: BusinessInfo) {
    this.businessForm.patchValue({
      businessName: business.businessName,
      legalName: business.legalName,
      taxId: business.taxId,
      email: business.email,
      phone: business.phone,
      mobilePhone: business.mobilePhone || '',
      website: business.website || '',
      address: business.address,
      logoUrl: business.logoUrl,
      primaryColor: business.primaryColor || '#3b82f6',
      secondaryColor: business.secondaryColor || '#8b5cf6',
      description: business.description || '',
      socialMedia: {
        facebook: business.socialMedia?.facebook || '',
        instagram: business.socialMedia?.instagram || '',
        twitter: business.socialMedia?.twitter || '',
        linkedin: business.socialMedia?.linkedin || ''
      }
    });

    // Deshabilitar formulario en modo lectura
    this.businessForm.disable();
  }

  // ============================================
  // LOGO UPLOAD
  // ============================================

  /**
   * Maneja la selección de archivo de logo
   *
   * Valida el archivo, crea preview y lo guarda en el signal.
   *
   * @param event - Evento de input file
   */
  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('El archivo debe ser una imagen', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('El archivo no debe superar los 5MB', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    // Guardar archivo
    this.selectedLogoFile.set(file);

    // Crear preview
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      this.logoPreview.set(e.target?.result as string);
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  /**
   * Sube el logo a Firebase Storage
   *
   * @returns Promise con la URL del logo subido o null si falla
   */
  private async uploadLogo(): Promise<string | null> {
    const file = this.selectedLogoFile();
    if (!file) {
      // Si no hay nuevo archivo, usar la URL actual
      return this.businessForm.get('logoUrl')?.value || null;
    }

    try {
      this.uploadProgress.set(0);
      this.cdr.markForCheck();

      const url = await this.businessService.uploadLogo(file, (progress) => {
        this.uploadProgress.set(progress);
        this.cdr.markForCheck();
      });

      if (url) {
        this.businessForm.patchValue({ logoUrl: url });
        this.selectedLogoFile.set(null);
        return url;
      }

      return null;
    } catch (error) {
      console.error('Error subiendo logo:', error);
      this.snackBar.open('Error al subir el logo', 'Cerrar', {
        duration: 3000
      });
      return null;
    }
  }

  // ============================================
  // FORM ACTIONS
  // ============================================

  /**
   * Activa el modo de edición
   */
  enableEditMode() {
    this.editMode.set(true);
    this.businessForm.enable();
    this.cdr.markForCheck();
  }

  /**
   * Cancela el modo de edición
   *
   * Si hay información existente, la recarga. Si no, vuelve al dashboard.
   */
  cancelEdit() {
    if (this.businessExists()) {
      // Recargar datos originales
      const business = this.businessInfo();
      if (business) {
        this.populateForm(business);
        this.logoPreview.set(business.logoUrl || '');
      }
      this.editMode.set(false);
      this.selectedLogoFile.set(null);
      this.businessForm.markAsPristine();
      this.cdr.markForCheck();
    } else {
      // No hay datos, volver al dashboard
      this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Guarda la información de la empresa
   *
   * Valida el formulario, sube el logo si hay uno nuevo,
   * y guarda todo en Firestore.
   */
  async onSubmit() {
    if (this.businessForm.invalid) {
      this.businessForm.markAllAsTouched();
      this.snackBar.open('Por favor, completa todos los campos requeridos', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    this.saving.set(true);
    this.cdr.markForCheck();

    try {
      // Subir logo si hay uno nuevo
      const logoUrl = await this.uploadLogo();
      if (!logoUrl) {
        this.snackBar.open('Error al subir el logo', 'Cerrar', {
          duration: 3000
        });
        this.saving.set(false);
        this.cdr.markForCheck();
        return;
      }

      // Preparar datos
      const formValue = this.businessForm.getRawValue();
      const formData: BusinessInfoFormData = {
        ...formValue,
        logoUrl
      };

      // Guardar en Firestore
      const result = await this.businessService.saveBusinessInfo(formData);

      if (result.success) {
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 3000
        });

        // Actualizar datos locales
        if (result.data) {
          this.businessInfo.set(result.data);
          this.populateForm(result.data);
        }

        this.editMode.set(false);
        this.businessForm.markAsPristine();
      } else {
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error guardando información de empresa:', error);
      this.snackBar.open('Error al guardar la información', 'Cerrar', {
        duration: 3000
      });
    } finally {
      this.saving.set(false);
      this.uploadProgress.set(0);
      this.cdr.markForCheck();
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Obtiene el mensaje de error de un campo
   *
   * @param fieldName - Nombre del campo
   * @param nestedGroup - Grupo anidado opcional (ej: 'address', 'socialMedia')
   * @returns Mensaje de error o cadena vacía
   */
  getErrorMessage(fieldName: string, nestedGroup?: string): string {
    let control = nestedGroup
      ? this.businessForm.get(nestedGroup)?.get(fieldName)
      : this.businessForm.get(fieldName);

    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) return 'Este campo es requerido';
    if (control.errors['email']) return 'Email inválido';
    if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    if (control.errors['maxlength']) return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
    if (control.errors['pattern']) return 'Formato inválido';

    return 'Campo inválido';
  }

  /**
   * Verifica si un campo es inválido
   *
   * @param fieldName - Nombre del campo
   * @param nestedGroup - Grupo anidado opcional
   * @returns true si el campo es inválido y ha sido tocado
   */
  isFieldInvalid(fieldName: string, nestedGroup?: string): boolean {
    const control = nestedGroup
      ? this.businessForm.get(nestedGroup)?.get(fieldName)
      : this.businessForm.get(fieldName);

    return !!(control && control.invalid && control.touched);
  }

  /**
   * Navega de vuelta al dashboard
   */
  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
