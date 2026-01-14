// src/app/shared/components/search-bar/search-bar.component.ts
import { Component, Input, Output, EventEmitter, signal, effect, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

/**
 * GenericSearchBarComponent - Barra de búsqueda reutilizable
 *
 * Componente standalone para búsqueda con:
 * - Debounce configurable
 * - Botón de limpiar
 * - Accesibilidad completa
 * - Múltiples temas de color
 * - Loading state
 *
 * @example
 * ```html
 * <app-search-bar
 *   placeholder="Buscar clientes..."
 *   [debounceTime]="300"
 *   [themeColor]="'purple'"
 *   (searchChange)="onSearch($event)">
 * </app-search-bar>
 * ```
 */
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css'
})
export class GenericSearchBarComponent implements OnDestroy {
  // ========================================
  // INPUTS
  // ========================================

  /** Placeholder text para el input */
  @Input() placeholder = 'Buscar...';

  /** Icono de Material Icons a mostrar */
  @Input() icon = 'search';

  /** Tiempo de debounce en milisegundos */
  @Input() debounceTime = 300;

  /** Estado deshabilitado */
  @Input() disabled = false;

  /** Tema de color */
  @Input() themeColor: 'purple' | 'amber' | 'blue' | 'green' = 'purple';

  /** Mostrar indicador de loading */
  @Input() loading = false;

  /** Ancho mínimo del input */
  @Input() minWidth = '300px';

  /** Auto focus al montar */
  @Input() autofocus = false;

  // ========================================
  // OUTPUTS
  // ========================================

  /** Emite el valor de búsqueda después del debounce */
  @Output() searchChange = new EventEmitter<string>();

  /** Emite cuando se limpia la búsqueda */
  @Output() clear = new EventEmitter<void>();

  // ========================================
  // STATE (Signals)
  // ========================================

  /** Valor actual del input */
  searchTerm = signal<string>('');

  /** Si el input tiene foco */
  isFocused = signal<boolean>(false);

  // ========================================
  // PRIVATE
  // ========================================

  /** Subject para aplicar debounce */
  private searchSubject = new Subject<string>();

  /** Subscription del debounce */
  private searchSubscription = this.searchSubject.pipe(
    debounceTime(this.debounceTime),
    distinctUntilChanged()
  ).subscribe(term => {
    this.searchChange.emit(term);
  });

  // ========================================
  // LIFECYCLE
  // ========================================

  constructor() {
    // Effect para sincronizar el valor inicial
    effect(() => {
      const term = this.searchTerm();
      // No emitir en el constructor
    });
  }

  ngOnDestroy(): void {
    this.searchSubscription.unsubscribe();
  }

  // ========================================
  // METHODS
  // ========================================

  /**
   * Maneja el cambio en el input
   */
  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.searchSubject.next(value);
  }

  /**
   * Limpia el campo de búsqueda
   */
  clearSearch(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.searchChange.emit('');
    this.clear.emit();
  }

  /**
   * Maneja el evento de focus
   */
  onFocus(): void {
    this.isFocused.set(true);
  }

  /**
   * Maneja el evento de blur
   */
  onBlur(): void {
    this.isFocused.set(false);
  }

  /**
   * Maneja keyboard shortcuts
   */
  onKeydown(event: KeyboardEvent): void {
    // Escape para limpiar
    if (event.key === 'Escape') {
      this.clearSearch();
      event.preventDefault();
    }
  }

  /**
   * Obtiene las clases CSS del tema
   */
  getThemeClasses(): string {
    const themes = {
      purple: 'focus:ring-purple-500 focus:border-purple-500',
      amber: 'focus:ring-amber-500 focus:border-amber-500',
      blue: 'focus:ring-blue-500 focus:border-blue-500',
      green: 'focus:ring-green-500 focus:border-green-500'
    };
    return themes[this.themeColor];
  }

  /**
   * Obtiene el color del icono según el tema
   */
  getIconColor(): string {
    const colors = {
      purple: 'text-purple-600',
      amber: 'text-amber-600',
      blue: 'text-blue-600',
      green: 'text-green-600'
    };
    return colors[this.themeColor];
  }
}
