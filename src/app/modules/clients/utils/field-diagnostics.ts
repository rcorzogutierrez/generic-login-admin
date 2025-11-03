// Utilidad para diagnosticar problemas con configuración de campos
import { FieldConfig } from '../models/field-config.interface';

export interface FieldDiagnostic {
  field: FieldConfig;
  issues: string[];
  warnings: string[];
  inForm: boolean;
  inGrid: boolean;
}

/**
 * Diagnostica problemas en la configuración de campos
 */
export function diagnoseFields(fields: FieldConfig[]): FieldDiagnostic[] {
  const diagnostics: FieldDiagnostic[] = [];

  fields.forEach(field => {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Determinar si aparece en formulario y grid
    const inForm = field.isActive;
    const inGrid = field.isActive && field.gridConfig.showInGrid;

    // PROBLEMA 1: Campo en grid pero no en formulario
    // (Esto no debería pasar según la lógica actual)
    if (inGrid && !inForm) {
      issues.push('Campo aparece en grid pero no en formulario (isActive debe ser true para grid)');
    }

    // PROBLEMA 2: Campo activo pero no configurado para aparecer en ningún lado
    if (field.isActive && !field.gridConfig.showInGrid) {
      warnings.push('Campo activo pero no visible en grid - solo en formulario');
    }

    // PROBLEMA 3: Campo con showInGrid=true pero isActive=false
    if (!field.isActive && field.gridConfig.showInGrid) {
      issues.push('Campo configurado para grid pero está inactivo');
    }

    // PROBLEMA 4: Campo sin formOrder definido
    if (field.formOrder === undefined || field.formOrder === null) {
      warnings.push('Campo sin orden de formulario definido');
    }

    // PROBLEMA 5: Campo sin gridOrder definido cuando showInGrid=true
    if (field.gridConfig.showInGrid && (field.gridConfig.gridOrder === undefined || field.gridConfig.gridOrder === null)) {
      warnings.push('Campo visible en grid pero sin orden definido');
    }

    // PROBLEMA 6: Campos con el mismo formOrder
    const sameFormOrder = fields.filter(f => f.formOrder === field.formOrder && f.id !== field.id);
    if (sameFormOrder.length > 0) {
      warnings.push(`Comparte formOrder ${field.formOrder} con: ${sameFormOrder.map(f => f.label).join(', ')}`);
    }

    // PROBLEMA 7: Campos con el mismo gridOrder
    if (field.gridConfig.showInGrid) {
      const sameGridOrder = fields.filter(
        f => f.gridConfig.showInGrid &&
        f.gridConfig.gridOrder === field.gridConfig.gridOrder &&
        f.id !== field.id
      );
      if (sameGridOrder.length > 0) {
        warnings.push(`Comparte gridOrder ${field.gridConfig.gridOrder} con: ${sameGridOrder.map(f => f.label).join(', ')}`);
      }
    }

    diagnostics.push({
      field,
      issues,
      warnings,
      inForm,
      inGrid
    });
  });

  return diagnostics;
}

/**
 * Imprime el reporte de diagnóstico en consola
 */
export function printDiagnosticReport(diagnostics: FieldDiagnostic[]): void {
  console.group('📊 REPORTE DE DIAGNÓSTICO DE CAMPOS');

  const fieldsWithIssues = diagnostics.filter(d => d.issues.length > 0);
  const fieldsWithWarnings = diagnostics.filter(d => d.warnings.length > 0);

  console.log(`Total de campos: ${diagnostics.length}`);
  console.log(`Campos con problemas: ${fieldsWithIssues.length}`);
  console.log(`Campos con advertencias: ${fieldsWithWarnings.length}\n`);

  // Mostrar problemas críticos
  if (fieldsWithIssues.length > 0) {
    console.group('🔴 PROBLEMAS CRÍTICOS');
    fieldsWithIssues.forEach(({ field, issues }) => {
      console.group(`Campo: ${field.label} (${field.name})`);
      console.log(`ID: ${field.id}`);
      console.log(`isActive: ${field.isActive}`);
      console.log(`showInGrid: ${field.gridConfig.showInGrid}`);
      console.log(`formOrder: ${field.formOrder}`);
      console.log(`gridOrder: ${field.gridConfig.gridOrder}`);
      console.group('Problemas:');
      issues.forEach(issue => console.error(`❌ ${issue}`));
      console.groupEnd();
      console.groupEnd();
    });
    console.groupEnd();
  }

  // Mostrar advertencias
  if (fieldsWithWarnings.length > 0) {
    console.group('⚠️ ADVERTENCIAS');
    fieldsWithWarnings.forEach(({ field, warnings }) => {
      console.group(`Campo: ${field.label} (${field.name})`);
      warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
      console.groupEnd();
    });
    console.groupEnd();
  }

  // Resumen por ubicación
  const inFormOnly = diagnostics.filter(d => d.inForm && !d.inGrid);
  const inGridOnly = diagnostics.filter(d => d.inGrid && !d.inForm);
  const inBoth = diagnostics.filter(d => d.inForm && d.inGrid);
  const inNeither = diagnostics.filter(d => !d.inForm && !d.inGrid);

  console.group('📍 RESUMEN POR UBICACIÓN');
  console.log(`Solo en formulario: ${inFormOnly.length} campos`);
  if (inFormOnly.length > 0) {
    console.log(`  - ${inFormOnly.map(d => d.field.label).join(', ')}`);
  }

  console.log(`Solo en grid: ${inGridOnly.length} campos`);
  if (inGridOnly.length > 0) {
    console.log(`  - ${inGridOnly.map(d => d.field.label).join(', ')}`);
  }

  console.log(`En ambos (formulario y grid): ${inBoth.length} campos`);
  if (inBoth.length > 0) {
    console.log(`  - ${inBoth.map(d => d.field.label).join(', ')}`);
  }

  console.log(`En ninguno (inactivos): ${inNeither.length} campos`);
  if (inNeither.length > 0) {
    console.log(`  - ${inNeither.map(d => d.field.label).join(', ')}`);
  }
  console.groupEnd();

  console.groupEnd();
}

/**
 * Sugerencias para corregir problemas
 */
export function getSuggestions(diagnostic: FieldDiagnostic): string[] {
  const suggestions: string[] = [];
  const { field, inForm, inGrid } = diagnostic;

  // Si está en grid pero no en form (no debería pasar)
  if (inGrid && !inForm) {
    suggestions.push('Activar el campo (isActive = true) para que aparezca en el formulario');
  }

  // Si está activo pero no en grid
  if (inForm && !inGrid) {
    suggestions.push('Activar "Mostrar en Grid" si deseas que aparezca en la tabla');
    suggestions.push('O desactivar el campo si no lo necesitas');
  }

  // Si showInGrid=true pero isActive=false
  if (!field.isActive && field.gridConfig.showInGrid) {
    suggestions.push('Activar el campo (isActive = true)');
    suggestions.push('O desmarcar "Mostrar en Grid"');
  }

  return suggestions;
}
