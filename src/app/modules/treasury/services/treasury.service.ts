import { Injectable, inject, signal, computed } from '@angular/core';
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
  Timestamp
} from 'firebase/firestore';
import { AuthService } from '../../../core/services/auth.service';
import {
  Cobro,
  Pago,
  CreateCobroData,
  UpdateCobroData,
  CreatePagoData,
  UpdatePagoData,
  TreasuryStats,
  CobroFilters,
  PagoFilters
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class TreasuryService {
  private db = getFirestore();
  private authService = inject(AuthService);

  private cobrosCollection = collection(this.db, 'cobros');
  private pagosCollection = collection(this.db, 'pagos');

  private isInitialized = false;

  // Private writable signals
  private cobrosSignal = signal<Cobro[]>([]);
  private pagosSignal = signal<Pago[]>([]);
  private isLoadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Public readonly signals
  public cobros = this.cobrosSignal.asReadonly();
  public pagos = this.pagosSignal.asReadonly();
  public isLoading = this.isLoadingSignal.asReadonly();
  public error = this.errorSignal.asReadonly();

  // Computed: Active cobros only
  public activeCobros = computed(() =>
    this.cobrosSignal().filter(c => c.isActive)
  );

  // Computed: Active pagos only
  public activePagos = computed(() =>
    this.pagosSignal().filter(p => p.isActive)
  );

  // Computed: Statistics
  public stats = computed<TreasuryStats>(() => {
    const cobros = this.activeCobros();
    const pagos = this.activePagos();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const sumaCobros = cobros.reduce((sum, c) => sum + (c.amount || 0), 0);
    const sumaPagos = pagos.reduce((sum, p) => sum + (p.amount || 0), 0);

    const cobrosEsteMes = cobros.filter(c => {
      const date = c.transactionDate?.toDate?.() || new Date(0);
      return date >= startOfMonth;
    }).reduce((sum, c) => sum + (c.amount || 0), 0);

    const pagosEsteMes = pagos.filter(p => {
      const date = p.transactionDate?.toDate?.() || new Date(0);
      return date >= startOfMonth;
    }).reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalCobros: cobros.length,
      totalPagos: pagos.length,
      sumaCobros,
      sumaPagos,
      balance: sumaCobros - sumaPagos,
      cobrosEsteMes,
      pagosEsteMes
    };
  });

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.isLoadingSignal.set(true);
    try {
      await Promise.all([
        this.loadCobros(),
        this.loadPagos()
      ]);
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing treasury service:', error);
      this.errorSignal.set('Error al cargar datos de tesorería');
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async forceReload(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
  }

  // ============================================
  // COBROS CRUD
  // ============================================

  private async loadCobros(): Promise<void> {
    const q = query(this.cobrosCollection, orderBy('transactionDate', 'desc'));
    const snapshot = await getDocs(q);
    const cobros = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Cobro[];
    this.cobrosSignal.set(cobros);
  }

  async getCobroById(id: string): Promise<Cobro | null> {
    const docRef = doc(this.db, 'cobros', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Cobro;
    }
    return null;
  }

  async createCobro(data: CreateCobroData): Promise<Cobro> {
    const currentUser = this.authService.authorizedUser();
    if (!currentUser) throw new Error('Usuario no autenticado');

    const cobroData = {
      ...data,
      createdAt: Timestamp.now(),
      createdBy: currentUser.uid,
      isActive: true
    };

    const docRef = await addDoc(this.cobrosCollection, cobroData);
    const newCobro = { id: docRef.id, ...cobroData } as Cobro;

    this.cobrosSignal.update(cobros => [newCobro, ...cobros]);

    return newCobro;
  }

  async updateCobro(id: string, data: UpdateCobroData): Promise<void> {
    const currentUser = this.authService.authorizedUser();
    if (!currentUser) throw new Error('Usuario no autenticado');

    const docRef = doc(this.db, 'cobros', id);
    const updateData = {
      ...data,
      updatedAt: Timestamp.now(),
      updatedBy: currentUser.uid
    };

    await updateDoc(docRef, updateData);

    this.cobrosSignal.update(cobros =>
      cobros.map(c => c.id === id ? { ...c, ...updateData } : c)
    );
  }

  async deleteCobro(id: string): Promise<void> {
    const docRef = doc(this.db, 'cobros', id);
    await deleteDoc(docRef);
    this.cobrosSignal.update(cobros => cobros.filter(c => c.id !== id));
  }

  async toggleCobroStatus(id: string, isActive: boolean): Promise<void> {
    await this.updateCobro(id, { isActive } as any);
  }

  // ============================================
  // PAGOS CRUD
  // ============================================

  private async loadPagos(): Promise<void> {
    const q = query(this.pagosCollection, orderBy('transactionDate', 'desc'));
    const snapshot = await getDocs(q);
    const pagos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Pago[];
    this.pagosSignal.set(pagos);
  }

  async getPagoById(id: string): Promise<Pago | null> {
    const docRef = doc(this.db, 'pagos', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Pago;
    }
    return null;
  }

  async createPago(data: CreatePagoData): Promise<Pago> {
    const currentUser = this.authService.authorizedUser();
    if (!currentUser) throw new Error('Usuario no autenticado');

    const pagoData = {
      ...data,
      createdAt: Timestamp.now(),
      createdBy: currentUser.uid,
      isActive: true
    };

    const docRef = await addDoc(this.pagosCollection, pagoData);
    const newPago = { id: docRef.id, ...pagoData } as Pago;

    this.pagosSignal.update(pagos => [newPago, ...pagos]);

    return newPago;
  }

  async updatePago(id: string, data: UpdatePagoData): Promise<void> {
    const currentUser = this.authService.authorizedUser();
    if (!currentUser) throw new Error('Usuario no autenticado');

    const docRef = doc(this.db, 'pagos', id);
    const updateData = {
      ...data,
      updatedAt: Timestamp.now(),
      updatedBy: currentUser.uid
    };

    await updateDoc(docRef, updateData);

    this.pagosSignal.update(pagos =>
      pagos.map(p => p.id === id ? { ...p, ...updateData } : p)
    );
  }

  async deletePago(id: string): Promise<void> {
    const docRef = doc(this.db, 'pagos', id);
    await deleteDoc(docRef);
    this.pagosSignal.update(pagos => pagos.filter(p => p.id !== id));
  }

  async togglePagoStatus(id: string, isActive: boolean): Promise<void> {
    await this.updatePago(id, { isActive } as any);
  }

  // ============================================
  // SEARCH & FILTERS
  // ============================================

  searchCobros(term: string): Cobro[] {
    const searchLower = term.toLowerCase();
    return this.activeCobros().filter(cobro =>
      cobro.clientName?.toLowerCase().includes(searchLower) ||
      cobro.proposalNumber?.toLowerCase().includes(searchLower) ||
      cobro.checkNumber?.toLowerCase().includes(searchLower) ||
      cobro.referenceNumber?.toLowerCase().includes(searchLower)
    );
  }

  searchPagos(term: string): Pago[] {
    const searchLower = term.toLowerCase();
    return this.activePagos().filter(pago =>
      pago.workerName?.toLowerCase().includes(searchLower) ||
      pago.proposalNumbers?.some(n => n.toLowerCase().includes(searchLower)) ||
      pago.checkNumber?.toLowerCase().includes(searchLower) ||
      pago.referenceNumber?.toLowerCase().includes(searchLower)
    );
  }

  getCobrosByClient(clientId: string): Cobro[] {
    return this.activeCobros().filter(c => c.clientId === clientId);
  }

  getCobrosByProposal(proposalId: string): Cobro[] {
    return this.activeCobros().filter(c => c.proposalId === proposalId);
  }

  getPagosByWorker(workerId: string): Pago[] {
    return this.activePagos().filter(p => p.workerId === workerId);
  }

  getPagosByProposal(proposalId: string): Pago[] {
    return this.activePagos().filter(p => p.proposalIds?.includes(proposalId));
  }
}
