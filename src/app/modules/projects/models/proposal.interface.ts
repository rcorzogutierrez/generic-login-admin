// src/app/modules/projects/models/proposal.interface.ts

import { Timestamp } from 'firebase/firestore';

/**
 * Interface para un item del proposal (incluidos o extras)
 */
export interface ProposalItem {
  id: string;                          // ID único del item
  description: string;                 // Descripción del trabajo/material
  type: 'labor' | 'material' | 'both'; // Tipo de item
  materialId?: string;                 // ID del material (si aplica, del módulo materials)
  quantity?: number;                   // Cantidad
  unit?: string;                       // Unidad (sqft, pcs, hrs, etc.)
  unitPrice?: number;                  // Precio unitario
  totalPrice?: number;                 // Precio total (quantity * unitPrice)
  notes?: string;                      // Notas adicionales
  order: number;                       // Orden de visualización
}

/**
 * Interface para material usado en la factura
 */
export interface MaterialUsed {
  id: string;                          // ID único
  material: string;                    // Nombre del material
  amount: number;                      // Cantidad usada
  price: number;                       // Precio del material
}

/**
 * Información de trabajador
 */
export interface Worker {
  id: string;                          // ID único
  name: string;                        // Nombre del trabajador
  role?: string;                       // Rol (opcional: carpintero, plomero, etc.)
}

/**
 * Tipo de trabajo
 */
export type WorkType = 'residential' | 'commercial';

/**
 * Clasificación del servicio/trabajo a realizar
 */
export type JobCategory =
  | 'remodeling'         // Remodelación
  | 'plumbing'           // Plomería
  | 'services'           // Servicios
  | 'equipment'          // Instalación de equipos
  | 'new_construction';  // Nueva Construcción

/**
 * Estado del proposal
 */
export type ProposalStatus =
  | 'draft'                // Borrador
  | 'sent'                 // Enviado al cliente
  | 'approved'             // Aprobado por el cliente
  | 'rejected'             // Rechazado por el cliente
  | 'converted_to_invoice' // Convertido a factura
  | 'paid'                 // Pagado (solo después de facturado)
  | 'cancelled';           // Cancelado

/**
 * Interface del Proposal/Estimado
 */
export interface Proposal {
  // ========== Campos del Sistema (No editables) ==========
  id: string;                      // ID único del proposal
  createdAt: Timestamp;            // Fecha de creación
  updatedAt: Timestamp;            // Última actualización
  createdBy: string;               // UID del usuario que creó
  updatedBy?: string;              // UID del último usuario que editó
  isActive: boolean;               // Estado activo/inactivo

  // ========== Campos de Cabecera ==========
  proposalNumber: string;          // Número del estimado (auto-generado)
  language: 'es' | 'en';           // Idioma del documento (español o inglés)
  ownerId: string;                 // ID del cliente (del módulo clients)
  ownerName: string;               // Nombre del cliente
  ownerEmail?: string;             // Email del cliente (copiado)
  ownerPhone?: string;             // Teléfono del cliente (copiado)

  // Ubicación del trabajo
  address: string;                 // Dirección donde se hará el trabajo
  city: string;                    // Ciudad
  state?: string;                  // Estado
  zipCode?: string;                // Código postal
  workType: WorkType;              // Tipo de trabajo: Residencial o Comercial
  jobCategory?: JobCategory;       // Clasificación del servicio a realizar

  // Fechas importantes
  date: Timestamp;                 // Fecha del estimado
  validUntil?: Timestamp;          // Válido hasta
  approvedDate?: Timestamp;        // Fecha de aprobación
  sentDate?: Timestamp;            // Fecha de envío

  // ========== Estado y Tracking ==========
  status: ProposalStatus;          // Estado del proposal

  // ========== Items del Proposal ==========
  includes: ProposalItem[];        // Items incluidos en el trabajo
  extras: ProposalItem[];          // Items no incluidos (extras)

  // ========== Totales y Precios ==========
  subtotal?: number;               // Subtotal de items incluidos
  tax?: number;                    // Impuestos
  taxPercentage?: number;          // Porcentaje de impuestos
  discount?: number;               // Descuento
  discountPercentage?: number;     // Porcentaje de descuento
  total: number;                   // Total final

  // ========== Información Adicional ==========
  notes?: string;                  // Notas generales
  internalNotes?: string;          // Notas internas (no se muestran al cliente)
  terms?: string;                  // Términos y condiciones

  // ========== Metadata ==========
  projectId?: string;              // ID del proyecto (si se crea uno)
  invoiceId?: string;              // ID de la factura (si se convierte)
  assignedTo?: string;             // UID del usuario asignado
  tags?: string[];                 // Tags/etiquetas
  attachments?: string[];          // URLs de archivos adjuntos

  // ========== Datos de Factura (solo cuando status === 'converted_to_invoice') ==========
  invoiceDate?: Timestamp;         // Fecha de emisión de la factura
  materialsUsed?: MaterialUsed[];  // Materiales usados en el trabajo
  workStartDate?: Timestamp;       // Fecha de inicio del trabajo
  workEndDate?: Timestamp;         // Fecha de finalización del trabajo
  workTime?: number;               // Tiempo de trabajo (en horas)
  workers?: Worker[];              // Trabajadores que participaron

  // ========== Markup de Materiales ==========
  materialMarkupCategoryId?: string;    // ID de la categoría de markup seleccionada
  materialMarkupCategoryName?: string;  // Nombre de la categoría (para histórico)
  materialMarkupPercentage?: number;    // Porcentaje de markup aplicado (para histórico)
}

/**
 * Interface para crear un nuevo proposal (sin campos del sistema)
 */
export interface CreateProposalData {
  language?: 'es' | 'en';
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  address: string;
  city: string;
  state?: string;
  zipCode?: string;
  workType: WorkType;
  jobCategory?: JobCategory;
  date: Timestamp;
  validUntil?: Timestamp;
  includes?: ProposalItem[];
  extras?: ProposalItem[];
  subtotal?: number;
  tax?: number;
  taxPercentage?: number;
  discount?: number;
  discountPercentage?: number;
  total: number;
  notes?: string;
  internalNotes?: string;
  terms?: string;
  assignedTo?: string;
  tags?: string[];
  status?: ProposalStatus;
}

/**
 * Interface para actualizar un proposal
 */
export interface UpdateProposalData extends Partial<CreateProposalData> {
  isActive?: boolean;
  status?: ProposalStatus;
  approvedDate?: Timestamp;
  sentDate?: Timestamp;
  projectId?: string;
  invoiceId?: string;
  // Campos adicionales de factura
  invoiceDate?: Timestamp;
  materialsUsed?: MaterialUsed[];
  workStartDate?: Timestamp;
  workEndDate?: Timestamp;
  workTime?: number;
  workers?: Worker[];
  // Campos de markup de materiales
  materialMarkupCategoryId?: string;
  materialMarkupCategoryName?: string;
  materialMarkupPercentage?: number;
}

/**
 * Interface para filtros de búsqueda de proposals
 */
export interface ProposalFilters {
  searchTerm?: string;             // Búsqueda global
  isActive?: boolean;              // Filtrar por estado
  status?: ProposalStatus;         // Filtrar por status
  ownerId?: string;                // Filtrar por cliente
  assignedTo?: string;             // Filtrar por usuario asignado
  dateFrom?: Timestamp;            // Fecha desde
  dateTo?: Timestamp;              // Fecha hasta
  minTotal?: number;               // Total mínimo
  maxTotal?: number;               // Total máximo
}

/**
 * Interface para ordenamiento de proposals
 */
export interface ProposalSort {
  field: string;                   // Campo por el que ordenar
  direction: 'asc' | 'desc';       // Dirección del ordenamiento
}

/**
 * Estadísticas de proposals
 */
export interface ProposalStats {
  total: number;
  byStatus: Record<ProposalStatus, number>;
  totalValue: number;              // Valor total de todos los proposals
  averageValue: number;            // Valor promedio
  approvalRate: number;            // Tasa de aprobación (%)
}

/**
 * Interface para crear un item de proposal
 */
export interface CreateProposalItemData {
  description: string;
  type: 'labor' | 'material' | 'both';
  materialId?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  notes?: string;
}

