import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { Timestamp } from 'firebase/firestore';

import { WorkPlansService } from '../../services/work-plans.service';
import { WorkPlansConfigService } from '../../services/work-plans-config.service';
import { WorkPlan, WorkPlanStatus, WorkPlanCalendarView } from '../../models';
import { WorkPlanFormComponent } from '../work-plan-form/work-plan-form.component';
import { GenericDeleteDialogComponent } from '../../../../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericDeleteMultipleDialogComponent } from '../../../../shared/components/generic-delete-multiple-dialog/generic-delete-multiple-dialog.component';

type ViewMode = 'calendar' | 'list' | 'timeline';

@Component({
  selector: 'app-work-plans-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    MatMenuModule,
    MatCheckboxModule,
    MatDividerModule
  ],
  templateUrl: './work-plans-list.component.html',
  styleUrl: './work-plans-list.component.css'
})
export class WorkPlansListComponent implements OnInit {
  private workPlansService = inject(WorkPlansService);
  private configService = inject(WorkPlansConfigService);
  private dialog = inject(MatDialog);

  // Signals
  viewMode = signal<ViewMode>('calendar');
  selectedDate = signal<Date>(new Date());
  filterStatus = signal<WorkPlanStatus | 'all'>('all');
  searchTerm = signal<string>('');
  selectedPlans = signal<Set<string>>(new Set());
  showFilters = signal<boolean>(false);
  dateRange = signal<{ start: Date; end: Date }>({
    start: this.getWeekStart(new Date()),
    end: this.getWeekEnd(new Date())
  });

  // Computed
  stats = this.workPlansService.stats;
  moduleConfig = this.configService.getModuleConfig();

  filteredPlans = computed(() => {
    let plans = this.workPlansService.workPlans();

    // Filtro por estado
    const status = this.filterStatus();
    if (status !== 'all') {
      plans = plans.filter(p => p.status === status);
    }

    // Filtro por búsqueda
    const search = this.searchTerm().toLowerCase();
    if (search) {
      plans = plans.filter(p =>
        p.workerName?.toLowerCase().includes(search) ||
        p.proposalNumber?.toLowerCase().includes(search) ||
        p.proposalOwnerName?.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search) ||
        p.location?.toLowerCase().includes(search)
      );
    }

    return plans;
  });

  calendarViews = signal<WorkPlanCalendarView[]>([]);
  weekDays = signal<Date[]>([]);

  hasSelectedPlans = computed(() => this.selectedPlans().size > 0);
  selectedCount = computed(() => this.selectedPlans().size);

  async ngOnInit() {
    await this.loadPlans();
    this.generateWeekDays();
  }

  /**
   * Cargar planes de trabajo
   */
  async loadPlans() {
    try {
      await this.workPlansService.loadWorkPlans();
      if (this.viewMode() === 'calendar') {
        await this.loadCalendarView();
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  }

  /**
   * Cargar vista de calendario
   */
  async loadCalendarView() {
    const range = this.dateRange();
    const views = await this.workPlansService.getWorkPlansByDateRange(
      range.start,
      range.end
    );
    this.calendarViews.set(views);
  }

  /**
   * Abrir diálogo para crear nuevo plan
   */
  openCreateDialog() {
    const dialogRef = this.dialog.open(WorkPlanFormComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPlans();
      }
    });
  }

  /**
   * Abrir diálogo para editar plan
   */
  openEditDialog(plan: WorkPlan) {
    const dialogRef = this.dialog.open(WorkPlanFormComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { mode: 'edit', plan }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPlans();
      }
    });
  }

  /**
   * Eliminar plan
   */
  async deletePlan(plan: WorkPlan) {
    const dialogRef = this.dialog.open(GenericDeleteDialogComponent, {
      data: {
        entity: plan,
        config: this.moduleConfig
      },
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        await this.workPlansService.deleteWorkPlan(plan.id);
        await this.loadPlans();
      }
    });
  }

  /**
   * Eliminar planes seleccionados
   */
  async deleteSelectedPlans() {
    const selectedIds = Array.from(this.selectedPlans());
    const selectedPlans = this.workPlansService.workPlans()
      .filter(p => selectedIds.includes(p.id));

    const dialogRef = this.dialog.open(GenericDeleteMultipleDialogComponent, {
      data: {
        entities: selectedPlans,
        config: this.moduleConfig
      },
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        await this.workPlansService.deleteMultipleWorkPlans(selectedIds);
        this.selectedPlans.set(new Set());
        await this.loadPlans();
      }
    });
  }

  /**
   * Cambiar modo de vista
   */
  setViewMode(mode: ViewMode) {
    this.viewMode.set(mode);
    if (mode === 'calendar') {
      this.loadCalendarView();
    }
  }

  /**
   * Cambiar filtro de estado
   */
  setFilterStatus(status: WorkPlanStatus | 'all') {
    this.filterStatus.set(status);
  }

  /**
   * Toggle selección de plan
   */
  togglePlanSelection(planId: string) {
    const selected = new Set(this.selectedPlans());
    if (selected.has(planId)) {
      selected.delete(planId);
    } else {
      selected.add(planId);
    }
    this.selectedPlans.set(selected);
  }

  /**
   * Seleccionar todos los planes
   */
  toggleSelectAll() {
    const plans = this.filteredPlans();
    if (this.selectedPlans().size === plans.length) {
      this.selectedPlans.set(new Set());
    } else {
      this.selectedPlans.set(new Set(plans.map(p => p.id)));
    }
  }

  /**
   * Limpiar selección
   */
  clearSelection() {
    this.selectedPlans.set(new Set());
  }

  /**
   * Cambiar estado de un plan
   */
  async updatePlanStatus(planId: string, status: WorkPlanStatus) {
    await this.workPlansService.updateStatus(planId, status);
    await this.loadPlans();
  }

  /**
   * Navegar a semana anterior
   */
  previousWeek() {
    const current = this.dateRange().start;
    const newStart = new Date(current);
    newStart.setDate(newStart.getDate() - 7);
    this.dateRange.set({
      start: this.getWeekStart(newStart),
      end: this.getWeekEnd(newStart)
    });
    this.generateWeekDays();
    this.loadCalendarView();
  }

  /**
   * Navegar a semana siguiente
   */
  nextWeek() {
    const current = this.dateRange().start;
    const newStart = new Date(current);
    newStart.setDate(newStart.getDate() + 7);
    this.dateRange.set({
      start: this.getWeekStart(newStart),
      end: this.getWeekEnd(newStart)
    });
    this.generateWeekDays();
    this.loadCalendarView();
  }

  /**
   * Ir a semana actual
   */
  goToToday() {
    const today = new Date();
    this.dateRange.set({
      start: this.getWeekStart(today),
      end: this.getWeekEnd(today)
    });
    this.generateWeekDays();
    this.loadCalendarView();
  }

  /**
   * Generar días de la semana
   */
  private generateWeekDays() {
    const days: Date[] = [];
    const start = new Date(this.dateRange().start);
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    this.weekDays.set(days);
  }

  /**
   * Obtener planes para una fecha específica
   */
  getPlansForDate(date: Date): WorkPlan[] {
    return this.filteredPlans().filter(plan => {
      const planDate = plan.planDate instanceof Timestamp
        ? plan.planDate.toDate()
        : new Date(plan.planDate);
      return this.isSameDay(planDate, date);
    });
  }

  /**
   * Verificar si dos fechas son el mismo día
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * Verificar si una fecha es hoy
   */
  isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }

  /**
   * Obtener inicio de semana (domingo)
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  /**
   * Obtener fin de semana (sábado)
   */
  private getWeekEnd(date: Date): Date {
    const start = this.getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  }

  /**
   * Formatear fecha
   */
  formatDate(date: Date | Timestamp): string {
    const d = date instanceof Timestamp ? date.toDate() : date;
    return d.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }

  /**
   * Formatear duración
   */
  formatDuration(plan: WorkPlan): string {
    const parts: string[] = [];
    if (plan.durationDays > 0) {
      parts.push(`${plan.durationDays}d`);
    }
    if (plan.durationHours > 0) {
      parts.push(`${plan.durationHours}h`);
    }
    return parts.join(' ') || '0h';
  }

  /**
   * Obtener clase de badge para estado
   */
  getStatusBadgeClass(status: WorkPlanStatus): string {
    return this.configService.getStatusBadgeClass(status);
  }

  /**
   * Obtener etiqueta de estado
   */
  getStatusLabel(status: WorkPlanStatus): string {
    return this.configService.getStatusLabel(status);
  }

  /**
   * Obtener icono de estado
   */
  getStatusIcon(status: WorkPlanStatus): string {
    return this.configService.getStatusIcon(status);
  }

  /**
   * Obtener nombre del día de la semana
   */
  getDayName(date: Date): string {
    return date.toLocaleDateString('es-ES', { weekday: 'long' });
  }

  /**
   * Obtener número de día
   */
  getDayNumber(date: Date): number {
    return date.getDate();
  }

  /**
   * Obtener nombre del mes
   */
  getMonthName(date: Date): string {
    return date.toLocaleDateString('es-ES', { month: 'short' });
  }
}
