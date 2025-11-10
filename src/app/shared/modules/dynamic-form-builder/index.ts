// src/app/shared/modules/dynamic-form-builder/index.ts

/**
 * Barrel export para el módulo de form builder dinámico
 * Exporta todos los modelos, servicios y componentes necesarios
 * para crear form builders reutilizables en cualquier módulo
 */

// Export all models
export * from './models';

// Export all services
export * from './services';

// Export utilities
export * from './utils';

// Export components
export { FormDesignerComponent } from './components/form-designer/form-designer.component';
export { FieldConfigDialogComponent, FieldConfigDialogData } from './components/field-config-dialog/field-config-dialog.component';
