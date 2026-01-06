import { Injectable, inject, signal, computed } from '@angular/core';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { AuthService } from '../../../core/services/auth.service';
import {
  WorkPlan,
  CreateWorkPlanData,
  UpdateWorkPlanData,
  WorkPlanFilters,
  WorkPlanStats,
  WorkPlanCalendarView,
  WorkPlanStatus
} from '../models';
import { OperationResult } from '../../../shared/models/operation-result.interface';

@Injectable({
  providedIn: 'root'
})
export class WorkPlansService {
  private db = getFirestore();
  private authService = inject(AuthService);

  // Signals reactivos
  workPlans = signal<WorkPlan[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Computed signals
  stats = computed<WorkPlanStats>(() => {
    const plans = this.workPlans();
    return {
      total: plans.length,
      scheduled: plans.filter(p => p.status === 'scheduled').length,
      inProgress: plans.filter(p => p.status === 'in_progress').length,
      completed: plans.filter(p => p.status === 'completed').length,
      cancelled: plans.filter(p => p.status === 'cancelled').length,
      totalDays: plans.reduce((sum, p) => sum + p.durationDays, 0),
      totalHours: plans.reduce((sum, p) => sum + p.durationHours, 0)
    };
  });

  activePlans = computed(() =>
    this.workPlans().filter(p => p.isActive && p.status !== 'cancelled')
  );

  scheduledPlans = computed(() =>
    this.workPlans().filter(p => p.isActive && p.status === 'scheduled')
  );

  inProgressPlans = computed(() =>
    this.workPlans().filter(p => p.isActive && p.status === 'in_progress')
  );

  completedPlans = computed(() =>
    this.workPlans().filter(p => p.isActive && p.status === 'completed')
  );

  private readonly COLLECTION_NAME = 'workPlans';

  /**
   * Obtener la colección de planes de trabajo
   */
  private getCollection() {
    return collection(this.db, this.COLLECTION_NAME);
  }

  /**
   * Cargar todos los planes de trabajo
   */
  async loadWorkPlans(filters?: WorkPlanFilters): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const constraints: QueryConstraint[] = [
        where('isActive', '==', true),
        orderBy('planDate', 'desc')
      ];

      // Aplicar filtros
      if (filters?.workerId) {
        constraints.push(where('workerId', '==', filters.workerId));
      }
      if (filters?.proposalId) {
        constraints.push(where('proposalId', '==', filters.proposalId));
      }
      if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
      }

      const q = query(this.getCollection(), ...constraints);
      const querySnapshot = await getDocs(q);

      let plans: WorkPlan[] = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as WorkPlan));

      // Filtros adicionales en memoria (para rangos de fecha)
      if (filters?.startDate) {
        plans = plans.filter(p => {
          const planDate = p.planDate instanceof Timestamp
            ? p.planDate.toDate()
            : new Date(p.planDate);
          return planDate >= filters.startDate!;
        });
      }

      if (filters?.endDate) {
        plans = plans.filter(p => {
          const planDate = p.planDate instanceof Timestamp
            ? p.planDate.toDate()
            : new Date(p.planDate);
          return planDate <= filters.endDate!;
        });
      }

      // Filtro de búsqueda por texto
      if (filters?.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        plans = plans.filter(p =>
          p.workerName?.toLowerCase().includes(searchLower) ||
          p.proposalNumber?.toLowerCase().includes(searchLower) ||
          p.proposalOwnerName?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.location?.toLowerCase().includes(searchLower)
        );
      }

      this.workPlans.set(plans);
    } catch (error: any) {
      console.error('Error loading work plans:', error);
      this.error.set(error.message || 'Error al cargar planes de trabajo');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Obtener un plan de trabajo por ID
   */
  async getWorkPlanById(id: string): Promise<OperationResult<WorkPlan>> {
    try {
      const docRef = doc(this.db, this.COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return {
          success: false,
          message: 'Plan de trabajo no encontrado'
        };
      }

      const workPlan: WorkPlan = {
        id: docSnap.id,
        ...docSnap.data()
      } as WorkPlan;

      return {
        success: true,
        message: 'Plan de trabajo obtenido exitosamente',
        data: workPlan
      };
    } catch (error: any) {
      console.error('Error getting work plan:', error);
      return {
        success: false,
        message: error.message || 'Error al obtener plan de trabajo'
      };
    }
  }

  /**
   * Crear un nuevo plan de trabajo
   */
  async createWorkPlan(data: CreateWorkPlanData): Promise<OperationResult<WorkPlan>> {
    try {
      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        return {
          success: false,
          message: 'Usuario no autenticado'
        };
      }

      const newWorkPlan = {
        planDate: Timestamp.fromDate(data.planDate),
        workerId: data.workerId,
        workerName: data.workerName,
        proposalId: data.proposalId,
        proposalNumber: data.proposalNumber,
        proposalOwnerName: data.proposalOwnerName,
        durationDays: data.durationDays,
        durationHours: data.durationHours,
        description: data.description,
        notes: data.notes,
        location: data.location,
        status: data.status || 'scheduled' as WorkPlanStatus,
        color: data.color,
        createdAt: Timestamp.now(),
        createdBy: currentUser.uid,
        isActive: true
      };

      const docRef = await addDoc(this.getCollection(), newWorkPlan);

      const createdPlan: WorkPlan = {
        id: docRef.id,
        ...newWorkPlan
      } as WorkPlan;

      // Actualizar signal
      this.workPlans.update(plans => [...plans, createdPlan]);

      return {
        success: true,
        message: 'Plan de trabajo creado exitosamente',
        data: createdPlan
      };
    } catch (error: any) {
      console.error('Error creating work plan:', error);
      return {
        success: false,
        message: error.message || 'Error al crear plan de trabajo'
      };
    }
  }

  /**
   * Actualizar un plan de trabajo existente
   */
  async updateWorkPlan(
    id: string,
    data: UpdateWorkPlanData
  ): Promise<OperationResult<WorkPlan>> {
    try {
      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        return {
          success: false,
          message: 'Usuario no autenticado'
        };
      }

      const docRef = doc(this.db, this.COLLECTION_NAME, id);

      const updateData: any = {
        ...data,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.uid
      };

      // Convertir fecha si existe
      if (data.planDate) {
        updateData.planDate = Timestamp.fromDate(data.planDate);
      }

      await updateDoc(docRef, updateData);

      // Obtener el plan actualizado
      const result = await this.getWorkPlanById(id);
      if (!result.success || !result.data) {
        return result;
      }

      // Actualizar signal
      this.workPlans.update(plans =>
        plans.map(p => p.id === id ? result.data! : p)
      );

      return {
        success: true,
        message: 'Plan de trabajo actualizado exitosamente',
        data: result.data
      };
    } catch (error: any) {
      console.error('Error updating work plan:', error);
      return {
        success: false,
        message: error.message || 'Error al actualizar plan de trabajo'
      };
    }
  }

  /**
   * Eliminar un plan de trabajo (soft delete)
   */
  async deleteWorkPlan(id: string): Promise<OperationResult<void>> {
    try {
      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        return {
          success: false,
          message: 'Usuario no autenticado'
        };
      }

      const docRef = doc(this.db, this.COLLECTION_NAME, id);

      await updateDoc(docRef, {
        isActive: false,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.uid
      });

      // Actualizar signal
      this.workPlans.update(plans => plans.filter(p => p.id !== id));

      return {
        success: true,
        message: 'Plan de trabajo eliminado exitosamente'
      };
    } catch (error: any) {
      console.error('Error deleting work plan:', error);
      return {
        success: false,
        message: error.message || 'Error al eliminar plan de trabajo'
      };
    }
  }

  /**
   * Eliminar múltiples planes de trabajo
   */
  async deleteMultipleWorkPlans(ids: string[]): Promise<OperationResult<void>> {
    try {
      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        return {
          success: false,
          message: 'Usuario no autenticado'
        };
      }

      const updateData = {
        isActive: false,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.uid
      };

      await Promise.all(
        ids.map(id => {
          const docRef = doc(this.db, this.COLLECTION_NAME, id);
          return updateDoc(docRef, updateData);
        })
      );

      // Actualizar signal
      this.workPlans.update(plans =>
        plans.filter(p => !ids.includes(p.id))
      );

      return {
        success: true,
        message: `${ids.length} plan(es) de trabajo eliminado(s) exitosamente`
      };
    } catch (error: any) {
      console.error('Error deleting multiple work plans:', error);
      return {
        success: false,
        message: error.message || 'Error al eliminar planes de trabajo'
      };
    }
  }

  /**
   * Cambiar estado de un plan de trabajo
   */
  async updateStatus(id: string, status: WorkPlanStatus): Promise<OperationResult<WorkPlan>> {
    return this.updateWorkPlan(id, { status });
  }

  /**
   * Obtener planes de trabajo por rango de fechas (para vista de calendario)
   */
  async getWorkPlansByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<WorkPlanCalendarView[]> {
    await this.loadWorkPlans({ startDate, endDate });

    const plans = this.workPlans();
    const calendarViews: Map<string, WorkPlanCalendarView> = new Map();

    plans.forEach(plan => {
      const planDate = plan.planDate instanceof Timestamp
        ? plan.planDate.toDate()
        : new Date(plan.planDate);

      const dateKey = planDate.toISOString().split('T')[0];

      if (!calendarViews.has(dateKey)) {
        calendarViews.set(dateKey, {
          date: planDate,
          plans: [],
          totalPlans: 0,
          totalDuration: '0d 0h'
        });
      }

      const view = calendarViews.get(dateKey)!;
      view.plans.push(plan);
      view.totalPlans++;

      const totalDays = view.plans.reduce((sum, p) => sum + p.durationDays, 0);
      const totalHours = view.plans.reduce((sum, p) => sum + p.durationHours, 0);
      view.totalDuration = `${totalDays}d ${totalHours}h`;
    });

    return Array.from(calendarViews.values()).sort((a, b) =>
      a.date.getTime() - b.date.getTime()
    );
  }

  /**
   * Obtener planes de trabajo de un trabajador específico
   */
  async getWorkPlansByWorker(workerId: string): Promise<WorkPlan[]> {
    await this.loadWorkPlans({ workerId });
    return this.workPlans();
  }

  /**
   * Obtener planes de trabajo de una propuesta específica
   */
  async getWorkPlansByProposal(proposalId: string): Promise<WorkPlan[]> {
    await this.loadWorkPlans({ proposalId });
    return this.workPlans();
  }
}
