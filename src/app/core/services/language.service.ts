import { Injectable, signal, computed } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

export type SupportedLanguage = 'es' | 'en';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  // ✅ MODERNIZADO: Signal en lugar de BehaviorSubject
  private _currentLanguage = signal<SupportedLanguage>('es');

  // Readonly signal para acceso externo
  readonly currentLanguage = this._currentLanguage.asReadonly();

  // Computed signals para formato localizado
  readonly currentLocale = computed(() =>
    this._currentLanguage() === 'es' ? 'es-MX' : 'en-US'
  );

  constructor(private translate: TranslateService) {
    this.translate.setDefaultLang('es');
    this.translate.use('es');
  }

  /**
   * Cambia el idioma de la aplicación
   */
  setLanguage(lang: SupportedLanguage): void {
    this.translate.use(lang);
    this._currentLanguage.set(lang);
    // Opcional: guardar preferencia en localStorage
    localStorage.setItem('preferredLanguage', lang);
  }

  /**
   * Obtiene el idioma actual
   */
  getCurrentLanguage(): SupportedLanguage {
    return this._currentLanguage();
  }

  /**
   * Obtiene el idioma preferido del usuario desde localStorage o navegador
   */
  getPreferredLanguage(): SupportedLanguage {
    const stored = localStorage.getItem('preferredLanguage') as SupportedLanguage;
    if (stored && (stored === 'es' || stored === 'en')) {
      return stored;
    }

    // Detectar idioma del navegador
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'en' ? 'en' : 'es';
  }

  /**
   * Inicializa el idioma basado en preferencias
   */
  initializeLanguage(): void {
    const preferredLang = this.getPreferredLanguage();
    this.setLanguage(preferredLang);
  }

  /**
   * Formatea moneda según el idioma
   */
  formatCurrency(amount: number, language: SupportedLanguage = 'es'): string {
    const locale = language === 'es' ? 'es-MX' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Formatea fecha según el idioma
   */
  formatDate(date: Date | string | number, language: SupportedLanguage = 'es', options?: Intl.DateTimeFormatOptions): string {
    const locale = language === 'es' ? 'es-MX' : 'en-US';
    const dateObj = date instanceof Date ? date : new Date(date);

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    return dateObj.toLocaleDateString(locale, options || defaultOptions);
  }

  /**
   * Formatea fecha corta según el idioma
   */
  formatShortDate(date: Date | string | number, language: SupportedLanguage = 'es'): string {
    const locale = language === 'es' ? 'es-MX' : 'en-US';
    const dateObj = date instanceof Date ? date : new Date(date);

    return dateObj.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Obtiene traducción directa
   */
  instant(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

  /**
   * Obtiene traducción como Observable
   */
  get(key: string, params?: any): Observable<string> {
    return this.translate.get(key, params);
  }
}
