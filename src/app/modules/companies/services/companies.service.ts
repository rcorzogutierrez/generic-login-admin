import { Injectable, signal, computed } from '@angular/core';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  Timestamp,
  doc
} from 'firebase/firestore';
import {
  getDocsWithLogging as getDocs,
  addDocWithLogging as addDoc,
  updateDocWithLogging as updateDoc,
  deleteDocWithLogging as deleteDoc
} from '../../../shared/utils/firebase-logger.utils';
import { OperationResult } from '../../../shared/models';
import { Company } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CompaniesService {
  private db = getFirestore();
  private isInitialized = false;

  private companiesSignal = signal<Company[]>([]);
  public companies = this.companiesSignal.asReadonly();

  public activeCompanies = computed(() =>
    this.companiesSignal().filter(c => c.isActive)
  );

  public totalCompanies = computed(() => this.companiesSignal().length);

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.loadCompanies();
    this.isInitialized = true;
  }

  async forceReload(): Promise<void> {
    await this.loadCompanies();
  }

  private async loadCompanies(): Promise<void> {
    const companiesRef = collection(this.db, 'companies');
    const q = query(companiesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const companies = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data['createdAt']?.toDate() || new Date(),
        updatedAt: data['updatedAt']?.toDate() || null
      } as Company;
    });

    this.companiesSignal.set(companies);
  }

  async createCompany(companyData: Partial<Company>, currentUserUid: string): Promise<OperationResult> {
    try {
      const companiesRef = collection(this.db, 'companies');
      const newCompany: any = {
        ...companyData,
        isActive: true,
        createdAt: Timestamp.now(),
        createdBy: currentUserUid
      };

      const docRef = await addDoc(companiesRef, newCompany);
      await this.loadCompanies();

      return {
        success: true,
        message: 'Empresa creada exitosamente',
        data: { id: docRef.id }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al crear empresa: ' + error.message
      };
    }
  }

  async updateCompany(companyId: string, updates: Partial<Company>, currentUserUid: string): Promise<OperationResult> {
    try {
      const companiesRef = collection(this.db, 'companies');
      const companyDocRef = doc(companiesRef, companyId);

      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now(),
        updatedBy: currentUserUid
      };

      await updateDoc(companyDocRef, updateData);
      await this.loadCompanies();

      return {
        success: true,
        message: 'Empresa actualizada exitosamente'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al actualizar empresa: ' + error.message
      };
    }
  }

  async deleteCompany(companyId: string): Promise<OperationResult> {
    try {
      const companiesRef = collection(this.db, 'companies');
      const companyDocRef = doc(companiesRef, companyId);

      await deleteDoc(companyDocRef);
      await this.loadCompanies();

      return {
        success: true,
        message: 'Empresa eliminada exitosamente'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al eliminar empresa: ' + error.message
      };
    }
  }

  async deleteMultipleCompanies(companyIds: string[]): Promise<OperationResult> {
    const errors: string[] = [];
    let successCount = 0;

    for (const id of companyIds) {
      try {
        const companiesRef = collection(this.db, 'companies');
        const companyDocRef = doc(companiesRef, id);
        await deleteDoc(companyDocRef);
        successCount++;
      } catch (error: any) {
        errors.push(`Error eliminando empresa ${id}: ${error.message}`);
      }
    }

    await this.loadCompanies();

    if (errors.length === 0) {
      return {
        success: true,
        message: `${successCount} empresa(s) eliminada(s) exitosamente`
      };
    } else if (successCount > 0) {
      return {
        success: true,
        message: `${successCount} eliminada(s), ${errors.length} fallida(s)`,
        errors
      };
    } else {
      return {
        success: false,
        message: 'Error al eliminar empresas',
        errors
      };
    }
  }

  async toggleActive(companyId: string, isActive: boolean, currentUserUid: string): Promise<OperationResult> {
    try {
      const companiesRef = collection(this.db, 'companies');
      const companyDocRef = doc(companiesRef, companyId);

      await updateDoc(companyDocRef, {
        isActive,
        updatedAt: Timestamp.now(),
        updatedBy: currentUserUid
      });

      await this.loadCompanies();

      return {
        success: true,
        message: `Empresa ${isActive ? 'activada' : 'inactivada'} exitosamente`
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al cambiar estado de la empresa: ' + error.message
      };
    }
  }

  searchCompanies(searchTerm: string): Company[] {
    if (!searchTerm.trim()) return this.companiesSignal();

    const term = searchTerm.toLowerCase();
    return this.companiesSignal().filter(company =>
      company.legalName.toLowerCase().includes(term) ||
      company.taxId.toLowerCase().includes(term) ||
      (company.email && company.email.toLowerCase().includes(term)) ||
      (company.phone && company.phone.includes(term))
    );
  }

  getCompanyById(companyId: string): Company | undefined {
    return this.companiesSignal().find(c => c.id === companyId);
  }
}
