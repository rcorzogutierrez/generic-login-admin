/**
 * Servicio CRUD para Materials
 */

import { Injectable, signal, computed } from '@angular/core';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import {
  getDocsWithLogging as getDocs,
  addDocWithLogging as addDoc,
  updateDocWithLogging as updateDoc,
  deleteDocWithLogging as deleteDoc
} from '../../../shared/utils/firebase-logger.utils';
import { Material } from '../models';

export interface OperationResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MaterialsService {
  private db = getFirestore();
  private isInitialized = false;

  // Signals para materials
  private materialsSignal = signal<Material[]>([]);
  public materials = this.materialsSignal.asReadonly();

  // Computed signals
  public activeMaterials = computed(() =>
    this.materialsSignal().filter(m => m.isActive)
  );

  public totalMaterials = computed(() => this.materialsSignal().length);

  /**
   * Inicializa el servicio y carga materials
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.loadMaterials();
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Error inicializando MaterialsService:', error);
      throw error;
    }
  }

  /**
   * Carga todos los materials
   */
  private async loadMaterials(): Promise<void> {
    try {
      const materialsRef = collection(this.db, 'materials');
      const q = query(materialsRef, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);

      const materials = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data['createdAt']?.toDate() || new Date(),
          updatedAt: data['updatedAt']?.toDate() || null
        } as Material;
      });

      this.materialsSignal.set(materials);
    } catch (error) {
      console.error('❌ Error cargando materials:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo material
   */
  async createMaterial(materialData: Partial<Material>, currentUserUid: string): Promise<OperationResult> {
    try {
      const materialsRef = collection(this.db, 'materials');

      const newMaterial: any = {
        ...materialData,
        isActive: true,
        createdAt: Timestamp.now(),
        createdBy: currentUserUid
      };

      const docRef = await addDoc(materialsRef, newMaterial);

      await this.loadMaterials();

      return {
        success: true,
        message: 'Material creado exitosamente',
        data: { id: docRef.id }
      };
    } catch (error: any) {
      console.error('❌ Error creando material:', error);
      return {
        success: false,
        message: 'Error al crear material: ' + error.message
      };
    }
  }

  /**
   * Actualiza un material
   */
  async updateMaterial(materialId: string, updates: Partial<Material>, currentUserUid: string): Promise<OperationResult> {
    try {
      const materialsRef = collection(this.db, 'materials');
      const materialDocRef = doc(materialsRef, materialId);

      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now(),
        updatedBy: currentUserUid
      };

      await updateDoc(materialDocRef, updateData);

      await this.loadMaterials();

      return {
        success: true,
        message: 'Material actualizado exitosamente'
      };
    } catch (error: any) {
      console.error('❌ Error actualizando material:', error);
      return {
        success: false,
        message: 'Error al actualizar material: ' + error.message
      };
    }
  }

  /**
   * Elimina un material
   */
  async deleteMaterial(materialId: string): Promise<OperationResult> {
    try {
      const materialsRef = collection(this.db, 'materials');
      const materialDocRef = doc(materialsRef, materialId);

      await deleteDoc(materialDocRef);

      await this.loadMaterials();

      return {
        success: true,
        message: 'Material eliminado exitosamente'
      };
    } catch (error: any) {
      console.error('❌ Error eliminando material:', error);
      return {
        success: false,
        message: 'Error al eliminar material: ' + error.message
      };
    }
  }

  /**
   * Elimina múltiples materials
   */
  async deleteMultipleMaterials(materialIds: string[]): Promise<OperationResult> {
    try {
      const errors: string[] = [];
      let successCount = 0;

      for (const id of materialIds) {
        try {
          const materialsRef = collection(this.db, 'materials');
          const materialDocRef = doc(materialsRef, id);
          await deleteDoc(materialDocRef);
          successCount++;
        } catch (error: any) {
          errors.push(`Error eliminando material ${id}: ${error.message}`);
        }
      }

      await this.loadMaterials();

      if (errors.length === 0) {
        return {
          success: true,
          message: `${successCount} material(es) eliminado(s) exitosamente`
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
          message: 'Error al eliminar materials',
          errors
        };
      }
    } catch (error: any) {
      console.error('❌ Error eliminando múltiples materials:', error);
      return {
        success: false,
        message: 'Error al eliminar materials: ' + error.message
      };
    }
  }

  /**
   * Busca materials por término
   */
  searchMaterials(searchTerm: string): Material[] {
    if (!searchTerm.trim()) {
      return this.materialsSignal();
    }

    const term = searchTerm.toLowerCase();
    return this.materialsSignal().filter(material =>
      material.name.toLowerCase().includes(term) ||
      material.code.toLowerCase().includes(term) ||
      (material.description && material.description.toLowerCase().includes(term))
    );
  }
}

// Import necesario que falta
import { doc } from 'firebase/firestore';
