// src/app/modules/projects/services/proposals.service.ts

import { Injectable, inject, signal } from '@angular/core';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import {
  Proposal,
  CreateProposalData,
  UpdateProposalData,
  ProposalFilters,
  ProposalSort,
  ProposalStats,
  ProposalStatus,
  ProposalItem,
  CreateProposalItemData
} from '../models';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProposalsService {
  private firestore = getFirestore();
  private authService = inject(AuthService);

  // Collection reference
  private proposalsCollection = collection(this.firestore, 'proposals');

  // Signals
  proposals = signal<Proposal[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  stats = signal<ProposalStats>({
    total: 0,
    byStatus: {
      draft: 0,
      sent: 0,
      approved: 0,
      rejected: 0,
      converted_to_invoice: 0,
      cancelled: 0
    },
    totalValue: 0,
    averageValue: 0,
    approvalRate: 0
  });

  private isInitialized = false;
  private proposalCounter = 0;

  constructor() {
    this.initializeCounter();
  }

  /**
   * Inicializar el contador de proposals
   */
  private async initializeCounter(): Promise<void> {
    try {
      const snapshot = await getDocs(this.proposalsCollection);
      if (!snapshot.empty) {
        // Obtener el número más alto de proposal
        const numbers = snapshot.docs
          .map(doc => {
            const data = doc.data();
            const num = data['proposalNumber'] as string;
            if (num && num.startsWith('PROP-')) {
              return parseInt(num.split('-')[1], 10);
            }
            return 0;
          })
          .filter(num => !isNaN(num));

        this.proposalCounter = numbers.length > 0 ? Math.max(...numbers) : 0;
      }
    } catch (error) {
      console.error('❌ Error inicializando contador de proposals:', error);
    }
  }

  /**
   * Generar número de proposal único
   */
  private generateProposalNumber(): string {
    this.proposalCounter++;
    const paddedNumber = this.proposalCounter.toString().padStart(6, '0');
    return `PROP-${paddedNumber}`;
  }

  /**
   * Inicializar el servicio - cargar todos los proposals
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.loadProposals();
    this.isInitialized = true;
    console.log('✅ ProposalsService inicializado -', this.proposals().length, 'proposals cargados');
  }

  /**
   * Cargar todos los proposals
   */
  async loadProposals(filters?: ProposalFilters, sort?: ProposalSort): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      // Construir query
      const constraints: QueryConstraint[] = [];

      // Aplicar filtros
      if (filters?.isActive !== undefined) {
        constraints.push(where('isActive', '==', filters.isActive));
      }

      if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
      }

      if (filters?.ownerId) {
        constraints.push(where('ownerId', '==', filters.ownerId));
      }

      if (filters?.assignedTo) {
        constraints.push(where('assignedTo', '==', filters.assignedTo));
      }

      const q = query(this.proposalsCollection, ...constraints);
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.warn('⚠️ No se encontraron documentos en la colección "proposals"');
      }

      const proposals: Proposal[] = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data() as Omit<Proposal, 'id'>
      }));

      // Ordenar en memoria por el campo especificado
      if (proposals.length > 0) {
        const sortField = sort?.field || 'date';
        const sortDirection = sort?.direction || 'desc';
        proposals.sort((a: any, b: any) => {
          let aVal = a[sortField];
          let bVal = b[sortField];

          // Manejar Timestamps
          if (aVal instanceof Timestamp) {
            aVal = aVal.toMillis();
          }
          if (bVal instanceof Timestamp) {
            bVal = bVal.toMillis();
          }

          aVal = aVal || '';
          bVal = bVal || '';

          if (sortDirection === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
          }
        });
      }

      // Aplicar filtro de búsqueda en memoria
      let filteredProposals = proposals;
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filteredProposals = proposals.filter(proposal =>
          proposal.proposalNumber.toLowerCase().includes(term) ||
          proposal.ownerName.toLowerCase().includes(term) ||
          proposal.address?.toLowerCase().includes(term) ||
          proposal.city?.toLowerCase().includes(term)
        );
      }

      // Aplicar filtros de fecha
      if (filters?.dateFrom) {
        filteredProposals = filteredProposals.filter(
          p => p.date.toMillis() >= filters.dateFrom!.toMillis()
        );
      }

      if (filters?.dateTo) {
        filteredProposals = filteredProposals.filter(
          p => p.date.toMillis() <= filters.dateTo!.toMillis()
        );
      }

      // Aplicar filtros de total
      if (filters?.minTotal !== undefined) {
        filteredProposals = filteredProposals.filter(p => p.total >= filters.minTotal!);
      }

      if (filters?.maxTotal !== undefined) {
        filteredProposals = filteredProposals.filter(p => p.total <= filters.maxTotal!);
      }

      this.proposals.set(filteredProposals);
      this.calculateStats(filteredProposals);

    } catch (error) {
      console.error('❌ Error cargando proposals:', error);
      this.error.set('Error al cargar los proposals');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Obtener un proposal por ID
   */
  async getProposalById(id: string): Promise<Proposal | null> {
    try {
      const docRef = doc(this.firestore, `proposals/${id}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data() as Omit<Proposal, 'id'>
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Error obteniendo proposal ${id}:`, error);
      throw error;
    }
  }

  /**
   * Filtrar valores undefined/null/empty de un objeto antes de guardar en Firebase
   * Firebase no permite valores undefined
   */
  private sanitizeDataForFirebase<T extends Record<string, any>>(data: T): T {
    const sanitized = {} as T;

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const value = data[key];
        // Solo incluir valores que no sean undefined
        // Mantener null, arrays vacíos y strings vacíos ya que Firebase los permite
        if (value !== undefined) {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }

  /**
   * Crear un nuevo proposal
   */
  async createProposal(data: CreateProposalData): Promise<Proposal> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const now = Timestamp.now();

      const proposalData: Omit<Proposal, 'id'> = {
        ...data,
        proposalNumber: this.generateProposalNumber(),
        includes: data.includes || [],
        extras: data.extras || [],
        status: data.status || 'draft',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid
      };

      // Sanitizar datos para prevenir errores de Firebase con undefined
      const sanitizedData = this.sanitizeDataForFirebase(proposalData);

      const docRef = await addDoc(this.proposalsCollection, sanitizedData);

      const newProposal: Proposal = {
        id: docRef.id,
        ...proposalData
      };

      // Actualizar la lista local
      this.proposals.update(proposals => [...proposals, newProposal]);
      this.calculateStats(this.proposals());

      return newProposal;

    } catch (error) {
      console.error('❌ Error creando proposal:', error);
      this.error.set('Error al crear el proposal');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Actualizar un proposal existente
   */
  async updateProposal(id: string, data: UpdateProposalData): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const docRef = doc(this.firestore, `proposals/${id}`);

      const updateData: Partial<Proposal> = {
        ...data,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.uid
      };

      // Sanitizar datos para prevenir errores de Firebase con undefined
      const sanitizedData = this.sanitizeDataForFirebase(updateData);

      await updateDoc(docRef, sanitizedData);

      // Actualizar la lista local
      this.proposals.update(proposals =>
        proposals.map(proposal =>
          proposal.id === id
            ? { ...proposal, ...updateData }
            : proposal
        )
      );

      this.calculateStats(this.proposals());

    } catch (error) {
      console.error(`❌ Error actualizando proposal ${id}:`, error);
      this.error.set('Error al actualizar el proposal');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Eliminar un proposal
   */
  async deleteProposal(id: string): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const docRef = doc(this.firestore, `proposals/${id}`);
      await deleteDoc(docRef);

      // Actualizar la lista local
      this.proposals.update(proposals => proposals.filter(proposal => proposal.id !== id));
      this.calculateStats(this.proposals());

    } catch (error) {
      console.error(`❌ Error eliminando proposal ${id}:`, error);
      this.error.set('Error al eliminar el proposal');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Cambiar el estado de un proposal
   */
  async updateProposalStatus(id: string, status: ProposalStatus): Promise<void> {
    try {
      const updateData: UpdateProposalData = { status };

      // Si el status es 'approved', agregar la fecha de aprobación
      if (status === 'approved') {
        updateData.approvedDate = Timestamp.now();
      }

      // Si el status es 'sent', agregar la fecha de envío
      if (status === 'sent') {
        updateData.sentDate = Timestamp.now();
      }

      await this.updateProposal(id, updateData);
    } catch (error) {
      console.error(`❌ Error cambiando estado del proposal ${id}:`, error);
      throw error;
    }
  }

  /**
   * Convertir proposal a factura
   */
  async convertToInvoice(proposalId: string): Promise<string> {
    try {
      // TODO: Implementar lógica para crear factura
      // Por ahora, solo actualizamos el estado
      await this.updateProposalStatus(proposalId, 'converted_to_invoice');

      // Aquí se debería crear la factura en el módulo de facturas
      // y retornar el ID de la factura creada
      const invoiceId = 'INV-000001'; // Placeholder

      await this.updateProposal(proposalId, { invoiceId });

      return invoiceId;
    } catch (error) {
      console.error(`❌ Error convirtiendo proposal ${proposalId} a factura:`, error);
      throw error;
    }
  }

  /**
   * Agregar item a la sección includes
   */
  async addIncludeItem(proposalId: string, itemData: CreateProposalItemData): Promise<void> {
    try {
      const proposal = await this.getProposalById(proposalId);
      if (!proposal) {
        throw new Error('Proposal no encontrado');
      }

      const newItem: ProposalItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...itemData,
        order: proposal.includes.length + 1
      };

      const updatedIncludes = [...proposal.includes, newItem];
      await this.updateProposal(proposalId, { includes: updatedIncludes });

      // Recalcular totales
      await this.recalculateTotals(proposalId);
    } catch (error) {
      console.error(`❌ Error agregando item al proposal ${proposalId}:`, error);
      throw error;
    }
  }

  /**
   * Agregar item a la sección extras
   */
  async addExtraItem(proposalId: string, itemData: CreateProposalItemData): Promise<void> {
    try {
      const proposal = await this.getProposalById(proposalId);
      if (!proposal) {
        throw new Error('Proposal no encontrado');
      }

      const newItem: ProposalItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...itemData,
        order: proposal.extras.length + 1
      };

      const updatedExtras = [...proposal.extras, newItem];
      await this.updateProposal(proposalId, { extras: updatedExtras });
    } catch (error) {
      console.error(`❌ Error agregando extra al proposal ${proposalId}:`, error);
      throw error;
    }
  }

  /**
   * Eliminar item de includes
   */
  async removeIncludeItem(proposalId: string, itemId: string): Promise<void> {
    try {
      const proposal = await this.getProposalById(proposalId);
      if (!proposal) {
        throw new Error('Proposal no encontrado');
      }

      const updatedIncludes = proposal.includes.filter(item => item.id !== itemId);
      await this.updateProposal(proposalId, { includes: updatedIncludes });

      // Recalcular totales
      await this.recalculateTotals(proposalId);
    } catch (error) {
      console.error(`❌ Error eliminando item del proposal ${proposalId}:`, error);
      throw error;
    }
  }

  /**
   * Eliminar item de extras
   */
  async removeExtraItem(proposalId: string, itemId: string): Promise<void> {
    try {
      const proposal = await this.getProposalById(proposalId);
      if (!proposal) {
        throw new Error('Proposal no encontrado');
      }

      const updatedExtras = proposal.extras.filter(item => item.id !== itemId);
      await this.updateProposal(proposalId, { extras: updatedExtras });
    } catch (error) {
      console.error(`❌ Error eliminando extra del proposal ${proposalId}:`, error);
      throw error;
    }
  }

  /**
   * Recalcular totales del proposal
   */
  async recalculateTotals(proposalId: string): Promise<void> {
    try {
      const proposal = await this.getProposalById(proposalId);
      if (!proposal) {
        throw new Error('Proposal no encontrado');
      }

      // Calcular subtotal de items incluidos
      const subtotal = proposal.includes.reduce((sum, item) => {
        return sum + (item.totalPrice || 0);
      }, 0);

      // Calcular impuestos si hay porcentaje definido
      const tax = proposal.taxPercentage
        ? (subtotal * proposal.taxPercentage) / 100
        : proposal.tax || 0;

      // Calcular descuento si hay porcentaje definido
      const discount = proposal.discountPercentage
        ? (subtotal * proposal.discountPercentage) / 100
        : proposal.discount || 0;

      // Calcular total
      const total = subtotal + tax - discount;

      await this.updateProposal(proposalId, {
        subtotal,
        tax,
        discount,
        total
      });
    } catch (error) {
      console.error(`❌ Error recalculando totales del proposal ${proposalId}:`, error);
      throw error;
    }
  }

  /**
   * Obtener proposals por cliente
   */
  async getProposalsByOwner(ownerId: string): Promise<Proposal[]> {
    const filters: ProposalFilters = { ownerId };
    await this.loadProposals(filters);
    return this.proposals();
  }

  /**
   * Calcular estadísticas de proposals
   */
  private calculateStats(proposals: Proposal[]): void {
    const stats: ProposalStats = {
      total: proposals.length,
      byStatus: {
        draft: proposals.filter(p => p.status === 'draft').length,
        sent: proposals.filter(p => p.status === 'sent').length,
        approved: proposals.filter(p => p.status === 'approved').length,
        rejected: proposals.filter(p => p.status === 'rejected').length,
        converted_to_invoice: proposals.filter(p => p.status === 'converted_to_invoice').length,
        cancelled: proposals.filter(p => p.status === 'cancelled').length
      },
      totalValue: proposals.reduce((sum, p) => sum + (p.total || 0), 0),
      averageValue: 0,
      approvalRate: 0
    };

    // Calcular valor promedio
    if (proposals.length > 0) {
      stats.averageValue = stats.totalValue / proposals.length;
    }

    // Calcular tasa de aprobación
    const sentOrApproved = proposals.filter(
      p => ['sent', 'approved', 'converted_to_invoice'].includes(p.status)
    ).length;

    if (sentOrApproved > 0) {
      const approved = proposals.filter(
        p => ['approved', 'converted_to_invoice'].includes(p.status)
      ).length;
      stats.approvalRate = (approved / sentOrApproved) * 100;
    }

    this.stats.set(stats);
  }

  /**
   * Refrescar la lista de proposals
   */
  async refresh(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Limpiar el servicio
   */
  clear(): void {
    this.proposals.set([]);
    this.stats.set({
      total: 0,
      byStatus: {
        draft: 0,
        sent: 0,
        approved: 0,
        rejected: 0,
        converted_to_invoice: 0,
        cancelled: 0
      },
      totalValue: 0,
      averageValue: 0,
      approvalRate: 0
    });
    this.isLoading.set(false);
    this.error.set(null);
    this.isInitialized = false;
  }
}
