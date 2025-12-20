// src/app/admin/services/modules.service.ts
import { Injectable, signal } from '@angular/core';
import {
  getFirestore,
  collection,
  doc,
  query,
  orderBy,
  where,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import {
  getDocsWithLogging as getDocs,
  getDocWithLogging as getDoc,
  addDocWithLogging as addDoc,
  updateDocWithLogging as updateDoc,
  deleteDocWithLogging as deleteDoc
} from '../../shared/utils/firebase-logger.utils';
import { SystemModule, ModuleFormData } from '../models/system-module.interface';
import { logAuditAction } from '../../shared/utils/audit-logger.utils';

export interface ModuleOperationResult {
  success: boolean;
  message: string;
  moduleId?: string;
  error?: any;
}

/**
 * Servicio de Gestión de Módulos del Sistema - Optimizado con Angular 20 Signals
 *
 * Administra los módulos disponibles en el sistema (Clientes, Workers, Materials, etc.).
 * Permite crear, actualizar, eliminar y reordenar módulos dinámicamente.
 *
 * @example
 * ```typescript
 * // Crear nuevo módulo
 * const result = await modulesService.createModule({
 *   value: 'products',
 *   label: 'Productos',
 *   description: 'Gestión de productos',
 *   icon: 'inventory',
 *   route: '/modules/products',
 *   isActive: true
 * }, currentUserUid);
 *
 * // Obtener módulos activos
 * const activeModules = modulesService.getActiveModules();
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ModulesService {
  private db = getFirestore();
  private readonly MODULES_COLLECTION = 'system_modules';
  private isInitialized = false; // ✅ Control de inicialización

  // ✅ MODERNIZADO: Solo signal, eliminado BehaviorSubject redundante
  private _modules = signal<SystemModule[]>([]);
  readonly modules = this._modules.asReadonly();

  constructor() {}

  /**
   * ✅ NUEVO: Inicializa la carga de módulos solo cuando se necesita
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.loadModules();
    this.isInitialized = true;
  }

  /**
   * Carga todos los módulos del sistema
   */
  async loadModules(): Promise<SystemModule[]> {
    try {
      const modulesRef = collection(this.db, this.MODULES_COLLECTION);
      const q = query(modulesRef, orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);

      const modules: SystemModule[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        modules.push({
          id: doc.id,
          value: data['value'] || '',
          label: data['label'] || '',
          description: data['description'] || '',
          icon: data['icon'] || 'extension',
          route: data['route'] || '',
          isActive: data['isActive'] ?? true,
          order: data['order'] || 0,
          createdAt: data['createdAt']?.toDate() || new Date(),
          createdBy: data['createdBy'] || '',
          updatedAt: data['updatedAt']?.toDate() || new Date(),
          updatedBy: data['updatedBy'] || '',
          usersCount: data['usersCount'] || 0
        });
      });

      this._modules.set(modules);

      return modules;
    } catch (error) {
      console.error('❌ Error cargando módulos:', error);
      throw error;
    }
  }

  /**
   * Obtiene un módulo por ID
   */
  async getModuleById(id: string): Promise<SystemModule | null> {
    try {
      const moduleRef = doc(this.db, this.MODULES_COLLECTION, id);
      const moduleSnap = await getDoc(moduleRef);

      if (!moduleSnap.exists()) {
        return null;
      }

      const data = moduleSnap.data();
      return {
        id: moduleSnap.id,
        value: data['value'],
        label: data['label'],
        description: data['description'],
        icon: data['icon'],
        route: data['route'],
        isActive: data['isActive'],
        order: data['order'],
        createdAt: data['createdAt']?.toDate(),
        createdBy: data['createdBy'],
        updatedAt: data['updatedAt']?.toDate(),
        updatedBy: data['updatedBy'],
        usersCount: data['usersCount']
      };
    } catch (error) {
      console.error('❌ Error obteniendo módulo:', error);
      return null;
    }
  }

  /**
   * Crea un nuevo módulo
   */
  async createModule(
    moduleData: ModuleFormData,
    currentUserUid: string
  ): Promise<ModuleOperationResult> {
    try {
      // Validar datos
      const validation = this.validateModuleData(moduleData);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Datos inválidos: ${validation.errors.join(', ')}`
        };
      }

      // Verificar que el value sea único
      const existingModules = this._modules();
      const valueExists = existingModules.some(
        m => m.value.toLowerCase() === moduleData.value.toLowerCase()
      );

      if (valueExists) {
        return {
          success: false,
          message: 'Ya existe un módulo con este identificador'
        };
      }

      // Calcular orden automático
      const maxOrder = Math.max(...existingModules.map(m => m.order), 0);

      // Crear documento
      const now = Timestamp.now();
      const moduleDoc = {
        value: moduleData.value.toLowerCase().trim(),
        label: moduleData.label.trim(),
        description: moduleData.description.trim(),
        icon: moduleData.icon.trim(),
        route: moduleData.route?.trim() || '',
        isActive: moduleData.isActive,
        order: maxOrder + 1,
        createdAt: now,
        createdBy: currentUserUid,
        updatedAt: now,
        updatedBy: currentUserUid,
        usersCount: 0
      };

      const modulesRef = collection(this.db, this.MODULES_COLLECTION);
      const docRef = await addDoc(modulesRef, moduleDoc);

      // ✅ OPTIMIZADO: Actualizar signal localmente
      const newModule: SystemModule = {
        id: docRef.id,
        value: moduleDoc.value,
        label: moduleDoc.label,
        description: moduleDoc.description,
        icon: moduleDoc.icon,
        route: moduleDoc.route,
        isActive: moduleDoc.isActive,
        order: moduleDoc.order,
        createdAt: moduleDoc.createdAt.toDate(),
        createdBy: moduleDoc.createdBy,
        updatedAt: moduleDoc.updatedAt.toDate(),
        updatedBy: moduleDoc.updatedBy,
        usersCount: moduleDoc.usersCount
      };

      this._modules.update(modules => [...modules, newModule].sort((a, b) => a.order - b.order));

      // Log de auditoría
      await this.logModuleAction('create_module', docRef.id, {
        moduleValue: moduleData.value,
        moduleLabel: moduleData.label
      }, currentUserUid);

      return {
        success: true,
        message: `Módulo "${moduleData.label}" creado exitosamente`,
        moduleId: docRef.id
      };
    } catch (error: any) {
      console.error('❌ Error creando módulo:', error);
      return {
        success: false,
        message: error.message || 'Error al crear el módulo',
        error
      };
    }
  }

  /**
   * Actualiza un módulo existente
   */
  async updateModule(
    moduleId: string,
    moduleData: Partial<ModuleFormData>,
    currentUserUid: string
  ): Promise<ModuleOperationResult> {
    try {
      const moduleRef = doc(this.db, this.MODULES_COLLECTION, moduleId);
      const moduleSnap = await getDoc(moduleRef);

      if (!moduleSnap.exists()) {
        return {
          success: false,
          message: 'Módulo no encontrado'
        };
      }

      // Si se actualiza el value, verificar que sea único
      if (moduleData.value) {
        const existingModules = this._modules();
        const valueExists = existingModules.some(
          m => m.value.toLowerCase() === moduleData.value!.toLowerCase() && m.id !== moduleId
        );

        if (valueExists) {
          return {
            success: false,
            message: 'Ya existe un módulo con este identificador'
          };
        }
      }

      const updateData: any = {
        updatedAt: Timestamp.now(),
        updatedBy: currentUserUid
      };

      if (moduleData.value) updateData.value = moduleData.value.toLowerCase().trim();
      if (moduleData.label) updateData.label = moduleData.label.trim();
      if (moduleData.description !== undefined) updateData.description = moduleData.description.trim();
      if (moduleData.icon) updateData.icon = moduleData.icon.trim();
      if (moduleData.route !== undefined) updateData.route = moduleData.route.trim();
      if (moduleData.isActive !== undefined) updateData.isActive = moduleData.isActive;

      await updateDoc(moduleRef, updateData);

      // ✅ OPTIMIZADO: Actualizar signal localmente
      this._modules.update(modules =>
        modules.map(m => {
          if (m.id === moduleId) {
            return {
              ...m,
              value: updateData.value || m.value,
              label: updateData.label || m.label,
              description: updateData.description !== undefined ? updateData.description : m.description,
              icon: updateData.icon || m.icon,
              route: updateData.route !== undefined ? updateData.route : m.route,
              isActive: updateData.isActive !== undefined ? updateData.isActive : m.isActive,
              updatedAt: new Date(),
              updatedBy: currentUserUid
            };
          }
          return m;
        })
      );

      // Log de auditoría
      await this.logModuleAction('update_module', moduleId, {
        updatedFields: Object.keys(updateData)
      }, currentUserUid);

      return {
        success: true,
        message: 'Módulo actualizado exitosamente',
        moduleId
      };
    } catch (error: any) {
      console.error('❌ Error actualizando módulo:', error);
      return {
        success: false,
        message: error.message || 'Error al actualizar el módulo',
        error
      };
    }
  }

  /**
   * ✅ ACTUALIZADO: Elimina un módulo (soft delete o hard delete)
   * Ahora permite hard delete sin validaciones restrictivas
   */
  async deleteModule(
    moduleId: string,
    currentUserUid: string,
    hardDelete: boolean = false
  ): Promise<ModuleOperationResult> {
    try {
      const moduleRef = doc(this.db, this.MODULES_COLLECTION, moduleId);
      const moduleSnap = await getDoc(moduleRef);

      if (!moduleSnap.exists()) {
        return {
          success: false,
          message: 'Módulo no encontrado'
        };
      }

      const moduleData = moduleSnap.data();
      const moduleValue = moduleData['value'];

      if (hardDelete) {
        // ✅ ELIMINACIÓN PERMANENTE (sin restricciones previas)
        
        // 1. Eliminar el módulo de Firestore
        await deleteDoc(moduleRef);
        
        // 2. Remover el módulo de TODOS los usuarios que lo tengan asignado
        const usersRef = collection(this.db, 'authorized_users');
        const usersQuery = query(usersRef, where('modules', 'array-contains', moduleValue));
        const usersSnapshot = await getDocs(usersQuery);

        if (!usersSnapshot.empty) {
          const batch = writeBatch(this.db);
          
          usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            const currentModules = userData['modules'] || [];
            const updatedModules = currentModules.filter((m: string) => m !== moduleValue);
            
            batch.update(userDoc.ref, { modules: updatedModules });
          });

          await batch.commit();
          
        }

        // ✅ OPTIMIZADO: Actualizar signal localmente (eliminación permanente)
        this._modules.update(modules => modules.filter(m => m.id !== moduleId));

        await this.logModuleAction('delete_module_permanent', moduleId, {
          moduleValue: moduleValue,
          moduleLabel: moduleData['label'],
          usersAffected: usersSnapshot.size
        }, currentUserUid);

        return {
          success: true,
          message: `Módulo eliminado permanentemente${usersSnapshot.size > 0 ? ` y removido de ${usersSnapshot.size} usuario(s)` : ''}`
        };
      } else {
        // ✅ SOFT DELETE (solo desactivar)
        await updateDoc(moduleRef, {
          isActive: false,
          updatedAt: Timestamp.now(),
          updatedBy: currentUserUid
        });

        // ✅ OPTIMIZADO: Actualizar signal localmente (soft delete)
        this._modules.update(modules =>
          modules.map(m => {
            if (m.id === moduleId) {
              return { ...m, isActive: false, updatedAt: new Date(), updatedBy: currentUserUid };
            }
            return m;
          })
        );

        await this.logModuleAction('deactivate_module', moduleId, {
          moduleValue: moduleValue
        }, currentUserUid);

        return {
          success: true,
          message: 'Módulo desactivado exitosamente'
        };
      }
    } catch (error: any) {
      console.error('❌ Error eliminando módulo:', error);
      return {
        success: false,
        message: error.message || 'Error al eliminar el módulo',
        error
      };
    }
  }

  /**
   * Cambia el orden de los módulos
   */
  async reorderModules(
    moduleIds: string[],
    currentUserUid: string
  ): Promise<ModuleOperationResult> {
    try {
      const batch = writeBatch(this.db);

      moduleIds.forEach((moduleId, index) => {
        const moduleRef = doc(this.db, this.MODULES_COLLECTION, moduleId);
        batch.update(moduleRef, {
          order: index,
          updatedAt: Timestamp.now(),
          updatedBy: currentUserUid
        });
      });

      await batch.commit();

      // ✅ OPTIMIZADO: Actualizar signal localmente (reordenar)
      this._modules.update(modules => {
        const reordered = modules.map(m => {
          const newIndex = moduleIds.indexOf(m.id);
          if (newIndex !== -1) {
            return { ...m, order: newIndex, updatedAt: new Date(), updatedBy: currentUserUid };
          }
          return m;
        });
        return reordered.sort((a, b) => a.order - b.order);
      });

      await this.logModuleAction('reorder_modules', '', {
        newOrder: moduleIds
      }, currentUserUid);

      return {
        success: true,
        message: 'Orden de módulos actualizado'
      };
    } catch (error: any) {
      console.error('❌ Error reordenando módulos:', error);
      return {
        success: false,
        message: error.message || 'Error al reordenar módulos',
        error
      };
    }
  }

  /**
   * ✅ NUEVO: Actualiza el contador de usuarios para todos los módulos
   */
  async updateAllModulesUserCount(): Promise<void> {
    try {
      const modules = this._modules();
      const usersRef = collection(this.db, 'authorized_users');
      const usersSnapshot = await getDocs(usersRef);

      // Contar usuarios por módulo
      const moduleCounts: { [key: string]: number } = {};
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const userModules = userData['modules'] || [];
        
        userModules.forEach((moduleValue: string) => {
          moduleCounts[moduleValue] = (moduleCounts[moduleValue] || 0) + 1;
        });
      });

      // Actualizar cada módulo en Firestore
      const batch = writeBatch(this.db);
      
      modules.forEach(module => {
        const moduleRef = doc(this.db, this.MODULES_COLLECTION, module.id);
        const count = moduleCounts[module.value] || 0;
        
        batch.update(moduleRef, { usersCount: count });
      });

      await batch.commit();

      // ✅ OPTIMIZADO: Actualizar signal localmente (user counts)
      this._modules.update(modules =>
        modules.map(m => ({
          ...m,
          usersCount: moduleCounts[m.value] || 0
        }))
      );

    } catch (error) {
      console.error('❌ Error actualizando usersCount:', error);
    }
  }

  /**
   * Cuenta usuarios que usan un módulo específico
   */
  private async countUsersUsingModule(moduleValue: string): Promise<number> {
    try {
      const usersRef = collection(this.db, 'authorized_users');
      const q = query(usersRef, where('modules', 'array-contains', moduleValue));
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error contando usuarios con módulo:', error);
      return 0;
    }
  }

  /**
   * Obtiene módulos activos (para usar en selects)
   */
  getActiveModules(): SystemModule[] {
    return this._modules().filter(m => m.isActive);
  }

  /**
   * Valida datos del módulo
   */
  private validateModuleData(data: ModuleFormData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.value || data.value.trim().length < 2) {
      errors.push('El identificador debe tener al menos 2 caracteres');
    }

    if (!data.label || data.label.trim().length < 3) {
      errors.push('El nombre debe tener al menos 3 caracteres');
    }

    if (!data.description || data.description.trim().length < 5) {
      errors.push('La descripción debe tener al menos 5 caracteres');
    }

    if (!data.icon || data.icon.trim().length < 2) {
      errors.push('Debe especificar un icono válido');
    }

    // Validar que value solo tenga caracteres permitidos
    if (!/^[a-z0-9-_]+$/i.test(data.value)) {
      errors.push('El identificador solo puede contener letras, números, guiones y guiones bajos');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * ✅ REFACTORIZADO: Log de acciones para auditoría
   * Ahora usa utilidad centralizada de audit-logger.utils
   */
  private async logModuleAction(
    action: string,
    moduleId: string,
    details: any,
    currentUserUid: string
  ): Promise<void> {
    await logAuditAction({
      action,
      targetId: moduleId,
      details,
      performedBy: currentUserUid
    });
  }

  /**
   * Inicializa módulos por defecto (para migración)
   */
  async initializeDefaultModules(currentUserUid: string): Promise<void> {
    const existingModules = this._modules();
    
    if (existingModules.length > 0) {
      return;
    }

    const defaultModules: ModuleFormData[] = [
      {
        value: 'dashboard',
        label: 'Dashboard Principal',
        description: 'Panel principal con métricas y resumen del sistema',
        icon: 'dashboard',
        route: '/dashboard',
        isActive: true
      },
      {
        value: 'user-management',
        label: 'Gestión de Usuarios',
        description: 'Administración completa de usuarios y permisos',
        icon: 'people',
        route: '/admin',
        isActive: true
      },
      {
        value: 'clients',
        label: 'Gestión de Clientes',
        description: 'Módulo configurable para gestionar clientes con campos personalizados',
        icon: 'group',
        route: '/modules/clients',
        isActive: true
      },
      {
        value: 'analytics',
        label: 'Analytics y Reportes',
        description: 'Análisis de datos y generación de reportes',
        icon: 'analytics',
        route: '/analytics',
        isActive: true
      },
      {
        value: 'settings',
        label: 'Configuración del Sistema',
        description: 'Configuraciones generales y parámetros del sistema',
        icon: 'settings',
        route: '/admin/config',
        isActive: true
      },
      {
        value: 'notifications',
        label: 'Centro de Notificaciones',
        description: 'Gestión y envío de notificaciones del sistema',
        icon: 'notifications',
        route: '/notifications',
        isActive: true
      },
      {
        value: 'audit-logs',
        label: 'Logs de Auditoría',
        description: 'Registro y seguimiento de actividades del sistema',
        icon: 'history',
        route: '/admin/logs',
        isActive: true
      }
    ];

    for (const module of defaultModules) {
      await this.createModule(module, currentUserUid);
    }

  }
}