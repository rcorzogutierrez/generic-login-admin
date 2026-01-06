import { Timestamp } from 'firebase/firestore';
import { GenericEntity } from '../../../shared/models/generic-entity.interface';

/**
 * Interface para WorkPlan - Planificación de trabajo
 */
export interface WorkPlan extends GenericEntity {
  // Sistema
  id: string;
  createdAt: Timestamp | Date;
  createdBy: string;
  updatedAt?: Timestamp | Date;
  updatedBy?: string;
  isActive: boolean;

  // Datos principales de planificación
  planDate: Timestamp | Date;          // Fecha del plan

  // Trabajador asignado (opcional)
  workerId?: string;
  workerName?: string;                 // Desnormalizado para lista

  // Propuesta/Estimado asignado (opcional)
  proposalId?: string;
  proposalNumber?: string;             // Desnormalizado (ej: PROP-000001)
  proposalOwnerName?: string;          // Cliente del estimado

  // Duración
  durationDays: number;                // Días de duración
  durationHours: number;               // Horas de duración

  // Información adicional
  description?: string;                // Descripción del trabajo
  notes?: string;                      // Notas adicionales
  location?: string;                   // Ubicación del trabajo

  // Estado
  status: WorkPlanStatus;

  // Color para visualización (opcional)
  color?: string;
}

/**
 * Estados posibles de un plan de trabajo
 */
export type WorkPlanStatus =
  | 'scheduled'      // Planificado
  | 'in_progress'    // En progreso
  | 'completed'      // Completado
  | 'cancelled';     // Cancelado

/**
 * Interface para crear un nuevo WorkPlan
 */
export interface CreateWorkPlanData {
  planDate: Date;
  workerId?: string;
  workerName?: string;
  proposalId?: string;
  proposalNumber?: string;
  proposalOwnerName?: string;
  durationDays: number;
  durationHours: number;
  description?: string;
  notes?: string;
  location?: string;
  status?: WorkPlanStatus;
  color?: string;
}

/**
 * Interface para actualizar un WorkPlan existente
 */
export interface UpdateWorkPlanData {
  planDate?: Date;
  workerId?: string;
  workerName?: string;
  proposalId?: string;
  proposalNumber?: string;
  proposalOwnerName?: string;
  durationDays?: number;
  durationHours?: number;
  description?: string;
  notes?: string;
  location?: string;
  status?: WorkPlanStatus;
  color?: string;
}

/**
 * Interface para filtros de WorkPlan
 */
export interface WorkPlanFilters {
  workerId?: string;
  proposalId?: string;
  status?: WorkPlanStatus;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

/**
 * Interface para estadísticas de WorkPlan
 */
export interface WorkPlanStats {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  totalDays: number;
  totalHours: number;
}

/**
 * Interface para vista de calendario
 */
export interface WorkPlanCalendarView {
  date: Date;
  plans: WorkPlan[];
  totalPlans: number;
  totalDuration: string;
}
