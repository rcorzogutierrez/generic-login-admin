// src/app/modules/projects/models/proposal-config.interface.ts

import { Timestamp } from 'firebase/firestore';

/**
 * Mapeo de campos básicos del cliente
 * Permite configurar qué campos del cliente se usan para información básica
 */
export interface ProposalClientFieldsMapping {
  /**
   * Nombre del campo de nombre en el cliente
   * Ej: 'name', 'nombre', 'client_name'
   */
  name: string;

  /**
   * Nombre del campo de email en el cliente
   * Ej: 'email', 'correo', 'email_address'
   */
  email: string;

  /**
   * Nombre del campo de teléfono en el cliente
   * Ej: 'phone', 'telefono', 'phone_number'
   */
  phone: string;

  /**
   * Nombre del campo de compañía en el cliente
   * Ej: 'company', 'empresa', 'compania'
   */
  company: string;
}

/**
 * Mapeo de campos de dirección del cliente
 * Permite configurar qué campos del cliente se copian al estimado
 */
export interface ProposalAddressMapping {
  /**
   * Nombre del campo de dirección en el cliente
   * Ej: 'address', 'direccion', 'Address'
   */
  address: string;

  /**
   * Nombre del campo de ciudad en el cliente
   * Ej: 'city', 'ciudad', 'City'
   */
  city: string;

  /**
   * Nombre del campo de estado en el cliente
   * Ej: 'state', 'estado', 'Estado'
   */
  state: string;

  /**
   * Nombre del campo de código postal en el cliente
   * Ej: 'zipCode', 'codigo_postal', 'zip_code'
   */
  zipCode: string;
}

/**
 * Categoría de markup para materiales
 * Define un nivel de markup (ej: Oro, Plata, Bronce)
 */
export interface MaterialMarkupCategory {
  id: string;                  // ID único de la categoría
  name: string;                // Nombre de la categoría (ej: "Oro", "Plata")
  percentage: number;          // Porcentaje de markup (0-100)
  order: number;               // Orden de visualización
  isActive: boolean;           // Si está activa o no
}

/**
 * Configuración del sistema de markup de materiales
 */
export interface MaterialMarkupConfig {
  enabled: boolean;                           // Si el sistema está habilitado
  categories: MaterialMarkupCategory[];       // Lista de categorías disponibles
  defaultCategoryId?: string;                 // ID de la categoría por defecto
}

/**
 * Configuración del módulo de Proposals/Estimados
 */
export interface ProposalModuleConfig {
  // ID único de la configuración
  id: string;

  // Mapeo de campos básicos del cliente
  clientFieldsMapping: ProposalClientFieldsMapping;

  // Mapeo de campos de dirección del cliente
  clientAddressMapping: ProposalAddressMapping;

  // Configuración de valores por defecto
  defaultTaxPercentage?: number;        // Porcentaje de impuesto por defecto
  defaultValidityDays?: number;         // Días de validez por defecto
  defaultWorkType?: 'residential' | 'commercial';  // Tipo de trabajo por defecto
  defaultTerms?: string;                // Términos y condiciones por defecto

  // Configuración de markup de materiales
  materialMarkupConfig?: MaterialMarkupConfig;  // Sistema de categorías de markup

  // Metadata del sistema
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy?: string;
}

/**
 * Datos para crear una nueva configuración
 */
export interface CreateProposalConfigData {
  clientFieldsMapping: ProposalClientFieldsMapping;
  clientAddressMapping: ProposalAddressMapping;
  defaultTaxPercentage?: number;
  defaultValidityDays?: number;
  defaultWorkType?: 'residential' | 'commercial';
  defaultTerms?: string;
  materialMarkupConfig?: MaterialMarkupConfig;
}

/**
 * Datos para actualizar la configuración
 */
export interface UpdateProposalConfigData extends Partial<CreateProposalConfigData> {}

/**
 * Configuración por defecto del módulo
 */
export const DEFAULT_PROPOSAL_CONFIG: Omit<ProposalModuleConfig, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
  clientFieldsMapping: {
    name: 'name',
    email: 'email',
    phone: 'phone',
    company: 'company'
  },
  clientAddressMapping: {
    address: 'address',
    city: 'city',
    state: 'estado',           // Valor por defecto común en español
    zipCode: 'codigo_postal'   // Valor por defecto común en español
  },
  defaultTaxPercentage: 0,
  defaultValidityDays: 30,
  defaultWorkType: 'residential',
  defaultTerms: `Términos y Condiciones:

1. Forma de Pago: 50% al inicio de los trabajos y 50% al finalizar.

2. Los precios pueden variar según cambios en el alcance del proyecto o materiales adicionales solicitados.

3. Cualquier trabajo adicional no especificado en este estimado será cotizado por separado.

4. El cliente es responsable de obtener los permisos necesarios antes del inicio de los trabajos.

5. Este estimado es válido por el periodo especificado. Después de esta fecha, los precios están sujetos a cambios.

6. La empresa no se hace responsable por daños a estructuras ocultas o no visibles durante la inspección inicial.`,
  materialMarkupConfig: {
    enabled: false,
    categories: [
      {
        id: 'standard',
        name: 'Estándar',
        percentage: 15,
        order: 1,
        isActive: true
      },
      {
        id: 'premium',
        name: 'Premium',
        percentage: 25,
        order: 2,
        isActive: true
      }
    ],
    defaultCategoryId: 'standard'
  }
};
