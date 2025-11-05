// src/app/admin/services/admin-logs.service.ts - CON FUNCIONALIDAD DE ELIMINACIÓN
import { Injectable } from '@angular/core';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  doc,
  writeBatch,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import {
  getDocsWithLogging as getDocs,
  deleteDocWithLogging as deleteDoc
} from '../../shared/utils/firebase-logger.utils';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AdminLog {
  id: string;
  action: string;
  targetUserId: string;
  performedBy: string;
  performedByEmail: string;
  timestamp: Date;
  details: string;
  ip: string;
  detailsObject?: any;
}

export interface LogsPage {
  logs: AdminLog[];
  hasMore: boolean;
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  totalCount?: number;
}

export interface LogsFilter {
  action?: string;
  performedBy?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

export interface DeleteLogsResult {
  success: boolean;
  message: string;
  deletedCount: number;
  errors?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminLogsService {
  private db = getFirestore();
  private logsSubject = new BehaviorSubject<AdminLog[]>([]);
  public logs$ = this.logsSubject.asObservable();

  private readonly LOGS_PER_PAGE = 15;
  private readonly BATCH_SIZE = 500; // Firestore batch limit

  constructor() {}

  /**
   * Obtiene logs con paginación del lado del servidor
   */
  async getLogsPaginated(
    pageSize: number = this.LOGS_PER_PAGE,
    filters?: LogsFilter,
    lastDoc?: QueryDocumentSnapshot<DocumentData> | null
  ): Promise<LogsPage> {
    try {
      const logsRef = collection(this.db, 'admin_logs');
      
      let q = query(
        logsRef,
        orderBy('timestamp', 'desc'),
        limit(pageSize + 1)
      );

      if (filters?.action && filters.action !== 'all') {
        q = query(q, where('action', '==', filters.action));
      }

      if (filters?.performedBy) {
        q = query(q, where('performedBy', '==', filters.performedBy));
      }

      if (filters?.startDate) {
        q = query(q, where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
      }

      if (filters?.endDate) {
        q = query(q, where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
      }

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      
      const hasMore = querySnapshot.docs.length > pageSize;
      const docs = querySnapshot.docs.slice(0, pageSize);
      const logs: AdminLog[] = docs.map(doc => this.mapDocToLog(doc));

      let filteredLogs = logs;
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filteredLogs = logs.filter(log => 
          log.performedByEmail.toLowerCase().includes(term) ||
          log.action.toLowerCase().includes(term) ||
          log.targetUserId.toLowerCase().includes(term)
        );
      }

      return {
        logs: filteredLogs,
        hasMore,
        lastDoc: docs.length > 0 ? docs[docs.length - 1] : null
      };

    } catch (error) {
      console.error('❌ Error obteniendo logs paginados:', error);
      throw error;
    }
  }

  /**
   * NUEVO: Cuenta el total de logs en la base de datos
   */
  async getTotalLogsCount(filters?: LogsFilter): Promise<number> {
    try {
      const logsRef = collection(this.db, 'admin_logs');
      let q = query(logsRef);

      if (filters?.action && filters.action !== 'all') {
        q = query(q, where('action', '==', filters.action));
      }

      if (filters?.startDate) {
        q = query(q, where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
      }

      if (filters?.endDate) {
        q = query(q, where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('❌ Error contando logs:', error);
      return 0;
    }
  }

  /**
   * NUEVO: Elimina TODOS los logs del sistema
   */
  async deleteAllLogs(): Promise<DeleteLogsResult> {
    try {
      console.log('🗑️ Iniciando eliminación de TODOS los logs...');

      const logsRef = collection(this.db, 'admin_logs');
      const q = query(logsRef);
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return {
          success: true,
          message: 'No hay logs para eliminar',
          deletedCount: 0
        };
      }

      const totalLogs = querySnapshot.size;
      console.log(`📊 Total de logs a eliminar: ${totalLogs}`);

      let deletedCount = 0;
      const errors: string[] = [];

      // Eliminar en lotes (Firestore permite max 500 operaciones por batch)
      const batches = Math.ceil(totalLogs / this.BATCH_SIZE);

      for (let i = 0; i < batches; i++) {
        const batch = writeBatch(this.db);
        const startIndex = i * this.BATCH_SIZE;
        const endIndex = Math.min(startIndex + this.BATCH_SIZE, totalLogs);
        const docsToDelete = querySnapshot.docs.slice(startIndex, endIndex);

        docsToDelete.forEach(docSnapshot => {
          batch.delete(docSnapshot.ref);
        });

        try {
          await batch.commit();
          deletedCount += docsToDelete.length;
          console.log(`✅ Batch ${i + 1}/${batches} completado: ${docsToDelete.length} logs eliminados`);
        } catch (error: any) {
          console.error(`❌ Error en batch ${i + 1}:`, error);
          errors.push(`Batch ${i + 1}: ${error.message}`);
        }
      }

      const result: DeleteLogsResult = {
        success: deletedCount > 0,
        message: `${deletedCount} log(s) eliminado(s) exitosamente de ${totalLogs} totales`,
        deletedCount
      };

      if (errors.length > 0) {
        result.errors = errors;
        result.message += ` (con ${errors.length} error(es))`;
      }

      console.log('✅ Eliminación completada:', result);
      return result;

    } catch (error: any) {
      console.error('❌ Error eliminando todos los logs:', error);
      return {
        success: false,
        message: `Error: ${error.message}`,
        deletedCount: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * NUEVO: Elimina logs más antiguos que X días
   */
  async deleteLogsOlderThan(days: number): Promise<DeleteLogsResult> {
    try {
      console.log(`🗑️ Eliminando logs con más de ${days} días...`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const logsRef = collection(this.db, 'admin_logs');
      const q = query(
        logsRef,
        where('timestamp', '<', Timestamp.fromDate(cutoffDate))
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return {
          success: true,
          message: `No hay logs con más de ${days} días`,
          deletedCount: 0
        };
      }

      const totalLogs = querySnapshot.size;
      console.log(`📊 Logs a eliminar (>${days} días): ${totalLogs}`);

      let deletedCount = 0;
      const errors: string[] = [];

      const batches = Math.ceil(totalLogs / this.BATCH_SIZE);

      for (let i = 0; i < batches; i++) {
        const batch = writeBatch(this.db);
        const startIndex = i * this.BATCH_SIZE;
        const endIndex = Math.min(startIndex + this.BATCH_SIZE, totalLogs);
        const docsToDelete = querySnapshot.docs.slice(startIndex, endIndex);

        docsToDelete.forEach(docSnapshot => {
          batch.delete(docSnapshot.ref);
        });

        try {
          await batch.commit();
          deletedCount += docsToDelete.length;
          console.log(`✅ Batch ${i + 1}/${batches} completado`);
        } catch (error: any) {
          console.error(`❌ Error en batch ${i + 1}:`, error);
          errors.push(`Batch ${i + 1}: ${error.message}`);
        }
      }

      const result: DeleteLogsResult = {
        success: deletedCount > 0,
        message: `${deletedCount} log(s) eliminado(s) (más de ${days} días)`,
        deletedCount
      };

      if (errors.length > 0) {
        result.errors = errors;
        result.message += ` (con ${errors.length} error(es))`;
      }

      return result;

    } catch (error: any) {
      console.error('❌ Error eliminando logs antiguos:', error);
      return {
        success: false,
        message: `Error: ${error.message}`,
        deletedCount: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * NUEVO: Elimina logs por filtros específicos
   */
  async deleteLogsByFilter(filters: LogsFilter): Promise<DeleteLogsResult> {
    try {
      console.log('🗑️ Eliminando logs por filtros:', filters);

      const logsRef = collection(this.db, 'admin_logs');
      let q = query(logsRef);

      if (filters.action && filters.action !== 'all') {
        q = query(q, where('action', '==', filters.action));
      }

      if (filters.performedBy) {
        q = query(q, where('performedBy', '==', filters.performedBy));
      }

      if (filters.startDate) {
        q = query(q, where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
      }

      if (filters.endDate) {
        q = query(q, where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
      }

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return {
          success: true,
          message: 'No hay logs que coincidan con los filtros',
          deletedCount: 0
        };
      }

      const totalLogs = querySnapshot.size;
      console.log(`📊 Logs que coinciden con filtros: ${totalLogs}`);

      let deletedCount = 0;
      const errors: string[] = [];

      const batches = Math.ceil(totalLogs / this.BATCH_SIZE);

      for (let i = 0; i < batches; i++) {
        const batch = writeBatch(this.db);
        const startIndex = i * this.BATCH_SIZE;
        const endIndex = Math.min(startIndex + this.BATCH_SIZE, totalLogs);
        const docsToDelete = querySnapshot.docs.slice(startIndex, endIndex);

        docsToDelete.forEach(docSnapshot => {
          batch.delete(docSnapshot.ref);
        });

        try {
          await batch.commit();
          deletedCount += docsToDelete.length;
        } catch (error: any) {
          errors.push(`Batch ${i + 1}: ${error.message}`);
        }
      }

      const result: DeleteLogsResult = {
        success: deletedCount > 0,
        message: `${deletedCount} log(s) eliminado(s) según filtros`,
        deletedCount
      };

      if (errors.length > 0) {
        result.errors = errors;
        result.message += ` (con ${errors.length} error(es))`;
      }

      return result;

    } catch (error: any) {
      console.error('❌ Error eliminando logs por filtros:', error);
      return {
        success: false,
        message: `Error: ${error.message}`,
        deletedCount: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Obtiene acciones únicas para el filtro
   */
  async getUniqueActions(): Promise<string[]> {
    try {
      const logsRef = collection(this.db, 'admin_logs');
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(100));
      const querySnapshot = await getDocs(q);

      const actions = new Set<string>();
      querySnapshot.forEach(doc => {
        const action = doc.data()['action'];
        if (action) {
          actions.add(action);
        }
      });

      return Array.from(actions).sort();
    } catch (error) {
      console.error('❌ Error obteniendo acciones únicas:', error);
      return [];
    }
  }

  /**
   * Exporta logs a JSON
   */
  async exportLogs(filters?: LogsFilter): Promise<AdminLog[]> {
    try {
      const logsRef = collection(this.db, 'admin_logs');
      let q = query(logsRef, orderBy('timestamp', 'desc'), limit(1000));

      if (filters?.action && filters.action !== 'all') {
        q = query(q, where('action', '==', filters.action));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.mapDocToLog(doc));
    } catch (error) {
      console.error('❌ Error exportando logs:', error);
      throw error;
    }
  }

  /**
   * Mapea documento de Firestore a AdminLog
   */
  private mapDocToLog(doc: QueryDocumentSnapshot<DocumentData>): AdminLog {
    const data = doc.data();
    
    let detailsObject;
    try {
      detailsObject = typeof data['details'] === 'string' 
        ? JSON.parse(data['details']) 
        : data['details'];
    } catch {
      detailsObject = {};
    }

    return {
      id: doc.id,
      action: data['action'] || '',
      targetUserId: data['targetUserId'] || '',
      performedBy: data['performedBy'] || '',
      performedByEmail: data['performedByEmail'] || '',
      timestamp: data['timestamp']?.toDate() || new Date(),
      details: data['details'] || '',
      ip: data['ip'] || 'unknown',
      detailsObject
    };
  }

  /**
   * Formatea el nombre de la acción para display
   */
  formatActionName(action: string): string {
    if (!action) return '';
    
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Obtiene el icono según la acción
   */
  getActionIcon(action: string): string {
    if (action.includes('success') || action.includes('login')) return 'check_circle';
    if (action.includes('failed') || action.includes('error')) return 'cancel';
    if (action.includes('delete')) return 'delete_forever';
    if (action.includes('update')) return 'edit';
    if (action.includes('create') || action.includes('add') || action.includes('pre_authorize')) return 'person_add';
    if (action.includes('export')) return 'download';
    if (action.includes('password')) return 'lock_reset';
    return 'history';
  }

  /**
   * Obtiene la clase CSS para el badge de acción
   */
  getActionBadgeClass(action: string): string {
    if (action.includes('success') || action.includes('login')) return 'badge-success';
    if (action.includes('failed') || action.includes('error')) return 'badge-error';
    if (action.includes('delete')) return 'badge-warning';
    if (action.includes('update')) return 'badge-info';
    return 'badge-default';
  }
}