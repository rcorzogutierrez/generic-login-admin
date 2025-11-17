// src/app/modules/projects/components/proposal-form/proposal-form.component.ts

import { Component, OnInit, inject, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

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
import { ClientsService } from '../../../clients/services/clients.service';
import { ClientConfigServiceRefactored } from '../../../clients/services/client-config-refactored.service';

// Models
import { Proposal, CreateProposalData, ProposalItem } from '../../models';
import { Client } from '../../../clients/models';
import { FieldType } from '../../../clients/models/field-config.interface';

// Components
import { AddClientDialogComponent } from '../add-client-dialog/add-client-dialog.component';

// Shared utilities
import { getFieldValue } from '../../../../shared/modules/dynamic-form-builder/utils';

@Component({
  selector: 'app-proposal-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
  private clientsService = inject(ClientsService);
  private clientConfigService = inject(ClientConfigServiceRefactored);
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
    this.initForm();
  }

  async ngOnInit() {
    // Cargar configuración de clientes y clientes en paralelo
    await Promise.all([
      this.clientConfigService.initialize(),
      this.clientsService.initialize()
    ]);

    // Verificar si es edición
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.proposalId.set(id);
      this.isEditMode.set(true);
      await this.loadProposal(id);
    }
  }

  /**
   * Inicializar formulario
   */
  initForm() {
    this.proposalForm = this.fb.group({
      ownerId: ['', Validators.required],
      ownerName: ['', Validators.required],
      ownerEmail: [''],
      ownerPhone: [''],
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: [''],
      zipCode: [''],
      workType: ['residential', Validators.required],
      jobCategory: [''],
      date: [new Date(), Validators.required],
      validUntil: [''],
      notes: [''],
      internalNotes: [''],
      terms: [''],
      subtotal: [0, [Validators.min(0)]],
      taxPercentage: [0],
      discountPercentage: [0]
    });

    // Suscribirse a cambios en ownerId para autocompletar datos del cliente
    this.proposalForm.get('ownerId')?.valueChanges.subscribe(ownerId => {
      if (ownerId) {
        this.fillClientData(ownerId);
      }
    });
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
   */
  getClientAddress(client: Client | undefined): string {
    if (!client) return '';

    // Buscar en campos estándar
    if (client.address) return client.address;

    // Buscar en campos dinámicos
    const value = getFieldValue(client, 'address') || getFieldValue(client, 'direccion');
    return value ? String(value) : '';
  }

  /**
   * Obtener ciudad del cliente desde sus campos dinámicos
   */
  getClientCity(client: Client | undefined): string {
    if (!client) return '';

    // Buscar en campos estándar
    if (client.city) return client.city;

    // Buscar en campos dinámicos
    const value = getFieldValue(client, 'city') || getFieldValue(client, 'ciudad');
    return value ? String(value) : '';
  }

  /**
   * Obtener estado del cliente desde sus campos dinámicos
   */
  getClientState(client: Client | undefined): string {
    if (!client) return '';

    // Buscar en campos dinámicos
    const value = getFieldValue(client, 'state') || getFieldValue(client, 'estado');
    return value ? String(value) : '';
  }

  /**
   * Obtener código postal del cliente desde sus campos dinámicos
   */
  getClientZipCode(client: Client | undefined): string {
    if (!client) return '';

    // Buscar en campos dinámicos
    const value = getFieldValue(client, 'zipCode') ||
                  getFieldValue(client, 'zip_code') ||
                  getFieldValue(client, 'codigo_postal');
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
          date: proposal.date.toDate(),
          validUntil: proposal.validUntil?.toDate() || null,
          notes: proposal.notes || '',
          internalNotes: proposal.internalNotes || '',
          terms: proposal.terms || '',
          subtotal: proposal.subtotal || 0,
          taxPercentage: proposal.taxPercentage || 0,
          discountPercentage: proposal.discountPercentage || 0
        });

        this.includeItems.set(proposal.includes || []);

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
   * Agregar item a includes
   */
  addIncludeItem() {
    const newItem: ProposalItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: '',
      type: 'both',
      order: this.includeItems().length + 1
    };
    this.includeItems.update(items => [...items, newItem]);
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
   * Guardar proposal
   */
  async save() {
    if (this.proposalForm.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.isLoading.set(true);
      const formValue = this.proposalForm.value;

      const subtotal = formValue.subtotal || 0;
      const taxPercentage = formValue.taxPercentage || 0;
      const discountPercentage = formValue.discountPercentage || 0;
      const tax = this.calculateTax();
      const discount = this.calculateDiscount();
      const total = this.calculateTotal();

      // Convertir lista fija de extras a ProposalItem[] solo si el checkbox está habilitado
      const extrasToSave: ProposalItem[] = this.includeExtrasSection()
        ? this.FIXED_EXTRAS.map((description, index) => ({
            id: `extra-${index + 1}`,
            description,
            type: 'both' as const,
            order: index + 1
          }))
        : [];

      const proposalData: CreateProposalData = {
        ownerId: formValue.ownerId,
        ownerName: formValue.ownerName,
        ownerEmail: formValue.ownerEmail,
        ownerPhone: formValue.ownerPhone,
        address: formValue.address,
        city: formValue.city,
        state: formValue.state,
        zipCode: formValue.zipCode,
        workType: formValue.workType,
        jobCategory: formValue.jobCategory || undefined,
        date: Timestamp.fromDate(new Date(formValue.date)),
        validUntil: formValue.validUntil ? Timestamp.fromDate(new Date(formValue.validUntil)) : undefined,
        includes: this.includeItems(),
        extras: extrasToSave,
        subtotal,
        tax,
        taxPercentage,
        discount,
        discountPercentage,
        total,
        notes: formValue.notes,
        internalNotes: formValue.internalNotes,
        terms: formValue.terms,
        status: 'draft'
      };

      if (this.isEditMode() && this.proposalId()) {
        await this.proposalsService.updateProposal(this.proposalId()!, proposalData);
        this.snackBar.open('Estimado actualizado exitosamente', 'Cerrar', { duration: 3000 });
      } else {
        const newProposal = await this.proposalsService.createProposal(proposalData);
        this.snackBar.open('Estimado creado exitosamente', 'Cerrar', { duration: 3000 });
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
