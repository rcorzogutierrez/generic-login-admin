// src/app/core/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface AuthorizedUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  projects: string[];
  isActive: boolean;
  createdAt: any;
  createdBy: string;
  lastLogin?: any;
}

export interface ProjectConfig {
  projectId: string;
  name: string;
  description: string;
  allowedRoles: string[];
  redirectUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Signals para estado reactivo
  private _user = signal<User | null>(null);
  private _authorizedUser = signal<AuthorizedUser | null>(null);
  private _isAuthenticated = signal(false);
  private _isAuthorized = signal(false);
  private _loading = signal(true);

  // Getters públicos para signals (read-only)
  readonly user = this._user.asReadonly();
  readonly authorizedUser = this._authorizedUser.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly isAuthorized = this._isAuthorized.asReadonly();
  readonly loading = this._loading.asReadonly();

  private auth = getAuth();
  private firestore = getFirestore();
  private googleProvider = new GoogleAuthProvider();
  private currentProject: ProjectConfig | null = null;

  constructor(private router: Router) {
    this.setupGoogleProvider();
    this.initAuthStateListener();
  }

  private setupGoogleProvider(): void {
    this.googleProvider.addScope('email');
    this.googleProvider.addScope('profile');
    this.googleProvider.setCustomParameters({
      prompt: 'select_account',
    });
  }

  /**
   * Configura el proyecto actual para validaciones de autorización
   */
  setCurrentProject(project: ProjectConfig): void {
    this.currentProject = project;
    console.log('🎯 Proyecto configurado:', project.name);
  }

  /**
   * Inicia sesión con Google y valida autorización
   */
  async loginWithGoogle(
    projectId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      this._loading.set(true);
      console.log('🚀 Iniciando login con Google...');

      const result = await signInWithPopup(this.auth, this.googleProvider);

      if (result.user) {
        console.log('✅ Autenticado con Google:', result.user.email);

        // Verificar si el usuario está autorizado
        const authResult = await this.checkUserAuthorization(
          result.user,
          projectId
        );

        if (authResult.authorized) {
          // Actualizar último login
          await this.updateLastLogin(result.user.uid);
          console.log('🎉 Usuario autorizado exitosamente');

          return {
            success: true,
            message: 'Login exitoso',
          };
        } else {
          // Usuario no autorizado - cerrar sesión
          console.warn('❌ Usuario no autorizado:', authResult.message);
          await this.logout();
          return {
            success: false,
            message:
              authResult.message ||
              'No tienes permisos para acceder a este sistema',
          };
        }
      }

      return {
        success: false,
        message: 'Error en la autenticación con Google',
      };
    } catch (error: any) {
      console.error('💥 Error en login:', error);
      await this.logout();

      return {
        success: false,
        message: this.getErrorMessage(error),
      };
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Verifica si el usuario está autorizado en el sistema
   */
  private async checkUserAuthorization(
    user: User,
    projectId?: string
  ): Promise<{ authorized: boolean; message?: string }> {
    try {
      console.log('🔍 Verificando autorización para:', user.email);

      // Primero, buscar por email ya que el UID podría no coincidir
      const usersRef = collection(this.firestore, 'authorized_users');
      const q = query(usersRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.warn(
          '👤 Usuario no encontrado en authorized_users:',
          user.email
        );
        return {
          authorized: false,
          message: `Tu cuenta (${user.email}) no está registrada en el sistema. Contacta al administrador.`,
        };
      }

      // Obtener datos del usuario
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as AuthorizedUser;

      // Actualizar UID si es diferente (para casos de re-autenticación)
      if (userData.uid !== user.uid) {
        console.log('🔄 Actualizando UID del usuario');
        await updateDoc(userDoc.ref, { uid: user.uid });
        userData.uid = user.uid;
      }

      // Verificar si el usuario está activo
      if (!userData.isActive) {
        console.warn('🚫 Usuario deshabilitado:', user.email);
        return {
          authorized: false,
          message: 'Tu cuenta está deshabilitada. Contacta al administrador.',
        };
      }

      // Verificar permisos para el proyecto específico
      if (projectId && this.currentProject) {
        if (
          !userData.projects.includes(projectId) &&
          userData.role !== 'admin'
        ) {
          console.warn('🔒 Sin acceso al proyecto:', projectId);
          return {
            authorized: false,
            message: `No tienes permisos para acceder al proyecto: ${this.currentProject.name}`,
          };
        }

        if (!this.currentProject.allowedRoles.includes(userData.role)) {
          console.warn('👥 Rol no permitido:', userData.role);
          return {
            authorized: false,
            message: 'Tu rol no tiene permisos para este proyecto',
          };
        }
      }

      // Usuario autorizado - actualizar estado
      console.log(
        '✅ Usuario autorizado:',
        userData.role,
        userData.permissions
      );
      this._authorizedUser.set(userData);
      this._isAuthorized.set(true);

      return { authorized: true };
    } catch (error) {
      console.error('💥 Error verificando autorización:', error);
      return {
        authorized: false,
        message: 'Error verificando permisos. Intenta nuevamente.',
      };
    }
  }

  /**
   * Cierra sesión
   */
  async logout(): Promise<void> {
    try {
      console.log('👋 Cerrando sesión...');
      await signOut(this.auth);
      this.clearUserState();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('💥 Error en logout:', error);
      this.clearUserState();
    }
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  hasPermission(permission: string): boolean {
    const user = this._authorizedUser();
    return user?.permissions.includes(permission) || user?.role === 'admin';
  }

  /**
   * Verifica si el usuario tiene acceso a un proyecto
   */
  hasProjectAccess(projectId: string): boolean {
    const user = this._authorizedUser();
    return user?.projects.includes(projectId) || user?.role === 'admin';
  }

  /**
   * Obtiene la configuración del proyecto actual
   */
  getCurrentProject(): ProjectConfig | null {
    return this.currentProject;
  }

  /**
   * Obtiene información de la aplicación desde environment
   */
  getAppInfo() {
    return {
      name: environment.appName,
      description: environment.appDescription,
      supportEmail: environment.supportEmail,
    };
  }

  // MÉTODOS PRIVADOS

  private initAuthStateListener(): void {
    onAuthStateChanged(this.auth, async (user) => {
      console.log('🔄 Estado de auth cambió:', user?.email || 'No user');
      this._loading.set(true);
      this._user.set(user);

      if (user) {
        this._isAuthenticated.set(true);
        // Re-verificar autorización cuando cambia el estado de auth
        const authResult = await this.checkUserAuthorization(user);
        if (!authResult.authorized) {
          await this.logout();
        }
      } else {
        this.clearUserState();
      }

      this._loading.set(false);
    });
  }

  private clearUserState(): void {
    this._user.set(null);
    this._authorizedUser.set(null);
    this._isAuthenticated.set(false);
    this._isAuthorized.set(false);
  }

  private async updateLastLogin(uid: string): Promise<void> {
    try {
      const usersRef = collection(this.firestore, 'authorized_users');
      const q = query(usersRef, where('uid', '==', uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(userDoc.ref, {
          lastLogin: serverTimestamp(),
        });
        console.log('📅 Último login actualizado');
      }
    } catch (error) {
      console.error('💥 Error actualizando último login:', error);
    }
  }

  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        return 'Login cancelado por el usuario';
      case 'auth/popup-blocked':
        return 'Popup bloqueado. Permite popups para este sitio';
      case 'auth/network-request-failed':
        return 'Error de conexión. Verifica tu internet';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Espera un momento e intenta nuevamente';
      case 'auth/user-disabled':
        return 'Esta cuenta ha sido deshabilitada';
      default:
        return `Error inesperado: ${error.message || 'Intenta nuevamente'}`;
    }
  }
}
