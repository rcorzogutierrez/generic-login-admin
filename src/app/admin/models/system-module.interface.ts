// src/app/admin/models/system-module.interface.ts
export interface SystemModule {
    id: string;
    value: string; // Identificador único (ej: 'user-management')
    label: string; // Nombre visible (ej: 'Gestión de Usuarios')
    description: string;
    icon: string; // Material icon name
    route?: string; // Ruta asociada (opcional)
    isActive: boolean; // Para habilitar/deshabilitar sin borrar
    order: number; // Para ordenar en listas
    
    // Metadata
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
    
    // Estadísticas (opcional)
    usersCount?: number; // Cuántos usuarios lo tienen asignado
  }
  
  export interface ModuleFormData {
    value: string;
    label: string;
    description: string;
    icon: string;
    route?: string;
    isActive: boolean;
  }