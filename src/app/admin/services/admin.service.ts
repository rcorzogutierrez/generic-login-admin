// src/app/admin/services/admin.service.ts - VERSIÓN OPTIMIZADA ANGULAR 20 CON SIGNALS
import { Injectable, inject, signal, computed } from '@angular/core';
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import {
  getDocsWithLogging as getDocs,
  getDocWithLogging as getDoc,
  addDocWithLogging as addDoc,
  updateDocWithLogging as updateDoc,
  deleteDocWithLogging as deleteDoc,
  setDocWithLogging as setDoc
} from '../../shared/utils/firebase-logger.utils';
import {
  getAuth,
  sendPasswordResetEmail
} from 'firebase/auth';
import { ModulesService } from './modules.service';
import { handleError, createSuccessResult, createErrorResult } from '../../shared/utils/error-handler.utils';
import {
  logAuditAction,
  AuditActionTypes
} from '../../shared/utils/audit-logger.utils';
import {
  normalizeEmail,
  formatDisplayName,
  getInitials,
  getAvatarColor,
  generateShortId
} from '../../shared/utils/string.utils';

// ============================================
// INTERFACES
// ============================================

export interface CreateUserRequest {
  email: string;
  displayName: string;
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  permissions: string[];
  modules: string[];
}

export interface User {
  uid?: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  permissions: string[];
  modules: string[];
  createdAt: Date;
  createdBy: string;
  lastLogin?: Date;
  lastLoginDate?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalModules: number;
}

export interface ModuleOption {
  value: string;
  label: string;
  description: string;
  icon: string;
}

export interface RoleOption {
  value: string;
  label: string;
  description: string;
}

export interface PermissionOption {
  value: string;
  label: string;
  description: string;
}

// ============================================
// SERVICIO
// ============================================

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private db = getFirestore();
  private auth = getAuth();
  private modulesService = inject(ModulesService);
  private isInitialized = false; // ✅ Control de inicialización

  // Signals para usuarios
  private usersSignal = signal<User[]>([]);
  public users = this.usersSignal.asReadonly();

  // Computed signals para estadísticas
  public activeUsers = computed(() =>
    this.usersSignal().filter(u => u.isActive)
  );

  public adminUsers = computed(() =>
    this.usersSignal().filter(u => u.role === 'admin')
  );

  public totalUsers = computed(() =>
    this.usersSignal().length
  );

  constructor() {}

  /**
   * ✅ NUEVO: Inicializa la carga de usuarios solo cuando se necesita
   * @param forceRefresh Si es true, recarga los usuarios incluso si ya están inicializados
   */
  async initialize(forceRefresh: boolean = false): Promise<void> {
    if (this.isInitialized && !forceRefresh) {
      return;
    }

    await this.loadUsers();
    this.isInitialized = true;
  }

  // ============================================
  // GESTIÓN DE USUARIOS
  // ============================================

  /**
   * Crea un nuevo usuario PRE-AUTORIZADO (solo en Firestore)
   */
  async createUser(userData: CreateUserRequest): Promise<{ success: boolean; message: string; uid?: string }> {
    try {
      // Validar datos
      const validationResult = await this.validateUserCreation(userData);
      if (!validationResult.isValid) {
        return validationResult.result!;
      }

      // Verificar email duplicado
      const duplicateCheckResult = await this.checkDuplicateEmail(userData.email);
      if (!duplicateCheckResult.isValid) {
        return duplicateCheckResult.result!;
      }

      // Crear y guardar usuario
      const normalizedData = this.normalizeUserData(userData);
      const docId = await this.saveNewUser(normalizedData);

      return {
        success: true,
        message: `Usuario ${normalizedData.displayName} pre-autorizado exitosamente. Podrá acceder con su cuenta de Google asociada a ${normalizedData.email}`,
        uid: docId
      };

    } catch (error: any) {
      return await this.handleCreateUserError(error, userData);
    }
  }

  /**
   * Valida los datos del usuario antes de crearlo
   */
  private async validateUserCreation(userData: CreateUserRequest): Promise<{ isValid: boolean; result?: any }> {
    const validation = this.validateUserData(userData);
    if (!validation.isValid) {
      await this.logUserAction('create_user_failed', '', {
        reason: 'validation_error',
        errors: validation.errors,
        attemptedData: {
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role
        },
        performedBy: this.auth.currentUser?.email || 'system',
        timestamp: new Date().toISOString()
      });

      return {
        isValid: false,
        result: {
          success: false,
          message: `Datos inválidos: ${validation.errors.join(', ')}`
        }
      };
    }
    return { isValid: true };
  }

  /**
   * Verifica si el email ya existe en el sistema
   */
  private async checkDuplicateEmail(email: string): Promise<{ isValid: boolean; result?: any }> {
    const existingUsers = this.usersSignal();
    const emailExists = existingUsers.some(user =>
      normalizeEmail(user.email) === normalizeEmail(email)
    );

    if (emailExists) {
      await this.logUserAction('create_user_failed', '', {
        reason: 'email_already_exists',
        attemptedEmail: normalizeEmail(email),
        performedBy: this.auth.currentUser?.email || 'system',
        timestamp: new Date().toISOString()
      });

      return {
        isValid: false,
        result: {
          success: false,
          message: 'Ya existe un usuario autorizado con este email'
        }
      };
    }
    return { isValid: true };
  }

  /**
   * Normaliza los datos del usuario
   */
  private normalizeUserData(userData: CreateUserRequest): CreateUserRequest {
    return {
      ...userData,
      email: normalizeEmail(userData.email),
      displayName: formatDisplayName(userData.displayName)
    };
  }

  /**
   * Crea el documento de usuario en Firestore
   */
  private buildUserDocument(normalizedData: CreateUserRequest, tempUid: string): any {
    return {
      createdAt: Timestamp.now(),
      createdBy: this.auth.currentUser?.uid || 'system',
      displayName: normalizedData.displayName,
      email: normalizedData.email,
      isActive: normalizedData.isActive,
      lastLogin: null,
      lastLoginDate: null,
      permissions: normalizedData.permissions,
      modules: normalizedData.modules,
      role: normalizedData.role,
      uid: tempUid,
      createdByEmail: this.auth.currentUser?.email || 'system',
      accountStatus: 'pending_first_login',
      profileComplete: false,
      avatarColor: getAvatarColor(normalizedData.email),
      initials: getInitials(normalizedData.displayName),
      preAuthorized: true,
      firstLoginDate: null
    };
  }

  /**
   * Guarda un nuevo usuario en Firestore
   */
  private async saveNewUser(normalizedData: CreateUserRequest): Promise<string> {
    const tempUid = `pre_${Date.now()}_${generateShortId()}`;
    const userDocData = this.buildUserDocument(normalizedData, tempUid);
    const docId = normalizeEmail(normalizedData.email).replace(/[@.]/g, '_');

    await this.logUserAction('create_user_attempt', docId, {
      targetUser: {
        email: normalizedData.email,
        displayName: normalizedData.displayName,
        role: normalizedData.role,
        modules: normalizedData.modules,
        permissions: normalizedData.permissions,
        isActive: normalizedData.isActive
      },
      performedBy: this.auth.currentUser?.email || 'system',
      performedByUid: this.auth.currentUser?.uid || 'system',
      timestamp: new Date().toISOString()
    });

    await setDoc(doc(this.db, 'authorized_users', docId), userDocData);

    // ✅ OPTIMIZADO: Actualizar signal localmente en lugar de recargar todo
    const newUser: User = {
      uid: docId,
      email: normalizedData.email,
      displayName: normalizedData.displayName,
      role: normalizedData.role,
      isActive: normalizedData.isActive,
      permissions: normalizedData.permissions,
      modules: normalizedData.modules,
      createdAt: new Date(),
      createdBy: this.auth.currentUser?.uid || 'system',
      lastLogin: undefined,
      lastLoginDate: undefined
    };
    this.usersSignal.update(users => [newUser, ...users]);

    await this.logUserAction('create_user_success', docId, {
      createdUser: {
        email: normalizedData.email,
        displayName: normalizedData.displayName,
        role: normalizedData.role,
        modules: normalizedData.modules,
        permissions: normalizedData.permissions,
        isActive: normalizedData.isActive,
        docId: docId,
        tempUid: tempUid
      },
      performedBy: this.auth.currentUser?.email || 'system',
      performedByUid: this.auth.currentUser?.uid || 'system',
      message: 'Usuario pre-autorizado exitosamente',
      timestamp: new Date().toISOString()
    });

    return docId;
  }

  /**
   * Maneja errores durante la creación de usuarios
   */
  private async handleCreateUserError(error: any, userData: CreateUserRequest): Promise<{ success: boolean; message: string }> {
    console.error('❌ Error pre-autorizando usuario:', error);

    let errorMessage = 'Error desconocido al pre-autorizar el usuario';

    switch (error.code) {
      case 'permission-denied':
        errorMessage = 'No tienes permisos para crear usuarios';
        break;
      case 'unavailable':
        errorMessage = 'Servicio temporalmente no disponible, intenta más tarde';
        break;
      case 'not-found':
        errorMessage = 'Colección no encontrada en Firestore';
        break;
      default:
        errorMessage = error.message || 'Error al pre-autorizar el usuario';
    }

    await this.logUserAction('create_user_error', '', {
      error: errorMessage,
      errorCode: error.code || 'unknown',
      errorMessage: error.message,
      attemptedUserData: {
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        modules: userData.modules,
        permissions: userData.permissions
      },
      performedBy: this.auth.currentUser?.email || 'system',
      performedByUid: this.auth.currentUser?.uid || 'system',
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      message: errorMessage
    };
  }

  /**
   * Carga todos los usuarios con filtros opcionales
   */
  async loadUsers(filters?: { role?: string; isActive?: boolean; limit?: number }): Promise<void> {
    try {
      let usersRef = collection(this.db, 'authorized_users');
      let q = query(usersRef, orderBy('createdAt', 'desc'));

      if (filters?.role) {
        q = query(q, where('role', '==', filters.role));
      }
      
      if (filters?.isActive !== undefined) {
        q = query(q, where('isActive', '==', filters.isActive));
      }

      const querySnapshot = await getDocs(q);
      
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          uid: doc.id,
          email: data['email'] || '',
          displayName: data['displayName'] || '',
          role: data['role'] || 'user',
          isActive: data['isActive'] || false,
          permissions: data['permissions'] || [],
          modules: data['modules'] || [],
          createdAt: data['createdAt']?.toDate() || new Date(),
          createdBy: data['createdBy'] || '',
          lastLogin: data['lastLogin']?.toDate(),
          lastLoginDate: data['lastLoginDate']
        });
      });

      this.usersSignal.set(users);
    } catch (error) {
      console.error('❌ Error cargando usuarios:', error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario por UID
   */
  async getUserById(uid: string): Promise<User | null> {
    try {
      const userDocRef = doc(this.db, 'authorized_users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          uid: userDoc.id,
          email: data['email'] || '',
          displayName: data['displayName'] || '',
          role: data['role'] || 'user',
          isActive: data['isActive'] || false,
          permissions: data['permissions'] || [],
          modules: data['modules'] || [],
          createdAt: data['createdAt']?.toDate() || new Date(),
          createdBy: data['createdBy'] || '',
          lastLogin: data['lastLogin']?.toDate(),
          lastLoginDate: data['lastLoginDate']
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo usuario:', error);
      throw error;
    }
  }

  /**
   * Actualiza un usuario
   */
  async updateUser(uid: string, updateData: Partial<User>): Promise<{ success: boolean; message: string }> {
    try {
      const userDocRef = doc(this.db, 'authorized_users', uid);
      const currentUser = await this.getUserById(uid);
      
      if (!currentUser) {
        return { success: false, message: 'Usuario no encontrado' };
      }

      const dataToUpdate: any = {
        updatedAt: Timestamp.now(),
        updatedBy: this.auth.currentUser?.uid || 'system',
        updatedByEmail: this.auth.currentUser?.email || 'system'
      };

      if (updateData.displayName !== undefined) {
        dataToUpdate.displayName = formatDisplayName(updateData.displayName);
        dataToUpdate.initials = getInitials(dataToUpdate.displayName);
      }
      
      if (updateData.role !== undefined) {
        if (!['admin', 'user', 'viewer'].includes(updateData.role)) {
          return { success: false, message: 'Rol no válido' };
        }
        dataToUpdate.role = updateData.role;
      }
      
      if (updateData.isActive !== undefined) {
        dataToUpdate.isActive = updateData.isActive;
      }
      
      if (updateData.permissions !== undefined) {
        dataToUpdate.permissions = updateData.permissions;
      }
      
      if (updateData.modules !== undefined) {
        dataToUpdate.modules = updateData.modules;
      }
      
      await updateDoc(userDocRef, dataToUpdate);

      // ✅ OPTIMIZADO: Actualizar signal localmente
      this.usersSignal.update(users =>
        users.map(u => {
          if (u.uid === uid) {
            return {
              ...u,
              ...updateData,
              displayName: dataToUpdate.displayName || u.displayName,
              role: dataToUpdate.role || u.role,
              isActive: dataToUpdate.isActive !== undefined ? dataToUpdate.isActive : u.isActive,
              permissions: dataToUpdate.permissions || u.permissions,
              modules: dataToUpdate.modules || u.modules
            };
          }
          return u;
        })
      );

      await this.logUserAction('update', uid, {
        updatedFields: Object.keys(dataToUpdate),
        oldData: {
          role: currentUser.role,
          isActive: currentUser.isActive,
          modules: currentUser.modules
        },
        newData: updateData
      });

      return {
        success: true,
        message: 'Usuario actualizado correctamente'
      };
    } catch (error: any) {
      console.error('❌ Error actualizando usuario:', error);
      
      let errorMessage = 'Error al actualizar el usuario';
      if (error.code === 'permission-denied') {
        errorMessage = 'No tienes permisos para actualizar este usuario';
      } else if (error.code === 'not-found') {
        errorMessage = 'Usuario no encontrado';
      }

      await this.logUserAction('update_failed', uid, {
        error: errorMessage,
        updateData
      });

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Toggle del estado activo/inactivo
   */
  async toggleUserStatus(uid: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.getUserById(uid);
      if (!user) {
        return { success: false, message: 'Usuario no encontrado' };
      }

      // Prevenir desactivar el último admin
      if (user.role === 'admin' && user.isActive) {
        const activeAdmins = this.usersSignal().filter(u => 
          u.role === 'admin' && u.isActive && u.uid !== uid
        );
        
        if (activeAdmins.length === 0) {
          return { 
            success: false, 
            message: 'No se puede desactivar el último administrador activo' 
          };
        }
      }

      // Prevenir auto-desactivación
      if (this.auth.currentUser?.uid === uid && user.isActive) {
        return {
          success: false,
          message: 'No puedes desactivar tu propia cuenta'
        };
      }

      const newStatus = !user.isActive;
      const result = await this.updateUser(uid, { isActive: newStatus });

      if (result.success) {
        await this.logUserAction('status_change', uid, {
          oldStatus: user.isActive,
          newStatus: newStatus,
          userEmail: user.email
        });

        return {
          success: true,
          message: `Usuario ${newStatus ? 'activado' : 'desactivado'} correctamente`
        };
      }

      return result;
    } catch (error: any) {
      console.error('❌ Error cambiando estado:', error);
      return {
        success: false,
        message: error.message || 'Error al cambiar el estado del usuario'
      };
    }
  }

  /**
   * Elimina un usuario
   */
  async deleteUser(uid: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.getUserById(uid);
      
      if (!user) {
        return { success: false, message: 'Usuario no encontrado' };
      }

      // Validaciones de seguridad
      if (this.auth.currentUser?.uid === uid) {
        return {
          success: false,
          message: 'No puedes eliminar tu propia cuenta'
        };
      }

      if (user.role === 'admin') {
        const activeAdmins = this.usersSignal().filter(u => 
          u.role === 'admin' && u.uid !== uid
        );
        
        if (activeAdmins.length === 0) {
          return { 
            success: false, 
            message: 'No se puede eliminar el último administrador del sistema' 
          };
        }
      }

      const currentUser = this.usersSignal().find(
        u => u.email === this.auth.currentUser?.email
      );
      
      if (!currentUser || currentUser.role !== 'admin') {
        return {
          success: false,
          message: 'No tienes permisos para eliminar usuarios'
        };
      }

      await this.logUserAction('delete_user_attempt', uid, {
        deletedUser: {
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          modules: user.modules,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        },
        deletedBy: this.auth.currentUser?.email
      });

      const userDocRef = doc(this.db, 'authorized_users', uid);
      await deleteDoc(userDocRef);

      // ✅ OPTIMIZADO: Actualizar signal localmente
      this.usersSignal.update(users => users.filter(u => u.uid !== uid));

      await this.logUserAction('delete_user_success', uid, {
        deletedUserEmail: user.email,
        deletedUserRole: user.role
      });

      return {
        success: true,
        message: `Usuario ${user.displayName} (${user.email}) eliminado correctamente`
      };

    } catch (error: any) {
      console.error('❌ Error eliminando usuario:', error);
      
      let errorMessage = 'Error al eliminar el usuario';
      
      switch (error.code) {
        case 'permission-denied':
          errorMessage = 'No tienes permisos para eliminar este usuario';
          break;
        case 'not-found':
          errorMessage = 'El usuario ya no existe en el sistema';
          break;
        case 'unavailable':
          errorMessage = 'Servicio temporalmente no disponible';
          break;
        default:
          errorMessage = error.message || 'Error desconocido al eliminar usuario';
      }

      await this.logUserAction('delete_user_failed', uid, {
        error: errorMessage,
        errorCode: error.code
      });

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Eliminación múltiple de usuarios
   */
  async deleteMultipleUsers(uids: string[]): Promise<{ 
    success: boolean; 
    message: string;
    deleted: number;
    failed: number;
    errors: string[];
  }> {
    let deleted = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const uid of uids) {
      const result = await this.deleteUser(uid);
      
      if (result.success) {
        deleted++;
      } else {
        failed++;
        errors.push(`${uid}: ${result.message}`);
      }
    }

    await this.logUserAction('delete_multiple_users', '', {
      totalAttempted: uids.length,
      deleted,
      failed,
      errors
    });

    return {
      success: deleted > 0,
      message: `${deleted} usuario(s) eliminado(s), ${failed} fallido(s)`,
      deleted,
      failed,
      errors
    };
  }

  /**
   * Reset de contraseña
   */
  async resetUserPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      
      const user = this.usersSignal().find(u => u.email === email);
      if (user) {
        await this.logUserAction('password_reset_sent', user.uid || '', {
          userEmail: email
        });
      }

      return {
        success: true,
        message: `Email de restablecimiento enviado a ${email}`
      };
    } catch (error: any) {
      console.error('❌ Error enviando email:', error);
      
      let errorMessage = 'Error al enviar el email de restablecimiento';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No se encontró un usuario con este email';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El email no tiene un formato válido';
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Exporta usuarios
   */
  async exportUsers(): Promise<{ success: boolean; data?: any[]; message: string }> {
    try {
      const users = this.usersSignal();
      
      const exportData = users.map(user => ({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
        permissions: user.permissions,
        modules: user.modules,
        createdAt: user.createdAt.toISOString(),
        lastLogin: user.lastLogin?.toISOString() || null
      }));

      await this.logUserAction('export_users', '', {
        exportedCount: exportData.length
      });

      return {
        success: true,
        data: exportData,
        message: `${exportData.length} usuarios exportados correctamente`
      };
    } catch (error: any) {
      console.error('❌ Error exportando:', error);
      return {
        success: false,
        message: 'Error al exportar los datos de usuarios'
      };
    }
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  /**
   * Obtiene estadísticas del admin
   */
  async getAdminStats(): Promise<AdminStats> {
    try {
      return {
        totalUsers: this.totalUsers(),
        activeUsers: this.activeUsers().length,
        adminUsers: this.adminUsers().length,
        totalModules: this.getUniqueModulesCount(this.usersSignal())
      };
    } catch (error) {
      console.error('❌ Error obteniendo stats:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        adminUsers: 0,
        totalModules: 0
      };
    }
  }

  private getUniqueModulesCount(users: User[]): number {
    const allModules = users.flatMap(user => user.modules || []);
    return new Set(allModules).size;
  }

  // ============================================
  // OPCIONES PARA SELECTS
  // ============================================

  /**
   * Opciones de roles
   */
  getRoleOptions(): RoleOption[] {
    return [
      { value: 'admin', label: 'Administrador', description: 'Acceso completo al sistema' },
      { value: 'user', label: 'Usuario', description: 'Acceso estándar a funcionalidades' },
      { value: 'viewer', label: 'Visualizador', description: 'Solo lectura' }
    ];
  }

  /**
   * Opciones de permisos
   */
  getPermissionOptions(): PermissionOption[] {
    return [
      { value: 'read', label: 'Lectura', description: 'Ver información' },
      { value: 'write', label: 'Escritura', description: 'Crear y editar' },
      { value: 'manage_users', label: 'Gestionar usuarios', description: 'Crear, editar y eliminar usuarios' },
      { value: 'delete', label: 'Eliminar', description: 'Eliminar registros' }
    ];
  }

  /**
   * Opciones de módulos (DINÁMICO - SIN FALLBACK)
   */
  getModuleOptions(): ModuleOption[] {
    const dynamicModules = this.modulesService?.getActiveModules() || [];
    
    if (dynamicModules.length === 0) {
      return [];
    }
    
    return dynamicModules.map(module => ({
      value: module.value,
      label: module.label,
      description: module.description,
      icon: module.icon
    }));
  }

  // ============================================
  // MÉTODOS PRIVADOS DE UTILIDAD
  // ============================================

  /**
   * ✅ REFACTORIZADO: Ahora usa utilidad centralizada de audit-logger.utils
   * @deprecated Usar logAuditAction directamente
   */
  private async logUserAction(action: string, targetUserId: string, details: any): Promise<void> {
    await logAuditAction({
      action,
      targetId: targetUserId,
      details
    });
  }

  private validateUserData(userData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!userData.email || !userData.email.trim()) {
      errors.push('Email es requerido');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Email no tiene formato válido');
    }

    if (!userData.displayName || userData.displayName.trim().length < 2) {
      errors.push('Nombre completo es requerido (mínimo 2 caracteres)');
    }

    if (!userData.role || !['admin', 'user', 'viewer'].includes(userData.role)) {
      errors.push('Rol válido es requerido');
    }

    if (!userData.permissions || !Array.isArray(userData.permissions) || userData.permissions.length === 0) {
      errors.push('Al menos un permiso es requerido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * ✅ NOTA: Estos métodos ahora son utilidades compartidas importadas desde string.utils.ts
   * Se mantienen como referencia pero ya no se usan localmente.
   * Todas las llamadas en este servicio usan las versiones importadas.
   */
}