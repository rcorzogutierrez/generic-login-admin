// src/app/modules/projects/services/proposal-config.service.ts

import { Injectable, inject, signal } from '@angular/core';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import {
  ProposalModuleConfig,
  ProposalFieldMapping,
  ProposalClientFieldsMapping,
  ProposalAddressMapping,
  CreateProposalConfigData,
  UpdateProposalConfigData,
  DEFAULT_PROPOSAL_CONFIG
} from '../models';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Servicio para gestionar la configuración del módulo de Proposals
 * Maneja el mapeo de campos del cliente y otras configuraciones
 */
@Injectable({
  providedIn: 'root'
})
export class ProposalConfigService {
  private firestore = getFirestore();
  private authService = inject(AuthService);

  // Collection reference
  private configCollection = collection(this.firestore, 'proposal_config');
  private readonly CONFIG_DOC_ID = 'default'; // Solo una configuración global

  // Signal para la configuración actual
  config = signal<ProposalModuleConfig | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  private isInitialized = false;

  /**
   * Inicializar el servicio - cargar configuración
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.loadConfig();
    this.isInitialized = true;
    console.log('✅ ProposalConfigService inicializado');
  }

  /**
   * Cargar la configuración desde Firestore
   * Si no existe, crea una configuración por defecto
   */
  async loadConfig(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const docRef = doc(this.firestore, `proposal_config/${this.CONFIG_DOC_ID}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const config: ProposalModuleConfig = {
          id: docSnap.id,
          ...docSnap.data() as Omit<ProposalModuleConfig, 'id'>
        };
        this.config.set(config);
        console.log('✅ Configuración de proposals cargada:', config);
      } else {
        // No existe configuración, crear una por defecto
        console.log('⚠️ No existe configuración, creando configuración por defecto');
        await this.createDefaultConfig();
      }
    } catch (error) {
      console.error('❌ Error cargando configuración de proposals:', error);
      this.error.set('Error al cargar la configuración');
      // En caso de error, usar configuración por defecto en memoria
      this.setDefaultConfigInMemory();
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Crear configuración por defecto en Firestore
   */
  private async createDefaultConfig(): Promise<void> {
    const currentUser = this.authService.authorizedUser();
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    const now = Timestamp.now();
    const configData: ProposalModuleConfig = {
      id: this.CONFIG_DOC_ID,
      ...DEFAULT_PROPOSAL_CONFIG,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser.uid
    };

    const docRef = doc(this.firestore, `proposal_config/${this.CONFIG_DOC_ID}`);
    await setDoc(docRef, configData);

    this.config.set(configData);
    console.log('✅ Configuración por defecto creada:', configData);
  }

  /**
   * Establecer configuración por defecto solo en memoria (fallback)
   */
  private setDefaultConfigInMemory(): void {
    const now = Timestamp.now();
    const configData: ProposalModuleConfig = {
      id: this.CONFIG_DOC_ID,
      ...DEFAULT_PROPOSAL_CONFIG,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system'
    };
    this.config.set(configData);
    console.log('⚠️ Usando configuración por defecto en memoria (sin guardar en Firestore)');
  }

  /**
   * Actualizar la configuración
   */
  async updateConfig(data: UpdateProposalConfigData): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const docRef = doc(this.firestore, `proposal_config/${this.CONFIG_DOC_ID}`);

      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.uid
      };

      await updateDoc(docRef, updateData);

      // Actualizar el signal local
      const currentConfig = this.config();
      if (currentConfig) {
        this.config.set({
          ...currentConfig,
          ...updateData
        } as ProposalModuleConfig);
      }

      console.log('✅ Configuración actualizada:', updateData);
    } catch (error) {
      console.error('❌ Error actualizando configuración:', error);
      this.error.set('Error al actualizar la configuración');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * @deprecated - Usar getFieldMappings() en su lugar
   * Obtener el mapeo de campos básicos del cliente
   * Convierte desde el nuevo formato fieldMappings al formato legacy
   */
  getClientFieldsMapping(): ProposalClientFieldsMapping {
    const config = this.config();

    // Si hay configuración legacy, usarla
    if (config?.clientFieldsMapping) {
      return config.clientFieldsMapping;
    }

    // Convertir desde fieldMappings al formato legacy
    const mappings = this.getFieldMappings();
    return {
      name: mappings.find(m => m.targetField === 'name')?.sourceField || 'name',
      email: mappings.find(m => m.targetField === 'email')?.sourceField || 'email',
      phone: mappings.find(m => m.targetField === 'phone')?.sourceField || 'phone',
      company: mappings.find(m => m.targetField === 'company')?.sourceField || 'company'
    };
  }

  /**
   * @deprecated - Usar updateFieldMappings() en su lugar
   * Actualizar solo el mapeo de campos básicos del cliente
   */
  async updateClientFieldsMapping(mapping: ProposalClientFieldsMapping): Promise<void> {
    // Convertir el formato legacy a fieldMappings
    const currentMappings = this.getFieldMappings();
    const updatedMappings = currentMappings.map(m => {
      if (m.targetField === 'name') return { ...m, sourceField: mapping.name };
      if (m.targetField === 'email') return { ...m, sourceField: mapping.email };
      if (m.targetField === 'phone') return { ...m, sourceField: mapping.phone };
      if (m.targetField === 'company') return { ...m, sourceField: mapping.company };
      return m;
    });

    await this.updateFieldMappings(updatedMappings);
  }

  /**
   * @deprecated - Usar getFieldMappings() en su lugar
   * Obtener el mapeo de campos de dirección del cliente
   * Convierte desde el nuevo formato fieldMappings al formato legacy
   */
  getAddressMapping(): ProposalAddressMapping {
    const config = this.config();

    // Si hay configuración legacy, usarla
    if (config?.clientAddressMapping) {
      return config.clientAddressMapping;
    }

    // Convertir desde fieldMappings al formato legacy
    const mappings = this.getFieldMappings();
    return {
      address: mappings.find(m => m.targetField === 'address')?.sourceField || 'address',
      city: mappings.find(m => m.targetField === 'city')?.sourceField || 'city',
      state: mappings.find(m => m.targetField === 'state')?.sourceField || 'estado',
      zipCode: mappings.find(m => m.targetField === 'zipCode')?.sourceField || 'codigo_postal'
    };
  }

  /**
   * @deprecated - Usar updateFieldMappings() en su lugar
   * Actualizar solo el mapeo de campos de dirección
   */
  async updateAddressMapping(mapping: ProposalAddressMapping): Promise<void> {
    // Convertir el formato legacy a fieldMappings
    const currentMappings = this.getFieldMappings();
    const updatedMappings = currentMappings.map(m => {
      if (m.targetField === 'address') return { ...m, sourceField: mapping.address };
      if (m.targetField === 'city') return { ...m, sourceField: mapping.city };
      if (m.targetField === 'state') return { ...m, sourceField: mapping.state };
      if (m.targetField === 'zipCode') return { ...m, sourceField: mapping.zipCode };
      return m;
    });

    await this.updateFieldMappings(updatedMappings);
  }

  /**
   * Obtener porcentaje de impuesto por defecto
   */
  getDefaultTaxPercentage(): number {
    const config = this.config();
    return config?.defaultTaxPercentage ?? DEFAULT_PROPOSAL_CONFIG.defaultTaxPercentage ?? 0;
  }

  /**
   * Obtener días de validez por defecto
   */
  getDefaultValidityDays(): number {
    const config = this.config();
    return config?.defaultValidityDays ?? DEFAULT_PROPOSAL_CONFIG.defaultValidityDays ?? 30;
  }

  /**
   * Obtener tipo de trabajo por defecto
   */
  getDefaultWorkType(): 'residential' | 'commercial' {
    const config = this.config();
    return config?.defaultWorkType ?? DEFAULT_PROPOSAL_CONFIG.defaultWorkType ?? 'residential';
  }

  /**
   * Obtener términos y condiciones por defecto
   */
  getDefaultTerms(): string {
    const config = this.config();
    return config?.defaultTerms ?? DEFAULT_PROPOSAL_CONFIG.defaultTerms ?? '';
  }

  /**
   * Refrescar la configuración desde Firestore
   */
  async refresh(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
  }

  // ========== NUEVOS MÉTODOS PARA MAPEOS DINÁMICOS ==========

  /**
   * Obtener todos los mapeos de campos configurados
   */
  getFieldMappings(): ProposalFieldMapping[] {
    const config = this.config();
    if (!config || !config.fieldMappings) {
      return DEFAULT_PROPOSAL_CONFIG.fieldMappings;
    }
    return config.fieldMappings;
  }

  /**
   * Actualizar los mapeos de campos
   */
  async updateFieldMappings(mappings: ProposalFieldMapping[]): Promise<void> {
    await this.updateConfig({
      fieldMappings: mappings
    });
  }

  /**
   * Obtener un mapeo específico por campo destino
   */
  getMappingByTargetField(targetField: string): ProposalFieldMapping | undefined {
    const mappings = this.getFieldMappings();
    return mappings.find(m => m.targetField === targetField);
  }

  /**
   * Obtener el sourceField para un targetField específico
   * Útil para mantener compatibilidad con código legacy
   */
  getSourceFieldFor(targetField: 'name' | 'email' | 'phone' | 'company' | 'address' | 'city' | 'state' | 'zipCode'): string {
    const mapping = this.getMappingByTargetField(targetField);
    return mapping?.sourceField || targetField; // Fallback al mismo nombre si no hay mapeo
  }

  /**
   * Limpiar el servicio
   */
  clear(): void {
    this.config.set(null);
    this.isLoading.set(false);
    this.error.set(null);
    this.isInitialized = false;
  }
}
