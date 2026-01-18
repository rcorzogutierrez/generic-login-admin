import { Component, Input, Output, EventEmitter, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface ColumnOption {
  id: string;
  label: string;
  visible: boolean;
}

/**
 * ColumnVisibilityControl - Control reutilizable para gestionar visibilidad de columnas
 *
 * Características:
 * - Persistencia en localStorage (configurable)
 * - Dropdown con checkboxes para cada columna
 * - Botón para resetear a valores por defecto
 * - Emisión de eventos cuando cambia la visibilidad
 */
@Component({
  selector: 'app-column-visibility-control',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './column-visibility-control.component.html',
  styleUrl: './column-visibility-control.component.css'
})
export class ColumnVisibilityControlComponent {
  /**
   * Lista de columnas disponibles
   */
  @Input({ required: true }) columns: ColumnOption[] = [];

  /**
   * Key para localStorage (ej: 'clients-visible-columns')
   * Si no se proporciona, no se persiste en localStorage
   */
  @Input() storageKey?: string;

  /**
   * Color del tema (para consistencia con el módulo)
   */
  @Input() themeColor: 'purple' | 'green' | 'blue' | 'amber' = 'purple';

  /**
   * Emite cuando cambia la visibilidad de columnas
   * Devuelve array de IDs de columnas visibles
   */
  @Output() visibilityChange = new EventEmitter<string[]>();

  // Estado
  isMenuOpen = signal<boolean>(false);
  visibleColumnIds = signal<Set<string>>(new Set());

  // Computed
  visibleCount = computed(() => this.visibleColumnIds().size);
  totalCount = computed(() => this.columns.length);

  constructor() {
    // Effect para cargar desde localStorage cuando el componente se inicializa
    effect(() => {
      // Solo ejecutar si tenemos columnas y storageKey
      if (this.columns.length > 0 && this.storageKey) {
        this.loadFromStorage();
      }
    });

    // Effect para emitir cambios
    effect(() => {
      const visible = Array.from(this.visibleColumnIds());
      this.visibilityChange.emit(visible);
    });
  }

  /**
   * Cargar preferencias desde localStorage
   */
  private loadFromStorage() {
    if (!this.storageKey) return;

    const stored = localStorage.getItem(this.storageKey);

    if (stored) {
      try {
        const columnIds = JSON.parse(stored) as string[];
        this.visibleColumnIds.set(new Set(columnIds));
      } catch (error) {
        console.error('Error cargando preferencias de columnas:', error);
        // Si hay error, mostrar todas las columnas
        this.showAllColumns();
      }
    } else {
      // Primera vez: mostrar todas las columnas
      this.showAllColumns();
      this.saveToStorage();
    }
  }

  /**
   * Guardar preferencias en localStorage
   */
  private saveToStorage() {
    if (!this.storageKey) return;

    const columnIds = Array.from(this.visibleColumnIds());
    localStorage.setItem(this.storageKey, JSON.stringify(columnIds));
  }

  /**
   * Mostrar todas las columnas
   */
  private showAllColumns() {
    const allIds = this.columns.map(col => col.id);
    this.visibleColumnIds.set(new Set(allIds));
  }

  /**
   * Toggle menú
   */
  toggleMenu() {
    this.isMenuOpen.set(!this.isMenuOpen());
  }

  /**
   * Cerrar menú
   */
  closeMenu() {
    this.isMenuOpen.set(false);
  }

  /**
   * Toggle visibilidad de una columna
   */
  toggleColumnVisibility(columnId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const visible = new Set(this.visibleColumnIds());

    if (visible.has(columnId)) {
      visible.delete(columnId);
    } else {
      visible.add(columnId);
    }

    this.visibleColumnIds.set(visible);
    this.saveToStorage();
  }

  /**
   * Verificar si una columna es visible
   */
  isColumnVisible(columnId: string): boolean {
    return this.visibleColumnIds().has(columnId);
  }

  /**
   * Resetear a valores por defecto (todas visibles)
   */
  resetToDefault() {
    this.showAllColumns();
    this.saveToStorage();
  }

  /**
   * Obtener clases del tema
   */
  getThemeClasses(): string {
    const themes: Record<string, string> = {
      purple: 'theme-purple',
      green: 'theme-green',
      blue: 'theme-blue',
      amber: 'theme-amber'
    };
    return themes[this.themeColor] || 'theme-purple';
  }
}
