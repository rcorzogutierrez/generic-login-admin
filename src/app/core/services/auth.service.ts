// src/app/core/services/auth.service.ts - VERSIÓN OPTIMIZADA

import { Injectable, signal } from '@angular/core';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Timestamp, collection, getFirestore } from 'firebase/firestore';
import { addDocWithLogging as addDoc } from '../../shared/utils/firebase-logger.utils';
import { Router } from '@angular/router';
import { FirestoreUserService, FirestoreUser } from './firestore-user.service';
import { AppConfigService } from './app-config.service';

/**
 * Servicio de autenticación con Firebase Auth
 *
 * Características:
 * - Signal-based state management
 * - Google OAuth provider
 * - Verificación de autorización vía Firestore
 * - Gestión de permisos y roles
 * - Auth state listener reactivo
 *
 * @example
 * ```typescript
 * constructor(private authService: AuthService) {}
 *
 * async login() {
 *   const result = await this.authService.loginWithGoogle();
 *   if (result.success) {
 *     // Usuario autenticado y autorizado
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _user = signal<User | null>(null);
  private _authorizedUser = signal<FirestoreUser | null>(null);
  private _isAuthenticated = signal(false);
  private _isAuthorized = signal(false);
  private _loading = signal(true);

  readonly user = this._user.asReadonly();
  readonly authorizedUser = this._authorizedUser.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly isAuthorized = this._isAuthorized.asReadonly();
  readonly loading = this._loading.asReadonly();

  private auth = getAuth();
  private firestore = getFirestore();
  private googleProvider = new GoogleAuthProvider();

  constructor(
    private router: Router,
    private firestoreUserService: FirestoreUserService,
    private appConfigService: AppConfigService
  ) {
    this.setupGoogleProvider();
    this.initAuthStateListener();
  }

  private setupGoogleProvider(): void {
    this.googleProvider.addScope('email');
    this.googleProvider.addScope('profile');
    this.googleProvider.setCustomParameters({ prompt: 'select_account' });
  }

  /**
   * Inicia sesión con Google OAuth
   *
   * Flujo:
   * 1. Abre popup de autenticación de Google
   * 2. Verifica que el usuario existe en Firestore (users collection)
   * 3. Verifica que el usuario está activo (isActive: true)
   * 4. Actualiza lastLogin en primer login o login exitoso
   * 5. Configura signals de estado (isAuthenticated, isAuthorized)
   *
   * @returns Promise con resultado del login
   * @returns result.success - true si login exitoso y usuario autorizado
   * @returns result.message - Mensaje descriptivo del resultado
   *
   * @example
   * ```typescript
   * const result = await authService.loginWithGoogle();
   * if (result.success) {
   *   console.log('Usuario autenticado');
   * } else {
   *   console.error(result.message);
   * }
   * ```
   */
  async loginWithGoogle(): Promise<{ success: boolean; message: string }> {
    try {
      this._loading.set(true);
      
      const result = await signInWithPopup(this.auth, this.googleProvider);

      if (result.user) {
        const authResult = await this.checkUserAuthorization(result.user);

        if (authResult.authorized) {
          // ✅ ACTUALIZAR LASTLOGIN DESPUÉS DE LOGIN EXITOSO
          await this.updateUserLastLogin(result.user.email!);
          return { success: true, message: 'Login exitoso' };
        } else {
          await this.logout();
          return { success: false, message: authResult.message || 'No autorizado' };
        }
      }

      return { success: false, message: 'Error en la autenticación' };
    } catch (error: any) {
      await this.logout();
      return { success: false, message: this.getErrorMessage(error) };
    } finally {
      this._loading.set(false);
    }
  }

  private async checkUserAuthorization(user: User): Promise<{ authorized: boolean; message?: string }> {
    try {
      if (!user.email) {
        return { authorized: false, message: 'Email no disponible' };
      }

      const userResult = await this.firestoreUserService.findUserByEmail(user.email);

      if (!userResult) {
        return {
          authorized: false,
          message: `Tu cuenta (${user.email}) no está registrada. Contacta al administrador.`
        };
      }

      const userData = userResult.data;

      if (!userData.isActive) {
        return { authorized: false, message: 'Tu cuenta está deshabilitada.' };
      }

      // Actualizar UID en primer login
      if (userData.accountStatus === 'pending_first_login' || userData.uid !== user.uid) {
        await this.handleFirstLogin(userResult.ref, user.uid);
        userData.uid = user.uid;
        userData.accountStatus = 'active';
      }

      this._authorizedUser.set(userData);
      this._isAuthorized.set(true);

      return { authorized: true };
    } catch (error) {
      console.error('Error verificando autorización:', error);
      return { authorized: false, message: 'Error verificando permisos.' };
    }
  }

  private async handleFirstLogin(userRef: any, uid: string): Promise<void> {
    try {
      const now = Timestamp.now();
      await this.firestoreUserService.updateUser(uid, {
        uid,
        accountStatus: 'active',
        lastLogin: now,
        lastLoginDate: new Date().toISOString(),
        profileComplete: true,
        firstLoginDate: now
      } as any);

      await this.logFirstLogin(uid, this.auth.currentUser?.email || '');
    } catch (error) {
      console.warn('Error en primer login (no crítico):', error);
    }
  }

  /**
   * ✅ NUEVA FUNCIÓN: Actualiza lastLogin en cada sesión
   */
  private async updateUserLastLogin(email: string): Promise<void> {
    try {
      await this.firestoreUserService.updateLastLogin(email);
      
      // Actualizar el signal con la información más reciente
      const userResult = await this.firestoreUserService.findUserByEmail(email);
      if (userResult) {
        this._authorizedUser.set(userResult.data);
      }
    } catch (error) {
      console.warn('Error actualizando lastLogin (no crítico):', error);
    }
  }

  private async logFirstLogin(uid: string, email: string): Promise<void> {
    try {
      await addDoc(collection(this.firestore, 'admin_logs'), {
        action: 'first_login',
        targetUserId: uid,
        targetUserEmail: email,
        performedBy: uid,
        performedByEmail: email,
        timestamp: new Date(),
        details: JSON.stringify({ event: 'first_login_with_google' }),
        ip: 'unknown'
      });
    } catch (error) {
      console.warn('Error logging first login:', error);
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.clearUserState();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error en logout:', error);
      this.clearUserState();
    }
  }

  /**
   * Listener de estado de autenticación
   * Se ejecuta cuando cambia el estado de auth (login, logout, refresh)
   *
   * NOTA: NO actualiza lastLogin aquí para evitar actualizaciones en cada
   * refresh de página. Solo se actualiza en loginWithGoogle() exitoso.
   */
  private initAuthStateListener(): void {
    onAuthStateChanged(this.auth, async (user) => {
      this._loading.set(true);
      this._user.set(user);

      try {
        if (user) {
          this._isAuthenticated.set(true);
          const userResult = await this.firestoreUserService.findUserByEmail(user.email!);

          if (userResult && userResult.data.isActive) {
            this._authorizedUser.set(userResult.data);
            this._isAuthorized.set(true);
          } else {
            await this.logout();
          }
        } else {
          this.clearUserState();
        }
      } catch (error) {
        console.error('Error en auth listener:', error);
        this.clearUserState();
      } finally {
        this._loading.set(false);
      }
    });
  }

  private clearUserState(): void {
    this._user.set(null);
    this._authorizedUser.set(null);
    this._isAuthenticated.set(false);
    this._isAuthorized.set(false);
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   *
   * @param permission - Nombre del permiso a verificar (ej: 'clients.create', 'workers.edit')
   * @returns true si el usuario tiene el permiso O es admin
   *
   * @example
   * ```typescript
   * if (authService.hasPermission('clients.create')) {
   *   // Mostrar botón de crear cliente
   * }
   * ```
   */
  hasPermission(permission: string): boolean {
    const user = this._authorizedUser();
    return user?.permissions.includes(permission) || user?.role === 'admin';
  }

  /**
   * Verifica si el usuario tiene acceso a un módulo específico
   *
   * @param moduleId - ID del módulo (ej: 'clients', 'workers', 'materials')
   * @returns true si el usuario tiene acceso al módulo O es admin
   *
   * @example
   * ```typescript
   * if (authService.hasModuleAccess('clients')) {
   *   // Mostrar módulo de clientes en el menú
   * }
   * ```
   */
  hasModuleAccess(moduleId: string): boolean {
    const user = this._authorizedUser();
    return user?.modules.includes(moduleId) || user?.role === 'admin';
  }

  getAppInfo() {
    return this.appConfigService.getAppInfo();
  }

  private getErrorMessage(error: any): string {
    const errorMessages: { [key: string]: string } = {
      'auth/popup-closed-by-user': 'Login cancelado',
      'auth/popup-blocked': 'Popup bloqueado. Permite popups',
      'auth/network-request-failed': 'Error de conexión',
      'auth/too-many-requests': 'Demasiados intentos'
    };
    return errorMessages[error.code] || `Error: ${error.message}`;
  }
}