// src/app/modules/projects/services/catalog-items.service.ts

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
  Timestamp
} from 'firebase/firestore';
import {
  CatalogItem,
  CreateCatalogItemData,
  UpdateCatalogItemData
} from '../models';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CatalogItemsService {
  private firestore = getFirestore();
  private authService = inject(AuthService);

  // Collection reference
  private catalogItemsCollection = collection(this.firestore, 'catalogItems');

  // Signals
  catalogItems = signal<CatalogItem[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  private isInitialized = false;

  constructor() {}

  /**
   * Inicializar servicio - cargar todos los items del catálogo
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.isLoading.set(true);
      this.error.set(null);

      // Consulta simple sin filtros - filtrar y ordenar en memoria
      const snapshot = await getDocs(this.catalogItemsCollection);

      let items: CatalogItem[] = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as CatalogItem))
        .filter(item => item.isActive === true)  // Filtrar activos en memoria
        .sort((a, b) => a.name.localeCompare(b.name));  // Ordenar por nombre en memoria

      this.catalogItems.set(items);
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Error inicializando catalog items:', error);
      this.error.set('Error al cargar el catálogo de items');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Obtener item por ID
   */
  async getItemById(id: string): Promise<CatalogItem | null> {
    try {
      const docRef = doc(this.catalogItemsCollection, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as CatalogItem;
      }

      return null;
    } catch (error) {
      console.error('❌ Error obteniendo item:', error);
      this.error.set('Error al obtener el item');
      throw error;
    }
  }

  /**
   * Crear nuevo item en el catálogo
   */
  async createItem(data: CreateCatalogItemData): Promise<CatalogItem> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const user = this.authService.user();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const now = Timestamp.now();
      const newItem: Omit<CatalogItem, 'id'> = {
        ...data,
        createdAt: now,
        updatedAt: now,
        createdBy: user.uid,
        isActive: true
      };

      const docRef = await addDoc(this.catalogItemsCollection, newItem);
      const createdItem: CatalogItem = {
        id: docRef.id,
        ...newItem
      };

      // Actualizar signal
      this.catalogItems.update(items => [...items, createdItem]);

      return createdItem;
    } catch (error) {
      console.error('❌ Error creando item:', error);
      this.error.set('Error al crear el item');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Actualizar item del catálogo
   */
  async updateItem(id: string, data: UpdateCatalogItemData): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const docRef = doc(this.catalogItemsCollection, id);
      const updateData = {
        ...data,
        updatedAt: Timestamp.now()
      };

      await updateDoc(docRef, updateData);

      // Actualizar signal
      this.catalogItems.update(items =>
        items.map(item => item.id === id ? { ...item, ...updateData } : item)
      );
    } catch (error) {
      console.error('❌ Error actualizando item:', error);
      this.error.set('Error al actualizar el item');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Eliminar item del catálogo (soft delete)
   */
  async deleteItem(id: string): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      await this.updateItem(id, { isActive: false });

      // Remover del signal
      this.catalogItems.update(items => items.filter(item => item.id !== id));
    } catch (error) {
      console.error('❌ Error eliminando item:', error);
      this.error.set('Error al eliminar el item');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Buscar items por texto
   */
  searchItems(searchTerm: string): CatalogItem[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      return this.catalogItems();
    }

    return this.catalogItems().filter(item => {
      const nameMatch = item.name.toLowerCase().includes(term);
      const descMatch = item.description?.toLowerCase().includes(term) || false;
      return nameMatch || descMatch;
    });
  }

  /**
   * Recargar items del catálogo
   */
  async refresh(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
  }
}
