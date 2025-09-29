// src/app/admin/services/admin.service.ts - VERSIÓN FINAL CON MÓDULOS
import { Injectable } from '@angular/core';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  getDoc,
  setDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private db = getFirestore();
  private auth = getAuth();
  private usersSubject = new BehaviorSubject<User[]>([]);
  
  public users$ = this.usersSubject.asObservable();

  constructor() {
    this.loadUsers();
  }

  /**
   * Crea un nuevo usuario con autenticación y datos en Firestore
   */
  async createUser(userData: CreateUserRequest): Promise<{ success: boolean; message: string; uid?: string }> {
    try {
      // 1. Validar datos de entrada
      const validation = this.validateUserData(userData);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Datos inválidos: ${validation.errors.join(', ')}`
        };
      }

      // 2. Verificar si el email ya existe
      const existingUsers = this.usersSubject.value;
      const emailExists = existingUsers.some(user => 
        this.normalizeEmail(user.email) === this.normalizeEmail(userData.email)
      );

      if (emailExists) {
        return {
          success: false,
          message: 'Ya existe un usuario con este email'
        };
      }

      // 3. Validar módulos
      if (!userData.modules || userData.modules.length === 0) {
        return {
          success: false,
          message: 'Debe asignar al menos un módulo al usuario'
        };
      }

      // 4. Normalizar datos
      const normalizedData = {
        ...userData,
        email: this.normalizeEmail(userData.email),
        displayName: this.formatDisplayName(userData.displayName)
      };

      // 5. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        normalizedData.email,
        this.generateSecureTemporaryPassword()
      );

      const newUser = userCredential.user;

      // 6. Actualizar el perfil del usuario
      await updateProfile(newUser, {
        displayName: normalizedData.displayName
      });

      // 7. Crear documento en Firestore con la estructura que manejas
      const userDocData = {
        createdAt: new Date(),
        createdBy: this.auth.currentUser?.uid || 'system',
        displayName: normalizedData.displayName,
        email: normalizedData.email,
        isActive: normalizedData.isActive,
        lastLogin: null,
        lastLoginDate: null,
        permissions: normalizedData.permissions,
        modules: normalizedData.modules, // ← MÓDULOS EN LUGAR DE PROYECTOS
        role: normalizedData.role,
        uid: newUser.uid,
        // Campos adicionales para auditoría
        createdByEmail: this.auth.currentUser?.email || 'system',
        initialPasswordSent: false,
        profileComplete: false,
        avatarColor: this.getAvatarColor(normalizedData.email),
        initials: this.getInitials(normalizedData.displayName)
      };

      await setDoc(doc(this.db, 'authorized_users', newUser.uid), userDocData);

      // 8. Enviar email de restablecimiento de contraseña
      try {
        await sendPasswordResetEmail(this.auth, normalizedData.email);
        
        // Marcar que el email fue enviado
        await updateDoc(doc(this.db, 'authorized_users', newUser.uid), {
          initialPasswordSent: true,
          passwordEmailSentAt: new Date()
        });
      } catch (emailError) {
        console.warn('Error enviando email de contraseña:', emailError);
        // No fallar la creación por el email, pero notificar
      }

      // 9. Actualizar la lista local
      await this.loadUsers();

      // 10. Log de auditoría
      await this.logUserAction('create', newUser.uid, {
        createdUser: normalizedData.email,
        role: normalizedData.role,
        modules: normalizedData.modules,
        permissions: normalizedData.permissions
      });

      return {
        success: true,
        message: `Usuario ${normalizedData.displayName} creado exitosamente. Se ha enviado un email para establecer la contraseña.`,
        uid: newUser.uid
      };

    } catch (error: any) {
      console.error('Error creando usuario:', error);
      
      let errorMessage = 'Error desconocido al crear el usuario';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'El email ya está registrado en el sistema de autenticación';
          break;
        case 'auth/invalid-email':
          errorMessage = 'El formato del email no es válido';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña generada es muy débil';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'El registro de usuarios no está habilitado';
          break;
        case 'permission-denied':
          errorMessage = 'No tienes permisos para crear usuarios';
          break;
        case 'unavailable':
          errorMessage = 'Servicio temporalmente no disponible, intenta más tarde';
          break;
        default:
          errorMessage = error.message || 'Error al crear el usuario';
      }

      // Log del error para auditoría
      await this.logUserAction('create_failed', '', {
        error: errorMessage,
        userData: { email: userData.email, role: userData.role }
      });

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Obtiene todos los usuarios con paginación y filtros
   */
  async loadUsers(filters?: { role?: string; isActive?: boolean; limit?: number }): Promise<void> {
    try {
      let usersRef = collection(this.db, 'authorized_users');
      let q = query(usersRef, orderBy('createdAt', 'desc'));

      // Aplicar filtros si existen
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
          modules: data['modules'] || [], // ← MÓDULOS
          createdAt: data['createdAt']?.toDate() || new Date(),
          createdBy: data['createdBy'] || '',
          lastLogin: data['lastLogin']?.toDate(),
          lastLoginDate: data['lastLoginDate']
        });
      });
      
      this.usersSubject.next(users);
      
      console.log(`📊 Usuarios cargados: ${users.length}`);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario específico por UID
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
          modules: data['modules'] || [], // ← MÓDULOS
          createdAt: data['createdAt']?.toDate() || new Date(),
          createdBy: data['createdBy'] || '',
          lastLogin: data['lastLogin']?.toDate(),
          lastLoginDate: data['lastLoginDate']
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }

  /**
   * Actualiza usuario con validaciones mejoradas
   */
  async updateUser(uid: string, updateData: Partial<User>): Promise<{ success: boolean; message: string }> {
    try {
      const userDocRef = doc(this.db, 'authorized_users', uid);
      const currentUser = await this.getUserById(uid);
      
      if (!currentUser) {
        return { success: false, message: 'Usuario no encontrado' };
      }

      // Preparar datos para actualización con validación
      const dataToUpdate: any = {};
      
      if (updateData.displayName !== undefined) {
        dataToUpdate.displayName = this.formatDisplayName(updateData.displayName);
        dataToUpdate.initials = this.getInitials(dataToUpdate.displayName);
      }
      
      if (updateData.role !== undefined) {
        // Validar que el rol sea válido
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
      
      if (updateData.modules !== undefined) { // ← MÓDULOS
        if (updateData.modules.length === 0) {
          return { success: false, message: 'El usuario debe tener al menos un módulo asignado' };
        }
        dataToUpdate.modules = updateData.modules;
      }

      // Agregar campos de auditoría
      dataToUpdate.updatedAt = new Date();
      dataToUpdate.updatedBy = this.auth.currentUser?.uid || 'system';
      dataToUpdate.updatedByEmail = this.auth.currentUser?.email || 'system';
      
      await updateDoc(userDocRef, dataToUpdate);
      
      // Log de la actualización
      await this.logUserAction('update', uid, {
        updatedFields: Object.keys(dataToUpdate),
        oldData: { 
          role: currentUser.role, 
          isActive: currentUser.isActive,
          modules: currentUser.modules 
        },
        newData: updateData
      });
      
      // Actualizar la lista local
      await this.loadUsers();
      
      return {
        success: true,
        message: 'Usuario actualizado correctamente'
      };
    } catch (error: any) {
      console.error('Error actualizando usuario:', error);
      
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
   * Cambia el estado activo/inactivo con validaciones
   */
  async toggleUserStatus(uid: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.getUserById(uid);
      if (!user) {
        return { success: false, message: 'Usuario no encontrado' };
      }

      // Prevenir desactivar el último admin
      if (user.role === 'admin' && user.isActive) {
        const activeAdmins = this.usersSubject.value.filter(u => 
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
      console.error('Error cambiando estado del usuario:', error);
      return {
        success: false,
        message: error.message || 'Error al cambiar el estado del usuario'
      };
    }
  }

  /**
   * Obtiene estadísticas mejoradas del admin
   */
  async getAdminStats(): Promise<AdminStats> {
    try {
      const users = this.usersSubject.value;
      
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        adminUsers: users.filter(u => u.role === 'admin').length,
        totalModules: this.getUniqueModulesCount(users) // ← MÓDULOS
      };

      return stats;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        adminUsers: 0,
        totalModules: 0
      };
    }
  }

  /**
   * Cuenta módulos únicos
   */
  private getUniqueModulesCount(users: User[]): number {
    const allModules = users.flatMap(user => user.modules || []);
    return new Set(allModules).size;
  }

  /**
   * Opciones predefinidas para roles
   */
  getRoleOptions() {
    return [
      { value: 'admin', label: 'Administrador', description: 'Acceso completo al sistema' },
      { value: 'user', label: 'Usuario', description: 'Acceso estándar a funcionalidades' },
      { value: 'viewer', label: 'Visualizador', description: 'Solo lectura' }
    ];
  }

  /**
   * Opciones predefinidas para permisos
   */
  getPermissionOptions() {
    return [
      { value: 'read', label: 'Lectura', description: 'Ver información' },
      { value: 'write', label: 'Escritura', description: 'Crear y editar' },
      { value: 'manage_users', label: 'Gestionar usuarios', description: 'Crear, editar y eliminar usuarios' },
      { value: 'delete', label: 'Eliminar', description: 'Eliminar registros' }
    ];
  }

  /**
   * Opciones de módulos disponibles - ACTUALIZADO
   */
  getModuleOptions(): ModuleOption[] {
    return [
      { 
        value: 'dashboard', 
        label: 'Dashboard Principal', 
        description: 'Panel principal con métricas y resumen del sistema',
        icon: 'dashboard'
      },
      { 
        value: 'user-management', 
        label: 'Gestión de Usuarios', 
        description: 'Administración completa de usuarios y permisos',
        icon: 'people'
      },
      { 
        value: 'analytics', 
        label: 'Analytics y Reportes', 
        description: 'Análisis de datos y generación de reportes',
        icon: 'analytics'
      },
      { 
        value: 'settings', 
        label: 'Configuración del Sistema', 
        description: 'Configuraciones generales y parámetros del sistema',
        icon: 'settings'
      },
      { 
        value: 'notifications', 
        label: 'Centro de Notificaciones', 
        description: 'Gestión y envío de notificaciones del sistema',
        icon: 'notifications'
      },
      { 
        value: 'audit-logs', 
        label: 'Logs de Auditoría', 
        description: 'Registro y seguimiento de actividades del sistema',
        icon: 'history'
      }
    ];
  }

  /**
   * Obtiene lista de emails existentes para validación
   */
  getExistingEmails(): string[] {
    return this.usersSubject.value.map(user => this.normalizeEmail(user.email));
  }

  /**
   * Envía email de restablecimiento de contraseña
   */
  async resetUserPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      
      // Log de la acción
      const user = this.usersSubject.value.find(u => u.email === email);
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
      console.error('Error enviando email de restablecimiento:', error);
      
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
   * Exporta datos de usuarios para backup
   */
  async exportUsers(): Promise<{ success: boolean; data?: any[]; message: string }> {
    try {
      const users = this.usersSubject.value;
      
      const exportData = users.map(user => ({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
        permissions: user.permissions,
        modules: user.modules, // ← MÓDULOS EN EXPORT
        createdAt: user.createdAt.toISOString(),
        lastLogin: user.lastLogin?.toISOString() || null
      }));

      // Log de la exportación
      await this.logUserAction('export_users', '', {
        exportedCount: exportData.length
      });

      return {
        success: true,
        data: exportData,
        message: `${exportData.length} usuarios exportados correctamente`
      };
    } catch (error: any) {
      console.error('Error exportando usuarios:', error);
      return {
        success: false,
        message: 'Error al exportar los datos de usuarios'
      };
    }
  }

  // ===== MÉTODOS PRIVADOS DE UTILIDAD =====

  /**
   * Genera una contraseña temporal más segura
   */
  private generateSecureTemporaryPassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    
    // Asegurar al menos un carácter de cada tipo
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Completar hasta 12 caracteres
    for (let i = 4; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Mezclar los caracteres
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  /**
   * Log de acciones para auditoría
   */
  private async logUserAction(action: string, targetUserId: string, details: any): Promise<void> {
    try {
      const logData = {
        action,
        targetUserId,
        performedBy: this.auth.currentUser?.uid || 'system',
        performedByEmail: this.auth.currentUser?.email || 'system',
        timestamp: new Date(),
        details: JSON.stringify(details),
        ip: 'unknown' // En producción podrías obtener la IP real
      };

      await addDoc(collection(this.db, 'admin_logs'), logData);
    } catch (error) {
      console.warn('Error logging user action:', error);
      // No fallar la operación principal por error de logging
    }
  }

  /**
   * Valida estructura de datos de usuario
   */
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

    if (!userData.modules || !Array.isArray(userData.modules) || userData.modules.length === 0) {
      errors.push('Al menos un módulo es requerido'); // ← VALIDACIÓN DE MÓDULOS
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Normaliza el email a lowercase y sin espacios
   */
  private normalizeEmail(email: string): string {
    if (!email) return '';
    return email.trim().toLowerCase();
  }

  /**
   * Formatea el nombre para display consistente
   */
  private formatDisplayName(name: string): string {
    if (!name) return '';
    
    return name
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Genera initials desde un nombre completo
   */
  private getInitials(displayName: string): string {
    if (!displayName) return '??';
    
    const words = displayName.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  /**
   * Genera color de avatar basado en el email
   */
  private getAvatarColor(email: string): string {
    if (!email) return '#6b7280';
    
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', 
      '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'
    ];

    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }
}