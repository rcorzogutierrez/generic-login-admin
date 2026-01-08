import { Injectable } from '@angular/core';

interface WorkPlanningModuleConfig {
  moduleName: string;
  entityName: string;
  entityNamePlural: string;
  collectionName: string;
  primaryField: string;
  deleteConfirmationField: string;
  featureName: string;
  icon: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    showInGrid?: boolean;
    showInDelete?: boolean;
    isDefault?: boolean;
  }>;
  deleteDialogFieldsCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class WorkPlansConfigService {
  /**
   * Configuración del módulo de planificación de trabajo
   */
  getModuleConfig(): WorkPlanningModuleConfig {
    return {
      moduleName: 'work-planning',
      entityName: 'plan de trabajo',
      entityNamePlural: 'planes de trabajo',
      collectionName: 'workPlans',
      primaryField: 'description',
      deleteConfirmationField: 'description',
      featureName: 'Planificación de Trabajo',
      icon: 'event_note',
      fields: [
        {
          name: 'description',
          label: 'Descripción',
          type: 'text',
          showInGrid: true,
          showInDelete: true,
          isDefault: true
        },
        {
          name: 'workerName',
          label: 'Trabajador',
          type: 'text',
          showInGrid: true,
          showInDelete: true
        },
        {
          name: 'proposalNumber',
          label: 'Propuesta',
          type: 'text',
          showInGrid: true,
          showInDelete: true
        },
        {
          name: 'status',
          label: 'Estado',
          type: 'text',
          showInGrid: true,
          showInDelete: true
        }
      ],
      deleteDialogFieldsCount: 3
    };
  }

  /**
   * Colores predefinidos para planificaciones
   */
  getAvailableColors(): { value: string; label: string; class: string }[] {
    return [
      { value: '#3b82f6', label: 'Azul', class: 'bg-blue-500' },
      { value: '#8b5cf6', label: 'Púrpura', class: 'bg-purple-500' },
      { value: '#10b981', label: 'Verde', class: 'bg-green-500' },
      { value: '#f59e0b', label: 'Ámbar', class: 'bg-amber-500' },
      { value: '#ef4444', label: 'Rojo', class: 'bg-red-500' },
      { value: '#06b6d4', label: 'Cian', class: 'bg-cyan-500' },
      { value: '#ec4899', label: 'Rosa', class: 'bg-pink-500' },
      { value: '#64748b', label: 'Gris', class: 'bg-slate-500' }
    ];
  }

  /**
   * Obtener etiqueta de estado en español
   */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      scheduled: 'Planificado',
      in_progress: 'En Progreso',
      completed: 'Completado',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  }

  /**
   * Obtener color de badge para cada estado
   */
  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      scheduled: 'badge-blue',
      in_progress: 'badge-amber',
      completed: 'badge-green',
      cancelled: 'badge-slate'
    };
    return classes[status] || 'badge-slate';
  }

  /**
   * Obtener icono para cada estado
   */
  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      scheduled: 'schedule',
      in_progress: 'play_circle',
      completed: 'check_circle',
      cancelled: 'cancel'
    };
    return icons[status] || 'event';
  }
}
