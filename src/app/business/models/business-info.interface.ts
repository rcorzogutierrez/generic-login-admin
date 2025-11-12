// src/app/business/models/business-info.interface.ts

/**
 * Dirección de la empresa
 */
export interface BusinessAddress {
  street: string;       // Calle y número
  city: string;         // Ciudad
  state: string;        // Estado/Provincia
  zipCode: string;      // Código postal
  country: string;      // País
}

/**
 * Redes sociales de la empresa
 */
export interface BusinessSocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
}

/**
 * Información completa de la empresa
 *
 * Esta interfaz representa todos los datos relacionados con la empresa
 * que usa la aplicación, incluyendo identificación, contacto, dirección,
 * branding y redes sociales.
 *
 * @example
 * ```typescript
 * const businessInfo: BusinessInfo = {
 *   id: 'main',
 *   businessName: 'Mi Empresa S.A.',
 *   legalName: 'Mi Empresa Sociedad Anónima',
 *   taxId: 'J-12345678-9',
 *   email: 'contacto@miempresa.com',
 *   phone: '+58 212 1234567',
 *   address: {
 *     street: 'Av. Principal, Edif. Torre, Piso 5',
 *     city: 'Caracas',
 *     state: 'Distrito Capital',
 *     zipCode: '1050',
 *     country: 'Venezuela'
 *   },
 *   logoUrl: 'https://example.com/logo.png',
 *   isActive: true,
 *   createdAt: Timestamp.now(),
 *   updatedAt: Timestamp.now(),
 *   createdBy: 'user123'
 * };
 * ```
 */
export interface BusinessInfo {
  // ============================================
  // IDENTIFICACIÓN
  // ============================================

  /**
   * ID del documento en Firestore (generalmente 'main' o 'default')
   */
  id: string;

  /**
   * Nombre comercial de la empresa
   * @example "Corporación XYZ"
   */
  businessName: string;

  /**
   * Razón social / Nombre legal
   * @example "Corporación XYZ C.A."
   */
  legalName: string;

  /**
   * RIF / Tax ID / NIT / Número de identificación fiscal
   * @example "J-12345678-9"
   */
  taxId: string;

  // ============================================
  // CONTACTO
  // ============================================

  /**
   * Email principal de contacto
   * @example "contacto@empresa.com"
   */
  email: string;

  /**
   * Teléfono fijo principal
   * @example "+58 212 1234567"
   */
  phone: string;

  /**
   * Teléfono móvil (opcional)
   * @example "+58 414 1234567"
   */
  mobilePhone?: string;

  /**
   * Sitio web de la empresa (opcional)
   * @example "https://www.empresa.com"
   */
  website?: string;

  // ============================================
  // DIRECCIÓN
  // ============================================

  /**
   * Dirección física completa de la empresa
   */
  address: BusinessAddress;

  // ============================================
  // BRANDING
  // ============================================

  /**
   * URL del logo de la empresa
   * Puede ser una URL de Firebase Storage o externa
   * @example "https://firebasestorage.googleapis.com/..."
   */
  logoUrl: string;

  /**
   * Color corporativo principal (formato hex)
   * @example "#3b82f6"
   */
  primaryColor?: string;

  /**
   * Color corporativo secundario (formato hex)
   * @example "#8b5cf6"
   */
  secondaryColor?: string;

  // ============================================
  // INFORMACIÓN ADICIONAL
  // ============================================

  /**
   * Descripción breve de la empresa
   * @example "Empresa líder en soluciones tecnológicas"
   */
  description?: string;

  /**
   * Enlaces a redes sociales
   */
  socialMedia?: BusinessSocialMedia;

  // ============================================
  // METADATA
  // ============================================

  /**
   * Fecha de creación del registro (Firestore Timestamp)
   */
  createdAt: any;

  /**
   * Fecha de última actualización (Firestore Timestamp)
   */
  updatedAt: any;

  /**
   * UID del usuario que creó el registro
   */
  createdBy: string;

  /**
   * Estado activo/inactivo
   */
  isActive: boolean;
}

/**
 * Datos del formulario para crear/actualizar información de empresa
 * (sin metadata que se genera automáticamente)
 */
export interface BusinessInfoFormData {
  businessName: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  mobilePhone?: string;
  website?: string;
  address: BusinessAddress;
  logoUrl: string;
  primaryColor?: string;
  secondaryColor?: string;
  description?: string;
  socialMedia?: BusinessSocialMedia;
}
