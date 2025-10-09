// src/app/core/services/app-config.service.ts
import { Injectable, signal, effect } from '@angular/core';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { SystemConfig } from '../../admin/models/system-config.interface';

/**
 * Servicio global para la configuración de la aplicación
 * Propaga cambios en tiempo real a todos los componentes
 */
@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private db = getFirestore();
  private readonly CONFIG_DOC_ID = 'system_config';
  private readonly CONFIG_COLLECTION = 'config';
  private unsubscribe: Unsubscribe | null = null;

  // Signals públicos (readonly)
  private _appName = signal<string>('Generic Admin Login');
  private _appDescription = signal<string>('Sistema de autenticación y gestión');
  private _logoUrl = signal<string>('');
  private _faviconUrl = signal<string>('');
  private _adminContactEmail = signal<string>('[email protected]');
  private _footerText = signal<string>('© 2025 Generic Admin. Todos los derechos reservados.');
  private _isLoaded = signal<boolean>(false);

  // Signals de solo lectura
  readonly appName = this._appName.asReadonly();
  readonly appDescription = this._appDescription.asReadonly();
  readonly logoUrl = this._logoUrl.asReadonly();
  readonly faviconUrl = this._faviconUrl.asReadonly();
  readonly adminContactEmail = this._adminContactEmail.asReadonly();
  readonly footerText = this._footerText.asReadonly();
  readonly isLoaded = this._isLoaded.asReadonly();

  constructor() {
    this.initializeRealtimeListener();
    this.setupFaviconUpdater();
  }

  /**
   * Inicializa el listener en tiempo real de Firestore
   */
  private initializeRealtimeListener() {
    const configRef = doc(this.db, this.CONFIG_COLLECTION, this.CONFIG_DOC_ID);

    this.unsubscribe = onSnapshot(
      configRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const config = docSnapshot.data() as SystemConfig;
          this.updateSignals(config);
          this._isLoaded.set(true);
          console.log('✅ Configuración actualizada en tiempo real');
        } else {
          console.warn('⚠️ Documento de configuración no existe');
          this.setDefaultValues();
          this._isLoaded.set(true);
        }
      },
      (error) => {
        console.error('❌ Error en listener de configuración:', error);
        this.setDefaultValues();
        this._isLoaded.set(true);
      }
    );
  }

  /**
   * Actualiza todos los signals con los datos de Firestore
   */
  private updateSignals(config: SystemConfig) {
    this._appName.set(config.appName || 'Generic Admin Login');
    this._appDescription.set(config.appDescription || '');
    this._logoUrl.set(config.logoUrl || '');
    this._faviconUrl.set(config.faviconUrl || config.logoUrl || '');
    this._adminContactEmail.set(config.adminContactEmail || '[email protected]');
    this._footerText.set(config.footerText || '');
  }

  /**
   * Establece valores por defecto
   */
  private setDefaultValues() {
    this._appName.set('Generic Admin Login');
    this._appDescription.set('Sistema de autenticación y gestión');
    this._logoUrl.set('');
    this._faviconUrl.set('');
    this._adminContactEmail.set('[email protected]');
    this._footerText.set('© 2025 Generic Admin. Todos los derechos reservados.');
  }

  /**
   * Configura el actualizador automático del favicon
   */
  private setupFaviconUpdater() {
    effect(() => {
      const faviconUrl = this._faviconUrl();
      
      if (faviconUrl) {
        this.updateFavicon(faviconUrl);
      } else {
        this.resetFavicon();
      }
    });
  }

  /**
   * Actualiza el favicon del navegador
   */
  private updateFavicon(url: string) {
    try {
      // Buscar el link del favicon existente
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      
      if (!link) {
        // Crear nuevo si no existe
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      
      link.href = url;
      console.log('✅ Favicon actualizado:', url);
    } catch (error) {
      console.error('❌ Error actualizando favicon:', error);
    }
  }

  /**
   * Resetea el favicon al por defecto
   */
  private resetFavicon() {
    try {
      const link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      
      if (link) {
        link.href = '/favicon.ico';
      }
      
      console.log('✅ Favicon reseteado al por defecto');
    } catch (error) {
      console.error('❌ Error reseteando favicon:', error);
    }
  }

  /**
   * Actualiza el título del documento
   */
  updateDocumentTitle(suffix?: string) {
    const appName = this._appName();
    document.title = suffix ? `${suffix} - ${appName}` : appName;
  }

  /**
   * Obtiene la información completa de la app
   */
  getAppInfo() {
    return {
      name: this._appName(),
      description: this._appDescription(),
      supportEmail: this._adminContactEmail()
    };
  }

  /**
   * Limpia el listener al destruir el servicio
   */
  ngOnDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      console.log('🔌 Listener de configuración desconectado');
    }
  }
}