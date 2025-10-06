// src/app/admin/services/admin-logs.service.ts
import { Injectable } from '@angular/core';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp
} from 'firebase/firestore';
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
  // Campos adicionales parseados
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

@Injectable({
  providedIn: 'root'
})
export class AdminLogsService {
  private db = getFirestore();
  private logsSubject = new BehaviorSubject<AdminLog[]>([]);
  public logs$ = this.logsSubject.asObservable();

  private readonly LOGS_PER_PAGE = 15;

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
      
      // Construir query base con ordenamiento
      let q = query(
        logsRef,
        orderBy('timestamp', 'desc'),
        limit(pageSize + 1) // +1 para saber si hay más páginas
      );

      // Aplicar filtros
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

      // Paginación: continuar desde el último documento
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      // Ejecutar query
      const querySnapshot = await getDocs(q);
      
      // Verificar si hay más resultados
      const hasMore = querySnapshot.docs.length > pageSize;
      
      // Tomar solo los documentos necesarios
      const docs = querySnapshot.docs.slice(0, pageSize);
      
      // Mapear a objetos AdminLog
      const logs: AdminLog[] = docs.map(doc => this.mapDocToLog(doc));

      // Filtrar por término de búsqueda en cliente (si existe)
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
   * Obtiene estadísticas de logs
   */
  async getLogsStats(filters?: LogsFilter): Promise<{
    total: number;
    byAction: { [key: string]: number };
    byUser: { [key: string]: number };
  }> {
    try {
      const logsRef = collection(this.db, 'admin_logs');
      let q = query(logsRef, orderBy('timestamp', 'desc'), limit(500));

      if (filters?.action && filters.action !== 'all') {
        q = query(q, where('action', '==', filters.action));
      }

      const querySnapshot = await getDocs(q);
      
      const stats = {
        total: querySnapshot.size,
        byAction: {} as { [key: string]: number },
        byUser: {} as { [key: string]: number }
      };

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const action = data['action'];
        const user = data['performedByEmail'];

        // Contar por acción
        if (action) {
          stats.byAction[action] = (stats.byAction[action] || 0) + 1;
        }

        // Contar por usuario
        if (user) {
          stats.byUser[user] = (stats.byUser[user] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return { total: 0, byAction: {}, byUser: {} };
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