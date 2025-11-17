// src/app/modules/projects/models/items/item.interface.ts

import { Timestamp } from 'firebase/firestore';

/**
 * Interface para un Item del catálogo
 * Items son plantillas/servicios predefinidos que se pueden reutilizar en múltiples proposals
 */
export interface CatalogItem {
  // ========== Campos del Sistema ==========
  id: string;                      // ID único del item
  createdAt: Timestamp;            // Fecha de creación
  updatedAt: Timestamp;            // Última actualización
  createdBy: string;               // UID del usuario que creó
  isActive: boolean;               // Estado activo/inactivo

  // ========== Información del Item ==========
  name: string;                    // Nombre/título del item
  description: string;             // Descripción detallada
  category?: string;               // Categoría (ej: "Plomería", "Electricidad", "Construcción")
  tags?: string[];                 // Tags para búsqueda

  // ========== Metadata ==========
  order?: number;                  // Orden para mostrar en listas
}

/**
 * Interface para crear un nuevo item del catálogo
 */
export interface CreateCatalogItemData {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  order?: number;
}

/**
 * Interface para actualizar un item del catálogo
 */
export interface UpdateCatalogItemData extends Partial<CreateCatalogItemData> {
  isActive?: boolean;
}

/**
 * Categorías predefinidas para items
 */
export const ITEM_CATEGORIES = [
  'Plomería',
  'Electricidad',
  'Construcción',
  'Piscinas',
  'Remodelación',
  'HVAC',
  'Pintura',
  'Acabados',
  'Otros'
] as const;

export type ItemCategory = typeof ITEM_CATEGORIES[number];
