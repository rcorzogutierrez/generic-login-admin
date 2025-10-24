// src/app/modules/clients/services/clients.service.ts

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
  Client,
  CreateClientData,
  UpdateClientData,
  ClientFilters,
  ClientSort,
  ClientStats
} from '../models';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  private firestore = getFirestore();
  private authService = inject(AuthService);

  // Collection reference
  private clientsCollection = collection(this.firestore, 'clients');

  // Signals
  clients = signal<Client[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  stats = signal<ClientStats>({
    total: 0,
    active: 0,
    inactive: 0,
    potential: 0,
    archived: 0,
    byStatus: {}
  });

  private isInitialized = false;

  constructor() {}

  /**
   * Inicializar el servicio - cargar todos los clientes
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.loadClients();
    this.isInitialized = true;
  }

  /**
   * Cargar todos los clientes
   */
  async loadClients(filters?: ClientFilters, sort?: ClientSort): Promise<void> {
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

      if (filters?.assignedTo) {
        constraints.push(where('assignedTo', '==', filters.assignedTo));
      }

      // Aplicar ordenamiento
      if (sort) {
        constraints.push(orderBy(sort.field, sort.direction));
      } else {
        constraints.push(orderBy('name', 'asc'));
      }

      const q = query(this.clientsCollection, ...constraints);
      const snapshot = await getDocs(q);

      const clients: Client[] = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data() as Omit<Client, 'id'>
      }));

      // Aplicar filtro de búsqueda en memoria (para búsqueda global)
      let filteredClients = clients;
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filteredClients = clients.filter(client =>
          client.name.toLowerCase().includes(term) ||
          client.email?.toLowerCase().includes(term) ||
          client.phone?.includes(term) ||
          client.company?.toLowerCase().includes(term)
        );
      }

      this.clients.set(filteredClients);
      this.calculateStats(filteredClients);

    } catch (error) {
      console.error('❌ Error cargando clientes:', error);
      this.error.set('Error al cargar los clientes');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Obtener un cliente por ID
   */
  async getClientById(id: string): Promise<Client | null> {
    try {
      const docRef = doc(this.firestore, `clients/${id}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data() as Omit<Client, 'id'>
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Error obteniendo cliente ${id}:`, error);
      throw error;
    }
  }

  /**
   * Crear un nuevo cliente
   */
  async createClient(data: CreateClientData): Promise<Client> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const now = Timestamp.now();

      const clientData: Omit<Client, 'id'> = {
        ...data,
        customFields: data.customFields || {},
        isActive: true,
        status: data.status || 'active',
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid
      };

      const docRef = await addDoc(this.clientsCollection, clientData);

      const newClient: Client = {
        id: docRef.id,
        ...clientData
      };

      // Actualizar la lista local
      this.clients.update(clients => [...clients, newClient]);
      this.calculateStats(this.clients());

      return newClient;

    } catch (error) {
      console.error('❌ Error creando cliente:', error);
      this.error.set('Error al crear el cliente');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Actualizar un cliente existente
   */
  async updateClient(id: string, data: UpdateClientData): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const docRef = doc(this.firestore, `clients/${id}`);

      const updateData: Partial<Client> = {
        ...data,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.uid
      };

      await updateDoc(docRef, updateData);

      // Actualizar la lista local
      this.clients.update(clients =>
        clients.map(client =>
          client.id === id
            ? { ...client, ...updateData }
            : client
        )
      );

      this.calculateStats(this.clients());

    } catch (error) {
      console.error(`❌ Error actualizando cliente ${id}:`, error);
      this.error.set('Error al actualizar el cliente');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Eliminar un cliente
   */
  async deleteClient(id: string): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const docRef = doc(this.firestore, `clients/${id}`);
      await deleteDoc(docRef);

      // Actualizar la lista local
      this.clients.update(clients => clients.filter(client => client.id !== id));
      this.calculateStats(this.clients());

    } catch (error) {
      console.error(`❌ Error eliminando cliente ${id}:`, error);
      this.error.set('Error al eliminar el cliente');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Archivar/Desarchivar un cliente
   */
  async toggleClientStatus(id: string, isActive: boolean): Promise<void> {
    try {
      await this.updateClient(id, { isActive });
    } catch (error) {
      console.error(`❌ Error cambiando estado del cliente ${id}:`, error);
      throw error;
    }
  }

  /**
   * Asignar cliente a un usuario
   */
  async assignClient(clientId: string, userId: string): Promise<void> {
    try {
      await this.updateClient(clientId, { assignedTo: userId });
    } catch (error) {
      console.error(`❌ Error asignando cliente ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Actualizar campos personalizados de un cliente
   */
  async updateCustomFields(clientId: string, customFields: Record<string, any>): Promise<void> {
    try {
      const client = await this.getClientById(clientId);
      if (!client) {
        throw new Error('Cliente no encontrado');
      }

      const updatedFields = {
        ...client.customFields,
        ...customFields
      };

      await this.updateClient(clientId, { customFields: updatedFields });
    } catch (error) {
      console.error(`❌ Error actualizando campos personalizados del cliente ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Calcular estadísticas de clientes
   */
  private calculateStats(clients: Client[]): void {
    const stats: ClientStats = {
      total: clients.length,
      active: clients.filter(c => c.isActive && c.status === 'active').length,
      inactive: clients.filter(c => !c.isActive || c.status === 'inactive').length,
      potential: clients.filter(c => c.status === 'potential').length,
      archived: clients.filter(c => c.status === 'archived').length,
      byStatus: {}
    };

    // Contar por status
    clients.forEach(client => {
      const status = client.status || 'active';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    });

    this.stats.set(stats);
  }

  /**
   * Buscar clientes
   */
  async searchClients(searchTerm: string): Promise<Client[]> {
    const filters: ClientFilters = { searchTerm };
    await this.loadClients(filters);
    return this.clients();
  }

  /**
   * Obtener clientes por usuario asignado
   */
  async getClientsByUser(userId: string): Promise<Client[]> {
    const filters: ClientFilters = { assignedTo: userId };
    await this.loadClients(filters);
    return this.clients();
  }

  /**
   * Refrescar la lista de clientes
   */
  async refresh(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Limpiar el servicio
   */
  clear(): void {
    this.clients.set([]);
    this.stats.set({
      total: 0,
      active: 0,
      inactive: 0,
      potential: 0,
      archived: 0,
      byStatus: {}
    });
    this.isLoading.set(false);
    this.error.set(null);
    this.isInitialized = false;
  }
}
