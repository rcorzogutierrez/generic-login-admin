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

// Models
import { Proposal, CreateProposalData, ProposalItem } from '../../models';
import { Client } from '../../../clients/models';

// Components
import { AddClientDialogComponent } from '../add-client-dialog/add-client-dialog.component';

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

  // Computed - Clientes filtrados por búsqueda
  filteredClients = computed(() => {
    const searchTerm = this.clientSearchTerm();
    const term = (searchTerm || '').toLowerCase().trim();
    const allClients = this.clients();

    if (!term) {
      return allClients;
    }

    return allClients.filter(client => {
      const nameMatch = (client.name || '').toLowerCase().includes(term);
      const emailMatch = (client.email || '').toLowerCase().includes(term);
      const phoneMatch = (client.phone || '').includes(term);

      return nameMatch || emailMatch || phoneMatch;
    });
  });

  includeItems = signal<ProposalItem[]>([]);
  extraItems = signal<ProposalItem[]>([]);

  // Form
  proposalForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  async ngOnInit() {
    // Cargar clientes
    await this.clientsService.initialize();

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
      date: [new Date(), Validators.required],
      validUntil: [''],
      notes: [''],
      internalNotes: [''],
      terms: [''],
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
        ownerName: client.name,
        ownerEmail: client.email || '',
        ownerPhone: client.phone || '',
        address: client.address || '',
        city: client.city || ''
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
          date: proposal.date.toDate(),
          validUntil: proposal.validUntil?.toDate() || null,
          notes: proposal.notes || '',
          internalNotes: proposal.internalNotes || '',
          terms: proposal.terms || '',
          taxPercentage: proposal.taxPercentage || 0,
          discountPercentage: proposal.discountPercentage || 0
        });

        this.includeItems.set(proposal.includes || []);
        this.extraItems.set(proposal.extras || []);
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
   * Agregar item a extras
   */
  addExtraItem() {
    const newItem: ProposalItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: '',
      type: 'both',
      order: this.extraItems().length + 1
    };
    this.extraItems.update(items => [...items, newItem]);
  }

  /**
   * Actualizar item de includes
   */
  updateIncludeItem(itemId: string, field: keyof ProposalItem, value: any) {
    this.includeItems.update(items =>
      items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };

          // Recalcular total si cambia quantity o unitPrice
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.totalPrice = (updatedItem.quantity || 0) * (updatedItem.unitPrice || 0);
          }

          return updatedItem;
        }
        return item;
      })
    );
  }

  /**
   * Actualizar item de extras
   */
  updateExtraItem(itemId: string, field: keyof ProposalItem, value: any) {
    this.extraItems.update(items =>
      items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
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
   * Eliminar item de extras
   */
  removeExtraItem(itemId: string) {
    this.extraItems.update(items => items.filter(item => item.id !== itemId));
  }

  /**
   * Calcular subtotal
   */
  calculateSubtotal(): number {
    return this.includeItems().reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  }

  /**
   * Calcular total
   */
  calculateTotal(): number {
    const subtotal = this.calculateSubtotal();
    const taxPercentage = this.proposalForm.get('taxPercentage')?.value || 0;
    const discountPercentage = this.proposalForm.get('discountPercentage')?.value || 0;

    const tax = (subtotal * taxPercentage) / 100;
    const discount = (subtotal * discountPercentage) / 100;

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

      const subtotal = this.calculateSubtotal();
      const taxPercentage = formValue.taxPercentage || 0;
      const discountPercentage = formValue.discountPercentage || 0;
      const tax = (subtotal * taxPercentage) / 100;
      const discount = (subtotal * discountPercentage) / 100;
      const total = this.calculateTotal();

      const proposalData: CreateProposalData = {
        ownerId: formValue.ownerId,
        ownerName: formValue.ownerName,
        ownerEmail: formValue.ownerEmail,
        ownerPhone: formValue.ownerPhone,
        address: formValue.address,
        city: formValue.city,
        state: formValue.state,
        zipCode: formValue.zipCode,
        date: Timestamp.fromDate(new Date(formValue.date)),
        validUntil: formValue.validUntil ? Timestamp.fromDate(new Date(formValue.validUntil)) : undefined,
        includes: this.includeItems(),
        extras: this.extraItems(),
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
        this.clientSearchTerm.set(newClient.name);
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
    this.clientSearchTerm.set(client.name);
  }

  /**
   * Obtener nombre del cliente seleccionado
   */
  getSelectedClientName(): string {
    const ownerId = this.proposalForm.get('ownerId')?.value;
    if (!ownerId) return '';

    const client = this.clients().find(c => c.id === ownerId);
    return client?.name || '';
  }
}
