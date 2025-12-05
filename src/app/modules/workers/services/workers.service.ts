import { Injectable, signal, computed } from '@angular/core';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  Timestamp,
  doc,
  where
} from 'firebase/firestore';
import {
  getDocsWithLogging as getDocs,
  addDocWithLogging as addDoc,
  updateDocWithLogging as updateDoc,
  deleteDocWithLogging as deleteDoc
} from '../../../shared/utils/firebase-logger.utils';
import { OperationResult } from '../../../shared/models';
import { Worker, WorkerType } from '../models';

@Injectable({
  providedIn: 'root'
})
export class WorkersService {
  private db = getFirestore();
  private isInitialized = false;

  private workersSignal = signal<Worker[]>([]);
  public workers = this.workersSignal.asReadonly();

  public activeWorkers = computed(() =>
    this.workersSignal().filter(w => w.isActive)
  );

  public totalWorkers = computed(() => this.workersSignal().length);

  // Filtrar por tipo
  public internalWorkers = computed(() =>
    this.workersSignal().filter(w => w.workerType === 'internal')
  );

  public contractorWorkers = computed(() =>
    this.workersSignal().filter(w => w.workerType === 'contractor')
  );

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.loadWorkers();
    this.isInitialized = true;
  }

  async forceReload(): Promise<void> {
    await this.loadWorkers();
  }

  private async loadWorkers(): Promise<void> {
    const workersRef = collection(this.db, 'workers');
    const q = query(workersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const workers = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data['createdAt']?.toDate() || new Date(),
        updatedAt: data['updatedAt']?.toDate() || null
      } as Worker;
    });

    this.workersSignal.set(workers);
  }

  async createWorker(workerData: Partial<Worker>, currentUserUid: string): Promise<OperationResult> {
    try {
      const workersRef = collection(this.db, 'workers');
      const newWorker: any = {
        ...workerData,
        isActive: true,
        createdAt: Timestamp.now(),
        createdBy: currentUserUid
      };

      const docRef = await addDoc(workersRef, newWorker);
      await this.loadWorkers();

      return {
        success: true,
        message: 'Trabajador creado exitosamente',
        data: { id: docRef.id }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al crear trabajador: ' + error.message
      };
    }
  }

  async updateWorker(workerId: string, updates: Partial<Worker>, currentUserUid: string): Promise<OperationResult> {
    try {
      const workersRef = collection(this.db, 'workers');
      const workerDocRef = doc(workersRef, workerId);

      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now(),
        updatedBy: currentUserUid
      };

      await updateDoc(workerDocRef, updateData);
      await this.loadWorkers();

      return {
        success: true,
        message: 'Trabajador actualizado exitosamente'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al actualizar trabajador: ' + error.message
      };
    }
  }

  async deleteWorker(workerId: string): Promise<OperationResult> {
    try {
      const workersRef = collection(this.db, 'workers');
      const workerDocRef = doc(workersRef, workerId);

      await deleteDoc(workerDocRef);
      await this.loadWorkers();

      return {
        success: true,
        message: 'Trabajador eliminado exitosamente'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al eliminar trabajador: ' + error.message
      };
    }
  }

  async deleteMultipleWorkers(workerIds: string[]): Promise<OperationResult> {
    const errors: string[] = [];
    let successCount = 0;

    for (const id of workerIds) {
      try {
        const workersRef = collection(this.db, 'workers');
        const workerDocRef = doc(workersRef, id);
        await deleteDoc(workerDocRef);
        successCount++;
      } catch (error: any) {
        errors.push(`Error eliminando trabajador ${id}: ${error.message}`);
      }
    }

    await this.loadWorkers();

    if (errors.length === 0) {
      return {
        success: true,
        message: `${successCount} trabajador(es) eliminado(s) exitosamente`
      };
    } else if (successCount > 0) {
      return {
        success: true,
        message: `${successCount} eliminado(s), ${errors.length} fallido(s)`,
        errors
      };
    } else {
      return {
        success: false,
        message: 'Error al eliminar trabajadores',
        errors
      };
    }
  }

  async toggleActive(workerId: string, isActive: boolean, currentUserUid: string): Promise<OperationResult> {
    try {
      const workersRef = collection(this.db, 'workers');
      const workerDocRef = doc(workersRef, workerId);

      await updateDoc(workerDocRef, {
        isActive,
        updatedAt: Timestamp.now(),
        updatedBy: currentUserUid
      });

      await this.loadWorkers();

      return {
        success: true,
        message: `Trabajador ${isActive ? 'activado' : 'inactivado'} exitosamente`
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al cambiar estado del trabajador: ' + error.message
      };
    }
  }

  searchWorkers(searchTerm: string): Worker[] {
    if (!searchTerm.trim()) return this.workersSignal();

    const term = searchTerm.toLowerCase();
    return this.workersSignal().filter(worker =>
      worker.fullName.toLowerCase().includes(term) ||
      (worker.phone && worker.phone.includes(term)) ||
      (worker.idOrLicense && worker.idOrLicense.toLowerCase().includes(term)) ||
      (worker.companyName && worker.companyName.toLowerCase().includes(term))
    );
  }

  getWorkerById(workerId: string): Worker | undefined {
    return this.workersSignal().find(w => w.id === workerId);
  }

  getWorkersByCompany(companyId: string): Worker[] {
    return this.workersSignal().filter(w => w.companyId === companyId);
  }

  getWorkersByType(type: WorkerType): Worker[] {
    return this.workersSignal().filter(w => w.workerType === type);
  }
}
