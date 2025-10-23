// src/app/modules/clients/models/client.interface.ts

import { Timestamp } from '@angular/fire/firestore';

/**
 * Interface del Cliente
 */
export interface Client {
  // ========== Campos del Sistema (No editables) ==========
  id: string;                      // ID único del cliente
  createdAt: Timestamp;            // Fecha de creación
  updatedAt: Timestamp;            // Última actualización
  createdBy: string;               // UID del usuario que creó
  updatedBy?: string;              // UID del último usuario que editó
  isActive: boolean;               // Estado activo/inactivo

  // ========== Campos Por Defecto (Configurables) ==========
  name: string;                    // Nombre (REQUERIDO)
  email?: string;                  // Correo electrónico
  phone?: string;                  // Teléfono
  company?: string;                // Empresa
  address?: string;                // Dirección
  city?: string;                   // Ciudad
  country?: string;                // País
  notes?: string;                  // Notas

  // ========== Campos Personalizados Dinámicos ==========
  /**
   * Objeto clave-valor para campos personalizados
   * Ejemplo:
   * {
   *   'customer_type': 'VIP',
   *   'registration_date': '2024-01-15',
   *   'budget': 50000,
   *   'preferred_contact': 'email'
   * }
   */
  customFields: Record<string, any>;

  // ========== Metadata Adicional (Opcional) ==========
  tags?: string[];                 // Tags/etiquetas
  assignedTo?: string;             // UID del usuario asignado
  lastContactDate?: Timestamp;     // Última fecha de contacto
  totalPurchases?: number;         // Total de compras (si aplica)
  status?: 'active' | 'inactive' | 'potential' | 'archived';  // Estado del cliente
}

/**
 * Interface para crear un nuevo cliente (sin campos del sistema)
 */
export interface CreateClientData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
  customFields?: Record<string, any>;
  tags?: string[];
  assignedTo?: string;
  status?: 'active' | 'inactive' | 'potential' | 'archived';
}

/**
 * Interface para actualizar un cliente
 */
export interface UpdateClientData extends Partial<CreateClientData> {
  isActive?: boolean;
}

/**
 * Interface para filtros de búsqueda
 */
export interface ClientFilters {
  searchTerm?: string;             // Búsqueda global
  isActive?: boolean;              // Filtrar por estado
  assignedTo?: string;             // Filtrar por usuario asignado
  status?: string;                 // Filtrar por status
  customFieldFilters?: Record<string, any>;  // Filtros por campos personalizados
}

/**
 * Interface para ordenamiento
 */
export interface ClientSort {
  field: string;                   // Campo por el que ordenar
  direction: 'asc' | 'desc';       // Dirección del ordenamiento
}

/**
 * Estadísticas de clientes
 */
export interface ClientStats {
  total: number;
  active: number;
  inactive: number;
  potential: number;
  archived: number;
  byStatus: Record<string, number>;
}
