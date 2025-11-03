/**
 * Interface base para cualquier entidad que se almacene en Firestore
 */
export interface GenericEntity {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  isActive?: boolean;
  [key: string]: any; // Permite propiedades dinámicas
}

/**
 * Configuración de campo para mostrar en diálogos y grids
 */
export interface GenericFieldConfig {
  name: string;           // Nombre del campo (key en el objeto)
  label: string;          // Label para mostrar
  type?: 'text' | 'number' | 'date' | 'datetime' | 'checkbox' | 'currency' | 'select' | 'multiselect' | 'dictionary' | 'email' | 'phone';
  options?: Array<{ value: any; label: string }>; // Para select/multiselect/dictionary
  showInGrid?: boolean;   // Mostrar en lista/grid
  showInDelete?: boolean; // Mostrar en diálogo de eliminación
  isDefault?: boolean;    // Es campo por defecto (name, email, etc.)
  format?: (value: any) => string; // Función de formateo personalizada
}

/**
 * Configuración de módulo para componentes genéricos
 */
export interface GenericModuleConfig {
  collection: string;                    // Nombre de la colección en Firestore
  entityName: string;                    // Nombre singular (ej: 'Cliente', 'Producto')
  entityNamePlural: string;              // Nombre plural (ej: 'Clientes', 'Productos')
  fields: GenericFieldConfig[];          // Configuración de campos
  deleteDialogFieldsCount?: number;      // Cuántos campos mostrar en diálogo de eliminación (default: 3)
  searchFields?: string[];               // Campos en los que buscar (default: todos los showInGrid)
  defaultSort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  itemsPerPage?: number;                 // Items por página (default: 25)
}

/**
 * Datos para diálogo de eliminación individual
 */
export interface GenericDeleteDialogData<T extends GenericEntity = GenericEntity> {
  entity: T;
  config: GenericModuleConfig;
}

/**
 * Datos para diálogo de eliminación múltiple
 */
export interface GenericDeleteMultipleDialogData<T extends GenericEntity = GenericEntity> {
  entities: T[];
  count: number;
  config: GenericModuleConfig;
}
