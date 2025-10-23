// src/app/admin/services/roles.service.ts
import { Injectable, signal } from '@angular/core';
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
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { Role } from '../models/role.interface';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private db = getFirestore();
  private rolesCollection = collection(this.db, 'roles');

  // Signal para roles
  roles = signal<Role[]>([]);

  constructor() {
    this.initializeSystemRoles();
    this.loadRoles();
  }

  /**
   * Inicializa los roles del sistema (admin, user, viewer)
   * Solo se ejecuta si no existen
   */
  private async initializeSystemRoles() {
    const systemRoles: Omit<Role, 'id'>[] = [
      {
        value: 'admin',
        label: 'Administrador',
        description: 'Acceso completo al sistema',
        permissions: ['read', 'write', 'delete', 'manage_users'],
        isSystemRole: true,
        isActive: true,
        createdAt: new Date()
      },
      {
        value: 'user',
        label: 'Usuario',
        description: 'Acceso estándar a funcionalidades',
        permissions: ['read', 'write'],
        isSystemRole: true,
        isActive: true,
        createdAt: new Date()
      },
      {
        value: 'viewer',
        label: 'Visualizador',
        description: 'Solo lectura',
        permissions: ['read'],
        isSystemRole: true,
        isActive: true,
        createdAt: new Date()
      }
    ];

    try {
      // Verificar si ya existen roles
      const snapshot = await getDocs(this.rolesCollection);

      if (snapshot.empty) {
        console.log('🔧 Inicializando roles del sistema...');
        const batch = writeBatch(this.db);

        systemRoles.forEach(role => {
          const docRef = doc(this.rolesCollection);
          batch.set(docRef, {
            ...role,
            createdAt: Timestamp.fromDate(role.createdAt)
          });
        });

        await batch.commit();
        console.log('✅ Roles del sistema inicializados');
      }
    } catch (error) {
      console.error('❌ Error inicializando roles del sistema:', error);
    }
  }

  /**
   * Carga todos los roles desde Firestore
   */
  async loadRoles() {
    try {
      const q = query(this.rolesCollection, orderBy('label', 'asc'));
      const snapshot = await getDocs(q);

      const roles: Role[] = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()['createdAt']?.toDate() || new Date(),
        updatedAt: doc.data()['updatedAt']?.toDate()
      })) as Role[];

      this.roles.set(roles);
      console.log('📋 Roles cargados:', roles.length);
      return roles;
    } catch (error) {
      console.error('❌ Error cargando roles:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo rol
   */
  async createRole(roleData: Omit<Role, 'id' | 'createdAt' | 'isSystemRole'>): Promise<string> {
    try {
      // Validar que no exista un rol con el mismo value
      const existing = this.roles().find(r => r.value === roleData.value);
      if (existing) {
        throw new Error('Ya existe un rol con ese identificador');
      }

      const newRole = {
        ...roleData,
        isSystemRole: false,
        createdAt: Timestamp.fromDate(new Date()),
        userCount: 0
      };

      const docRef = await addDoc(this.rolesCollection, newRole);
      console.log('✅ Rol creado:', docRef.id);

      await this.loadRoles();
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creando rol:', error);
      throw error;
    }
  }

  /**
   * Actualiza un rol existente
   */
  async updateRole(roleId: string, updates: Partial<Role>): Promise<void> {
    try {
      const role = this.roles().find(r => r.id === roleId);
      if (!role) {
        throw new Error('Rol no encontrado');
      }

      if (role.isSystemRole && (updates.value || updates.isSystemRole === false)) {
        throw new Error('No se pueden modificar los roles del sistema');
      }

      const docRef = doc(this.db, 'roles', roleId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      });

      console.log('✅ Rol actualizado:', roleId);
      await this.loadRoles();
    } catch (error) {
      console.error('❌ Error actualizando rol:', error);
      throw error;
    }
  }

  /**
   * Elimina un rol (solo roles personalizados)
   */
  async deleteRole(roleId: string): Promise<void> {
    try {
      const role = this.roles().find(r => r.id === roleId);
      if (!role) {
        throw new Error('Rol no encontrado');
      }

      if (role.isSystemRole) {
        throw new Error('No se pueden eliminar los roles del sistema');
      }

      if (role.userCount && role.userCount > 0) {
        throw new Error('No se puede eliminar un rol que tiene usuarios asignados');
      }

      const docRef = doc(this.db, 'roles', roleId);
      await deleteDoc(docRef);

      console.log('✅ Rol eliminado:', roleId);
      await this.loadRoles();
    } catch (error) {
      console.error('❌ Error eliminando rol:', error);
      throw error;
    }
  }

  /**
   * Obtiene un rol por su ID
   */
  getRoleById(roleId: string): Role | undefined {
    return this.roles().find(r => r.id === roleId);
  }

  /**
   * Obtiene un rol por su value
   */
  getRoleByValue(value: string): Role | undefined {
    return this.roles().find(r => r.value === value);
  }

  /**
   * Obtiene solo los roles activos
   */
  getActiveRoles(): Role[] {
    return this.roles().filter(r => r.isActive);
  }

  /**
   * Actualiza el contador de usuarios de un rol
   */
  async updateUserCount(roleValue: string, count: number): Promise<void> {
    const role = this.getRoleByValue(roleValue);
    if (role) {
      await this.updateRole(role.id, { userCount: count });
    }
  }

  /**
   * Obtiene las opciones de roles para selects
   */
  getRoleOptions(): { value: string; label: string; description: string }[] {
    return this.getActiveRoles().map(role => ({
      value: role.value,
      label: role.label,
      description: role.description
    }));
  }
}
