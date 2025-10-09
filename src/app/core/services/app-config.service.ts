// src/app/core/services/app-config.service.ts
import { Injectable, signal, effect } from '@angular/core';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { getDoc } from 'firebase/firestore'; 
import { SystemConfig } from '../../admin/models/system-config.interface';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private db = getFirestore();
  private readonly CONFIG_DOC_ID = 'system_config';
  private readonly CONFIG_COLLECTION = 'config';
  private unsubscribe: Unsubscribe | null = null;

  // Signals privados (writable)
  private _appName = signal<string>('Generic Admin Login');
  private _appDescription = signal<string>('Sistema de autenticación y gestión');
  private _logoUrl = signal<string>('');
  private _faviconUrl = signal<string>('');
  private _adminContactEmail = signal<string>('[email protected]');
  private _footerText = signal<string>('© 2025 Generic Admin. Todos los derechos reservados.');
  private _isLoaded = signal<boolean>(false);

  // Signals públicos (readonly)
  readonly appName = this._appName.asReadonly();
  readonly appDescription = this._appDescription.asReadonly();
  readonly logoUrl = this._logoUrl.asReadonly();
  readonly faviconUrl = this._faviconUrl.asReadonly();
  readonly adminContactEmail = this._adminContactEmail.asReadonly();
  readonly footerText = this._footerText.asReadonly();
  readonly isLoaded = this._isLoaded.asReadonly();

  constructor() {
    console.log('🚀 AppConfigService inicializando...');
    this.initializeRealtimeListener();
    this.setupFaviconUpdater();
  }

  /**
   * Inicializa el listener en tiempo real de Firestore
   */
  private initializeRealtimeListener() {
    const configRef = doc(this.db, this.CONFIG_COLLECTION, this.CONFIG_DOC_ID);

    console.log('📡 Configurando listener de Firestore...');

    this.unsubscribe = onSnapshot(
      configRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const config = docSnapshot.data() as SystemConfig;
          console.log('✅ Configuración recibida de Firestore:', config);
          this.updateSignals(config);
          this._isLoaded.set(true);
        } else {
          console.warn('⚠️ Documento de configuración no existe, usando valores por defecto');
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
    console.log('🔄 Actualizando signals con:', {
      appName: config.appName,
      appDescription: config.appDescription,
      logoUrl: config.logoUrl,
      adminContactEmail: config.adminContactEmail,
      footerText: config.footerText
    });

    this._appName.set(config.appName || 'Generic Admin Login');
    this._appDescription.set(config.appDescription || '');
    this._logoUrl.set(config.logoUrl || '');
    this._faviconUrl.set(config.faviconUrl || config.logoUrl || '');
    this._adminContactEmail.set(config.adminContactEmail || '[email protected]');
    this._footerText.set(config.footerText || '');

    console.log('✅ Signals actualizados:', {
      appName: this._appName(),
      appDescription: this._appDescription(),
      logoUrl: this._logoUrl(),
      adminContactEmail: this._adminContactEmail(),
      footerText: this._footerText()
    });
  }

  /**
   * Establece valores por defecto
   */
  private setDefaultValues() {
    console.log('⚙️ Estableciendo valores por defecto');
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
      console.log('🔄 Effect de favicon ejecutado, URL:', faviconUrl);
      
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
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      
      if (!link) {
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
   * Método para forzar recarga manual (útil para debug)
   */
  async forceReload() {
    console.log('🔄 Forzando recarga de configuración...');
    const configRef = doc(this.db, this.CONFIG_COLLECTION, this.CONFIG_DOC_ID);
    const docSnap = await getDoc(configRef);
    
    if (docSnap.exists()) {
      const config = docSnap.data() as SystemConfig;
      this.updateSignals(config);
    }
  }
}