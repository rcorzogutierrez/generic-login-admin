// src/app/modules/projects/components/proposal-form/proposal-form.component.ts

import { Component, OnInit, inject, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Timestamp } from 'firebase/firestore';

// Services
import { ProposalsService } from '../../services/proposals.service';
import { ProposalConfigService } from '../../services/proposal-config.service';
import { CatalogItemsService } from '../../services/catalog-items.service';
import { ClientsService } from '../../../clients/services/clients.service';
import { ClientConfigServiceRefactored } from '../../../clients/services/client-config-refactored.service';
import { LanguageService } from '../../../../core/services/language.service';

// Models
import { Proposal, CreateProposalData, ProposalItem, CatalogItem } from '../../models';
import { Client } from '../../../clients/models';
import { FieldType } from '../../../clients/models/field-config.interface';

// Components
import { AddClientDialogComponent } from '../add-client-dialog/add-client-dialog.component';
import { CatalogItemsManagerComponent } from '../catalog-items-manager/catalog-items-manager.component';

// Shared utilities
import { getFieldValue } from '../../../../shared/modules/dynamic-form-builder/utils';

@Component({
  selector: 'app-proposal-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
    MatDialogModule,
    MatAutocompleteModule
  ],
  templateUrl: './proposal-form.component.html',
  styleUrl: './proposal-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProposalFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private proposalsService = inject(ProposalsService);
  private proposalConfigService = inject(ProposalConfigService);
  private catalogItemsService = inject(CatalogItemsService);
  private clientsService = inject(ClientsService);
  private clientConfigService = inject(ClientConfigServiceRefactored);
  private languageService = inject(LanguageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Signals
  isLoading = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  proposalId = signal<string | null>(null);
  clients = this.clientsService.clients;
  clientSearchTerm = signal<string>('');
  useSameAddress = signal<boolean>(false);
  formSubmitted = signal<boolean>(false);

  // Computed - Clientes filtrados por búsqueda
  filteredClients = computed(() => {
    const searchTerm = this.clientSearchTerm();
    const term = (searchTerm || '').toLowerCase().trim();
    const allClients = this.clients();

    if (!term) {
      return allClients;
    }

    return allClients.filter(client => {
      const name = this.getClientName(client).toLowerCase();
      const email = this.getClientEmail(client).toLowerCase();
      const phone = this.getClientPhone(client).toLowerCase();

      return name.includes(term) || email.includes(term) || phone.includes(term);
    });
  });

  // Items del catálogo disponibles
  availableCatalogItems = this.catalogItemsService.catalogItems;

  // Items seleccionados para este proposal (solo IDs para referencia)
  selectedItemIds = signal<Set<string>>(new Set());

  // Computed: items seleccionados del catálogo
  selectedCatalogItems = computed(() => {
    const ids = this.selectedItemIds();
    return this.availableCatalogItems().filter(item => ids.has(item.id));
  });

  // Computed: items disponibles (no seleccionados)
  unselectedCatalogItems = computed(() => {
    const ids = this.selectedItemIds();
    return this.availableCatalogItems().filter(item => !ids.has(item.id));
  });

  // Search term para filtrar items disponibles
  catalogSearchTerm = signal<string>('');

  // Computed: items filtrados por búsqueda
  filteredCatalogItems = computed(() => {
    const searchTerm = this.catalogSearchTerm().toLowerCase().trim();
    const unselected = this.unselectedCatalogItems();

    if (!searchTerm) {
      return unselected;
    }

    return unselected.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(searchTerm);
      const descMatch = item.description?.toLowerCase().includes(searchTerm) || false;
      return nameMatch || descMatch;
    });
  });

  // Items incluidos (legacy - ahora se construyen desde catalogItems seleccionados)
  includeItems = signal<ProposalItem[]>([]);

  // Lista fija de extras (siempre visible)
  readonly FIXED_EXTRAS: string[] = [
    'New Survey and Elevation Certificate (to be Provided by Owner)',
    'Cost of Permits and Notice of Commencement are not included.',
    'Demock if necessary or Pool Piling if required.',
    'Septic Tank Certification. If require by the County (to be Provided by Owner)',
    'Soil Sample (Nelco Testing 305-259-9779) if required by the County.',
    'Electric Sub Panel (If needed). Removal and relocation of A/C (If needed)',
    'Heater',
    'Extra Deck',
    'Removal and relocation of A/C (If need)'
  ];

  // Checkbox principal para incluir/excluir toda la sección de extras
  includeExtrasSection = signal<boolean>(false);

  // Form
  proposalForm!: FormGroup;

  constructor() {
    // Inicializar formulario inmediatamente con valores temporales
    // para evitar errores de template al acceder a proposalForm
    this.initFormWithDefaults();
  }

  async ngOnInit() {
    // Cargar configuraciones, clientes y catálogo de items en paralelo
    await Promise.all([
      this.clientConfigService.initialize(),
      this.clientsService.initialize(),
      this.catalogItemsService.initialize(),
      this.proposalConfigService.initialize()  // Cargar configuración de proposals
    ]);

    // Actualizar formulario con valores de configuración reales
    this.updateFormWithConfig();

    // Verificar si es edición
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.proposalId.set(id);
      this.isEditMode.set(true);
      await this.loadProposal(id);
    }
  }

  /**
   * Inicializar formulario con valores por defecto temporales
   * Se llama en el constructor para que el form exista desde el inicio
   */
  initFormWithDefaults() {
    const today = new Date();
    const validUntilDate = new Date(today);
    validUntilDate.setDate(validUntilDate.getDate() + 30); // Temporal: 30 días

    this.proposalForm = this.fb.group({
      language: ['es', Validators.required], // Idioma del documento
      ownerId: ['', Validators.required],
      ownerName: ['', Validators.required],
      ownerEmail: ['', [Validators.email]],
      ownerPhone: [''],
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: [''],
      zipCode: [''],
      workType: ['residential', Validators.required], // Temporal
      jobCategory: ['', Validators.required],
      date: [this.formatDateForInput(today), Validators.required],
      validUntil: [this.formatDateForInput(validUntilDate)],
      notes: [''],
      internalNotes: [''],
      terms: [''], // Temporal: vacío
      subtotal: [0, [Validators.required, Validators.min(0)]],
      taxPercentage: [0, [Validators.min(0), Validators.max(100)]], // Temporal: 0
      discountPercentage: [0, [Validators.min(0), Validators.max(100)]]
    });

    // Suscribirse a cambios en ownerId para autocompletar datos del cliente
    this.proposalForm.get('ownerId')?.valueChanges.subscribe(ownerId => {
      if (ownerId) {
        this.fillClientData(ownerId);
      }
    });

    // Suscribirse a cambios en language para actualizar el idioma de la interfaz
    this.proposalForm.get('language')?.valueChanges.subscribe(language => {
      if (language) {
        this.onLanguageChange(language);
      }
    });
  }

  /**
   * Manejar cambio de idioma
   */
  onLanguageChange(language: 'es' | 'en'): void {
    this.languageService.setLanguage(language);
  }

  /**
   * Actualizar formulario con valores de configuración reales
   * Se llama después de cargar la configuración en ngOnInit
   */
  updateFormWithConfig() {
    const defaultWorkType = this.proposalConfigService.getDefaultWorkType();
    const defaultTaxPercentage = this.proposalConfigService.getDefaultTaxPercentage();
    const defaultValidityDays = this.proposalConfigService.getDefaultValidityDays();
    const defaultTerms = this.proposalConfigService.getDefaultTerms();

    // Actualizar fecha de validez con los días correctos
    const today = new Date();
    const validUntilDate = new Date(today);
    validUntilDate.setDate(validUntilDate.getDate() + defaultValidityDays);

    // Actualizar solo los campos que dependen de la configuración
    this.proposalForm.patchValue({
      workType: defaultWorkType,
      validUntil: this.formatDateForInput(validUntilDate),
      terms: defaultTerms,
      taxPercentage: defaultTaxPercentage
    });
  }

  /**
   * Convertir Date a formato YYYY-MM-DD para inputs de tipo date
   */
  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Convertir string YYYY-MM-DD a Date en zona horaria local
   * Evita problemas de desfase de un día al interpretar la fecha como UTC
   */
  private parseDateFromInput(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  /**
   * Autocompletar datos del cliente seleccionado
   */
  fillClientData(ownerId: string) {
    const client = this.clients().find(c => c.id === ownerId);
    if (client) {
      this.proposalForm.patchValue({
        ownerName: this.getClientName(client),
        ownerEmail: this.getClientEmail(client),
        ownerPhone: this.getClientPhone(client)
      });

      // Si el checkbox está marcado, copiar también la dirección
      if (this.useSameAddress()) {
        this.copyClientAddress();
      }
    }
  }

  /**
   * Copiar dirección del cliente a ubicación del trabajo
   */
  copyClientAddress() {
    const ownerId = this.proposalForm.get('ownerId')?.value;
    if (!ownerId) return;

    const client = this.clients().find(c => c.id === ownerId);
    if (client) {
      this.proposalForm.patchValue({
        address: this.getClientAddress(client),
        city: this.getClientCity(client),
        state: this.getClientState(client),
        zipCode: this.getClientZipCode(client)
      });
    }
  }

  /**
   * Obtener dirección del cliente desde sus campos dinámicos
   * Usa el mapping configurado en ProposalConfigService
   */
  getClientAddress(client: Client | undefined): string {
    if (!client) return '';

    // Buscar en campos estándar primero
    if (client.address) return client.address;

    // Obtener el nombre del campo desde la configuración
    const mapping = this.proposalConfigService.getAddressMapping();
    const fieldName = mapping.address;

    // Buscar usando el nombre configurado
    const value = getFieldValue(client, fieldName);
    return value ? String(value) : '';
  }

  /**
   * Obtener ciudad del cliente desde sus campos dinámicos
   * Usa el mapping configurado en ProposalConfigService
   */
  getClientCity(client: Client | undefined): string {
    if (!client) return '';

    // Buscar en campos estándar primero
    if (client.city) return client.city;

    // Obtener el nombre del campo desde la configuración
    const mapping = this.proposalConfigService.getAddressMapping();
    const fieldName = mapping.city;

    // Buscar usando el nombre configurado
    const value = getFieldValue(client, fieldName);
    return value ? String(value) : '';
  }

  /**
   * Obtener estado del cliente desde sus campos dinámicos
   * Usa el mapping configurado en ProposalConfigService
   */
  getClientState(client: Client | undefined): string {
    if (!client) return '';

    // Obtener el nombre del campo desde la configuración
    const mapping = this.proposalConfigService.getAddressMapping();
    const fieldName = mapping.state;

    // Buscar usando el nombre configurado
    const value = getFieldValue(client, fieldName);
    return value ? String(value) : '';
  }

  /**
   * Obtener código postal del cliente desde sus campos dinámicos
   * Usa el mapping configurado en ProposalConfigService
   */
  getClientZipCode(client: Client | undefined): string {
    if (!client) return '';

    // Obtener el nombre del campo desde la configuración
    const mapping = this.proposalConfigService.getAddressMapping();
    const fieldName = mapping.zipCode;

    // Buscar usando el nombre configurado
    const value = getFieldValue(client, fieldName);
    return value ? String(value) : '';
  }

  /**
   * Manejar cambio en el checkbox "Usar misma dirección"
   */
  onUseSameAddressChange(checked: boolean) {
    this.useSameAddress.set(checked);

    if (checked) {
      // Copiar dirección del cliente
      this.copyClientAddress();
    } else {
      // Limpiar campos de dirección
      this.proposalForm.patchValue({
        address: '',
        city: '',
        state: '',
        zipCode: ''
      });
    }
  }

  /**
   * Cargar proposal para edición
   */
  async loadProposal(id: string) {
    try {
      this.isLoading.set(true);
      const proposal = await this.proposalsService.getProposalById(id);

      if (proposal) {
        this.proposalForm.patchValue({
          ownerId: proposal.ownerId,
          ownerName: proposal.ownerName,
          ownerEmail: proposal.ownerEmail || '',
          ownerPhone: proposal.ownerPhone || '',
          address: proposal.address,
          city: proposal.city,
          state: proposal.state || '',
          zipCode: proposal.zipCode || '',
          workType: proposal.workType || 'residential',
          jobCategory: proposal.jobCategory || '',
          date: this.formatDateForInput(proposal.date.toDate()),
          validUntil: proposal.validUntil ? this.formatDateForInput(proposal.validUntil.toDate()) : null,
          notes: proposal.notes || '',
          internalNotes: proposal.internalNotes || '',
          terms: proposal.terms || '',
          subtotal: proposal.subtotal || 0,
          taxPercentage: proposal.taxPercentage || 0,
          discountPercentage: proposal.discountPercentage || 0
        });

        // Cargar items incluidos - convertir de ProposalItem[] a IDs del catálogo
        const savedIncludeIds = new Set<string>();
        if (proposal.includes && proposal.includes.length > 0) {
          proposal.includes.forEach(item => {
            // Intentar encontrar el item en el catálogo por ID
            const catalogItem = this.availableCatalogItems().find(ci => ci.id === item.id);
            if (catalogItem) {
              savedIncludeIds.add(catalogItem.id);
            }
          });
        }
        this.selectedItemIds.set(savedIncludeIds);

        // Habilitar checkbox si hay extras guardados
        if (proposal.extras && proposal.extras.length > 0) {
          this.includeExtrasSection.set(true);
        }
      }
    } catch (error) {
      console.error('Error cargando proposal:', error);
      this.snackBar.open('Error al cargar el estimado', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Agregar item del catálogo al proposal
   */
  addCatalogItemToProposal(catalogItem: CatalogItem) {
    this.selectedItemIds.update(ids => {
      const newIds = new Set(ids);
      newIds.add(catalogItem.id);
      return newIds;
    });
  }

  /**
   * Remover item del catálogo del proposal
   */
  removeCatalogItemFromProposal(catalogItemId: string) {
    this.selectedItemIds.update(ids => {
      const newIds = new Set(ids);
      newIds.delete(catalogItemId);
      return newIds;
    });
  }

  /**
   * Agregar todos los items filtrados
   */
  addAllFilteredItems() {
    this.selectedItemIds.update(ids => {
      const newIds = new Set(ids);
      this.filteredCatalogItems().forEach(item => newIds.add(item.id));
      return newIds;
    });
  }

  /**
   * Remover todos los items seleccionados
   */
  removeAllSelectedItems() {
    this.selectedItemIds.set(new Set());
  }

  /**
   * Manejar cambio en el campo de búsqueda de items del catálogo
   */
  onCatalogSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.catalogSearchTerm.set(value);
  }

  /**
   * Alternar inclusión de toda la sección de extras
   */
  toggleExtrasSection(checked: boolean) {
    this.includeExtrasSection.set(checked);
  }

  /**
   * Actualizar item de includes
   */
  updateIncludeItem(itemId: string, description: string) {
    this.includeItems.update(items =>
      items.map(item =>
        item.id === itemId ? { ...item, description } : item
      )
    );
  }

  /**
   * Eliminar item de includes
   */
  removeIncludeItem(itemId: string) {
    this.includeItems.update(items => items.filter(item => item.id !== itemId));
  }

  /**
   * Obtener subtotal del formulario
   */
  getSubtotal(): number {
    return this.proposalForm.get('subtotal')?.value || 0;
  }

  /**
   * Calcular impuesto
   */
  calculateTax(): number {
    const subtotal = this.getSubtotal();
    const taxPercentage = this.proposalForm.get('taxPercentage')?.value || 0;
    return (subtotal * taxPercentage) / 100;
  }

  /**
   * Calcular descuento
   */
  calculateDiscount(): number {
    const subtotal = this.getSubtotal();
    const discountPercentage = this.proposalForm.get('discountPercentage')?.value || 0;
    return (subtotal * discountPercentage) / 100;
  }

  /**
   * Calcular total
   */
  calculateTotal(): number {
    const subtotal = this.getSubtotal();
    const tax = this.calculateTax();
    const discount = this.calculateDiscount();

    return subtotal + tax - discount;
  }

  /**
   * Filtrar valores undefined/null de un objeto para prevenir errores de Firebase
   * Firebase no permite valores undefined en documentos
   */
  private filterUndefinedValues<T extends Record<string, any>>(obj: T): Partial<T> {
    const filtered: Partial<T> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        // Solo incluir valores que no sean undefined o null, o strings vacíos
        if (value !== undefined && value !== null && value !== '') {
          filtered[key] = value;
        }
      }
    }

    return filtered;
  }

  /**
   * Guardar proposal
   * @param asDraft - Si es true, guarda como borrador sin validaciones estrictas
   */
  async save(asDraft: boolean = false) {
    try {
      this.isLoading.set(true);
      const formValue = this.proposalForm.value;

      // Validaciones mínimas para borrador: solo cliente
      if (!formValue.ownerId || !formValue.ownerName) {
        this.snackBar.open('Debes seleccionar al menos un cliente', 'Cerrar', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        return;
      }

      // Si NO es borrador, validar todo el formulario
      if (!asDraft) {
        // Marcar formulario como enviado para mostrar validaciones
        this.formSubmitted.set(true);

        if (this.proposalForm.invalid) {
          this.validateAndShowErrors();
          return;
        }

        // Validar que el subtotal sea mayor a 0
        const subtotal = formValue.subtotal || 0;
        if (subtotal <= 0) {
          this.snackBar.open('El subtotal debe ser mayor a 0', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          return;
        }

        // Validar que tenga al menos un item
        if (this.selectedCatalogItems().length === 0) {
          this.snackBar.open('Debes agregar al menos un item incluido', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          return;
        }
      }

      const taxPercentage = formValue.taxPercentage || 0;
      const discountPercentage = formValue.discountPercentage || 0;
      const tax = this.calculateTax();
      const discount = this.calculateDiscount();
      const total = this.calculateTotal();

      // Convertir items seleccionados del catálogo a ProposalItem[]
      const includesToSave: ProposalItem[] = this.selectedCatalogItems().map((catalogItem, index) => ({
        id: catalogItem.id,
        description: `${catalogItem.name} - ${catalogItem.description}`,
        type: 'both' as const,
        order: index + 1
      }));

      // Convertir lista fija de extras a ProposalItem[] solo si el checkbox está habilitado
      const extrasToSave: ProposalItem[] = this.includeExtrasSection()
        ? this.FIXED_EXTRAS.map((description, index) => ({
            id: `extra-${index + 1}`,
            description,
            type: 'both' as const,
            order: index + 1
          }))
        : [];

      // Determinar el estado según si es borrador o no
      const status: 'draft' | 'sent' = asDraft ? 'draft' : 'sent';

      // Construir objeto de datos base
      const baseData = {
        language: formValue.language || 'es', // Idioma del documento
        ownerId: formValue.ownerId,
        ownerName: formValue.ownerName,
        ownerEmail: formValue.ownerEmail,
        ownerPhone: formValue.ownerPhone,
        address: formValue.address,
        city: formValue.city,
        state: formValue.state,
        zipCode: formValue.zipCode,
        workType: formValue.workType,
        jobCategory: formValue.jobCategory,
        date: formValue.date ? Timestamp.fromDate(this.parseDateFromInput(formValue.date)) : Timestamp.now(),
        validUntil: formValue.validUntil ? Timestamp.fromDate(this.parseDateFromInput(formValue.validUntil)) : null,
        includes: includesToSave,
        extras: extrasToSave,
        subtotal: formValue.subtotal || 0,
        tax,
        taxPercentage,
        discount,
        discountPercentage,
        total,
        notes: formValue.notes,
        internalNotes: formValue.internalNotes,
        terms: formValue.terms,
        status
      };

      // Filtrar valores undefined/null/vacíos para prevenir errores de Firebase
      const proposalData = this.filterUndefinedValues(baseData) as CreateProposalData;

      // Asegurar que los campos mínimos siempre estén presentes
      proposalData.language = formValue.language || 'es'; // Asegurar que el idioma siempre se guarde
      proposalData.ownerId = formValue.ownerId;
      proposalData.ownerName = formValue.ownerName;
      proposalData.includes = includesToSave;
      proposalData.extras = extrasToSave;
      proposalData.total = total || 0;
      proposalData.status = asDraft ? 'draft' : 'sent';

      // Asegurar que los porcentajes siempre se guarden (incluso si son 0)
      proposalData.taxPercentage = taxPercentage;
      proposalData.discountPercentage = discountPercentage;
      proposalData.tax = tax;
      proposalData.discount = discount;
      proposalData.subtotal = formValue.subtotal || 0;

      if (this.isEditMode() && this.proposalId()) {
        await this.proposalsService.updateProposal(this.proposalId()!, proposalData);
        this.snackBar.open(
          asDraft ? 'Borrador guardado exitosamente' : 'Estimado actualizado exitosamente',
          'Cerrar',
          { duration: 3000 }
        );
      } else {
        const newProposal = await this.proposalsService.createProposal(proposalData);
        this.snackBar.open(
          asDraft ? 'Borrador guardado exitosamente' : 'Estimado creado exitosamente',
          'Cerrar',
          { duration: 3000 }
        );
        this.router.navigate(['/modules/projects', newProposal.id]);
        return;
      }

      this.router.navigate(['/modules/projects']);
    } catch (error) {
      console.error('Error guardando proposal:', error);
      this.snackBar.open('Error al guardar el estimado', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Validar formulario y mostrar errores detallados
   */
  validateAndShowErrors() {
    // Marcar todos los campos como touched para mostrar errores
    Object.keys(this.proposalForm.controls).forEach(key => {
      this.proposalForm.get(key)?.markAsTouched();
    });

    // Construir lista de campos faltantes
    const missingFields: string[] = [];
    const fieldLabels: { [key: string]: string } = {
      ownerId: 'Cliente',
      ownerName: 'Nombre del Cliente',
      ownerEmail: 'Email (válido)',
      address: 'Dirección del Trabajo',
      city: 'Ciudad',
      workType: 'Tipo de Trabajo',
      jobCategory: 'Clasificación del Servicio',
      date: 'Fecha',
      subtotal: 'Subtotal'
    };

    Object.keys(this.proposalForm.controls).forEach(key => {
      const control = this.proposalForm.get(key);
      if (control?.invalid) {
        if (control?.errors?.['required']) {
          const label = fieldLabels[key] || key;
          missingFields.push(label);
        } else if (control?.errors?.['email']) {
          missingFields.push('Email (formato inválido)');
        } else if (control?.errors?.['min']) {
          const label = fieldLabels[key] || key;
          missingFields.push(`${label} (valor inválido)`);
        }
      }
    });

    // Validación adicional: al menos un item debe estar seleccionado
    if (this.selectedCatalogItems().length === 0) {
      missingFields.push('Al menos un Item Incluido');
    }

    // Mostrar mensaje con campos faltantes
    if (missingFields.length > 0) {
      const message = `Faltan los siguientes campos: ${missingFields.join(', ')}`;
      this.snackBar.open(message, 'Cerrar', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });

      // Scroll al primer campo inválido
      this.scrollToFirstInvalidField();
    }
  }

  /**
   * Hacer scroll al primer campo inválido
   */
  scrollToFirstInvalidField() {
    const firstInvalidControl = Object.keys(this.proposalForm.controls).find(key => {
      return this.proposalForm.get(key)?.invalid;
    });

    if (firstInvalidControl) {
      // Intentar encontrar el elemento en el DOM
      const invalidElement = document.querySelector(`[formControlName="${firstInvalidControl}"]`);
      if (invalidElement) {
        invalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Dar foco al elemento después de un pequeño delay para que termine el scroll
        setTimeout(() => {
          (invalidElement as HTMLElement).focus();
        }, 500);
      }
    }
  }

  /**
   * Verificar si un campo debe mostrar error
   */
  shouldShowError(fieldName: string): boolean {
    const field = this.proposalForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || this.formSubmitted()));
  }

  /**
   * Cancelar
   */
  cancel() {
    this.router.navigate(['/modules/projects']);
  }

  /**
   * Formatear moneda
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  /**
   * Abrir dialog para agregar nuevo cliente
   */
  openAddClientDialog() {
    const dialogRef = this.dialog.open(AddClientDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe((newClient: Client | undefined) => {
      if (newClient) {
        // El servicio ya actualiza su lista automáticamente cuando se crea un cliente
        // Solo necesitamos seleccionar el nuevo cliente
        this.proposalForm.patchValue({
          ownerId: newClient.id
        });
        // Limpiar búsqueda y establecer el nombre
        this.clientSearchTerm.set(this.getClientName(newClient));
      }
    });
  }

  /**
   * Abrir dialog para administrar catálogo de items
   */
  openCatalogManager() {
    const dialogRef = this.dialog.open(CatalogItemsManagerComponent, {
      width: '95vw',
      maxWidth: '1200px',
      height: '90vh',
      maxHeight: '90vh',
      disableClose: false,
      autoFocus: false,
      panelClass: 'catalog-manager-dialog'
    });

    dialogRef.afterClosed().subscribe(() => {
      // El servicio ya mantiene el estado actualizado mediante signals
      // No necesitamos hacer nada adicional
    });
  }

  /**
   * Manejar cambio en el campo de búsqueda de cliente
   */
  onClientSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.clientSearchTerm.set(value);
  }

  /**
   * Seleccionar cliente del autocomplete
   */
  selectClient(client: Client) {
    this.proposalForm.patchValue({
      ownerId: client.id
    });
    this.clientSearchTerm.set(this.getClientName(client));
  }

  /**
   * Obtener nombre del cliente seleccionado
   */
  getSelectedClientName(): string {
    const ownerId = this.proposalForm.get('ownerId')?.value;
    if (!ownerId) return '';

    const client = this.clients().find(c => c.id === ownerId);
    return this.getClientName(client);
  }

  /**
   * Obtener nombre del cliente desde sus campos dinámicos
   * Usa la configuración de campos para identificar el campo de nombre
   */
  getClientName(client: Client | undefined): string {
    if (!client) return '';

    const fields = this.clientConfigService.getFieldsInUse();

    // Buscar el primer campo de tipo TEXT que probablemente sea el nombre
    const nameField = fields.find(f =>
      f.type === FieldType.TEXT ||
      f.name === 'name' ||
      f.name === 'nombre' ||
      f.name === 'nombre_del_cliente'
    );

    if (nameField) {
      const value = getFieldValue(client, nameField.name);
      if (value) return String(value);
    }

    // Fallback a campos estándar
    if (client.name) return client.name;

    return 'Sin nombre';
  }

  /**
   * Obtener email del cliente desde sus campos dinámicos
   * Usa la configuración de campos para identificar el campo de email
   */
  getClientEmail(client: Client | undefined): string {
    if (!client) return '';

    const fields = this.clientConfigService.getFieldsInUse();

    // Buscar el primer campo de tipo EMAIL
    const emailField = fields.find(f =>
      f.type === FieldType.EMAIL ||
      f.name === 'email' ||
      f.name === 'correo'
    );

    if (emailField) {
      const value = getFieldValue(client, emailField.name);
      if (value) return String(value);
    }

    // Fallback a campos estándar
    if (client.email) return client.email;

    return '';
  }

  /**
   * Obtener teléfono del cliente desde sus campos dinámicos
   * Usa la configuración de campos para identificar el campo de teléfono
   */
  getClientPhone(client: Client | undefined): string {
    if (!client) return '';

    const fields = this.clientConfigService.getFieldsInUse();

    // Buscar el primer campo de tipo PHONE
    const phoneField = fields.find(f =>
      f.type === FieldType.PHONE ||
      f.name === 'phone' ||
      f.name === 'telefono' ||
      f.name === 'tel'
    );

    if (phoneField) {
      const value = getFieldValue(client, phoneField.name);
      if (value) return String(value);
    }

    // Fallback a campos estándar
    if (client.phone) return client.phone;

    return '';
  }
}
