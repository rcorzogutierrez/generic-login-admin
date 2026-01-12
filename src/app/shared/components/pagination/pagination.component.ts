// src/app/shared/components/pagination/pagination.component.ts
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginationComponent {
  // Paginación básica
  @Input() currentPage: number = 0; // Para client-side (0-indexed) o 1 para server-side
  @Input() itemsPerPage: number = 10;
  @Input() pageSizeOptions: number[] = [10, 20, 50, 100];

  // Para client-side pagination
  @Input() totalPages?: number;
  @Input() totalItems?: number;

  // Para server-side pagination
  @Input() hasMore?: boolean;
  @Input() isLoading?: boolean;

  // Tema de color
  @Input() themeColor: 'purple' | 'green' | 'blue' | 'amber' = 'blue';

  // Modo: 'client' o 'server'
  @Input() mode: 'client' | 'server' = 'client';

  // Eventos
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  /**
   * Obtener el rango de registros mostrados (solo para modo client)
   */
  getDisplayRange(): string {
    if (!this.totalItems) return '';

    const start = (this.currentPage * this.itemsPerPage) + 1;
    const end = Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalItems);

    return `Mostrando ${start} a ${end} de ${this.totalItems}`;
  }

  /**
   * Obtener información de página para modo server
   */
  getServerPageInfo(): string {
    if (this.mode === 'server') {
      return `Página ${this.currentPage} · ${this.totalItems || 0} registros`;
    }
    return '';
  }

  /**
   * Cambiar tamaño de página
   */
  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = parseInt(select.value, 10);
    this.pageSizeChange.emit(newSize);
  }

  /**
   * Ir a página anterior
   */
  goToPreviousPage(): void {
    if (!this.canGoPrevious()) return;

    if (this.mode === 'client') {
      this.pageChange.emit(this.currentPage - 1);
    } else {
      // Para server-side, el componente padre maneja la lógica
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  /**
   * Ir a página siguiente
   */
  goToNextPage(): void {
    if (!this.canGoNext()) return;

    if (this.mode === 'client') {
      this.pageChange.emit(this.currentPage + 1);
    } else {
      // Para server-side, el componente padre maneja la lógica
      this.pageChange.emit(this.currentPage + 1);
    }
  }

  /**
   * Verificar si se puede ir a la página anterior
   */
  canGoPrevious(): boolean {
    if (this.isLoading) return false;
    return this.mode === 'client' ? this.currentPage > 0 : this.currentPage > 1;
  }

  /**
   * Verificar si se puede ir a la página siguiente
   */
  canGoNext(): boolean {
    if (this.isLoading) return false;

    if (this.mode === 'client') {
      return this.totalPages ? this.currentPage < this.totalPages - 1 : false;
    } else {
      return this.hasMore || false;
    }
  }

  /**
   * Obtener información de página actual
   */
  getCurrentPageDisplay(): string {
    if (this.isLoading) {
      return 'Cargando...';
    }

    if (this.mode === 'client' && this.totalPages) {
      return `${this.currentPage + 1} / ${this.totalPages}`;
    } else {
      return `Pág. ${this.currentPage}`;
    }
  }

  /**
   * Obtener clases de tema para el select
   */
  getThemeRingClass(): string {
    const themeMap: Record<string, string> = {
      purple: 'focus:ring-purple-500',
      green: 'focus:ring-green-500',
      blue: 'focus:ring-blue-500',
      amber: 'focus:ring-amber-500'
    };
    return themeMap[this.themeColor] || themeMap.blue;
  }

  /**
   * Obtener clase de color para el texto de carga
   */
  getLoadingTextClass(): string {
    const themeMap: Record<string, string> = {
      purple: 'text-purple-600',
      green: 'text-green-600',
      blue: 'text-blue-600',
      amber: 'text-amber-600'
    };
    return themeMap[this.themeColor] || themeMap.blue;
  }
}
