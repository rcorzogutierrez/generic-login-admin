import { Injectable, signal, computed, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  QueryConstraint,
  Timestamp,
  setDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { GenericEntity } from '../models/generic-entity.interface';
import { AuthService } from '../../core/services/auth.service';

/**
 * Servicio genérico base para operaciones CRUD en Firestore
 * Usa Signals de Angular para manejo de estado reactivo
 *
 * @example
 * // Extender en servicio específico:
 * export class ProductosService extends GenericFirestoreService<Producto> {
 *   constructor() {
 *     super('productos');
 *   }
 * }
 */
@Injectable()
export class GenericFirestoreService<T extends GenericEntity> {
  protected firestore = inject(Firestore);
  protected authService = inject(AuthService);

  // Signals para estado reactivo
  items = signal<T[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Computed signals
  activeItems = computed(() => this.items().filter(item => item.isActive !== false));
  itemsCount = computed(() => this.items().length);

  constructor(protected collectionName: string) {}

  /**
   * Inicializa el servicio cargando los items
   */
  async initialize(): Promise<void> {
    await this.loadItems();
  }

  /**
   * Carga todos los items de la colección
   */
  async loadItems(constraints: QueryConstraint[] = []): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const collectionRef = collection(this.firestore, this.collectionName);
      const q = query(collectionRef, ...constraints);

      const querySnapshot = await collectionData(q, { idField: 'id' }).toPromise();

      if (querySnapshot) {
        const items = querySnapshot.map(item => this.convertTimestamps(item) as T);
        this.items.set(items);
      }
    } catch (error) {
      console.error(`Error cargando ${this.collectionName}:`, error);
      this.error.set(`Error al cargar los datos: ${error}`);
      this.items.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Obtiene un item por ID
   */
  getById(id: string): T | undefined {
    return this.items().find(item => item.id === id);
  }

  /**
   * Crea un nuevo item
   */
  async create(data: Omit<T, 'id'>): Promise<string> {
    try {
      const user = this.authService.authorizedUser();
      const collectionRef = collection(this.firestore, this.collectionName);

      const newItem = {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user?.uid || 'unknown',
        updatedBy: user?.uid || 'unknown',
        isActive: true
      };

      const docRef = await addDoc(collectionRef, newItem);
      await this.loadItems(); // Recargar lista
      return docRef.id;
    } catch (error) {
      console.error(`Error creando ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza un item existente
   */
  async update(id: string, data: Partial<T>): Promise<void> {
    try {
      const user = this.authService.authorizedUser();
      const docRef = doc(this.firestore, this.collectionName, id);

      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
        updatedBy: user?.uid || 'unknown'
      };

      await updateDoc(docRef, updateData);
      await this.loadItems(); // Recargar lista
    } catch (error) {
      console.error(`Error actualizando ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Elimina un item (eliminación física)
   */
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      await deleteDoc(docRef);
      await this.loadItems(); // Recargar lista
    } catch (error) {
      console.error(`Error eliminando ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Elimina múltiples items
   */
  async deleteMultiple(ids: string[]): Promise<void> {
    try {
      await Promise.all(ids.map(id => this.delete(id)));
    } catch (error) {
      console.error(`Error eliminando múltiples ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Marca un item como activo/inactivo (eliminación lógica)
   */
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive } as Partial<T>);
  }

  /**
   * Busca items por texto en campos específicos
   */
  search(searchTerm: string, searchFields: string[]): T[] {
    if (!searchTerm) return this.items();

    const lowerSearchTerm = searchTerm.toLowerCase();
    return this.items().filter(item => {
      return searchFields.some(field => {
        const value = (item as any)[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(lowerSearchTerm);
      });
    });
  }

  /**
   * Ordena items por campo
   */
  sort(items: T[], field: string, direction: 'asc' | 'desc' = 'asc'): T[] {
    return [...items].sort((a, b) => {
      const aVal = (a as any)[field];
      const bVal = (b as any)[field];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Pagina items
   */
  paginate(items: T[], page: number, itemsPerPage: number): T[] {
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    return items.slice(start, end);
  }

  /**
   * Refresca los datos
   */
  async refresh(): Promise<void> {
    await this.loadItems();
  }

  /**
   * Convierte Timestamps de Firestore a Dates
   */
  protected convertTimestamps(data: any): any {
    const converted = { ...data };
    Object.keys(converted).forEach(key => {
      if (converted[key] instanceof Timestamp) {
        converted[key] = converted[key].toDate();
      }
    });
    return converted;
  }
}
