// Script para diagnosticar y corregir el campo "Costo"
// Este script muestra el estado actual del campo y cómo corregirlo

export function diagnoseCostoField(configService: any) {
  console.group('🔍 DIAGNÓSTICO DEL CAMPO "COSTO"');

  const fields = configService.fields();
  const costoField = fields.find((f: any) =>
    f.label.toLowerCase().includes('costo') ||
    f.name.toLowerCase().includes('costo') ||
    f.name.toLowerCase().includes('cost')
  );

  if (!costoField) {
    console.error('❌ Campo "Costo" no encontrado en la configuración');
    console.log('Campos disponibles:', fields.map((f: any) => f.label).join(', '));
    console.groupEnd();
    return null;
  }

  console.log('✅ Campo encontrado:', costoField.label, `(${costoField.name})`);
  console.log('');

  console.group('📊 CONFIGURACIÓN ACTUAL');
  console.log('ID:', costoField.id);
  console.log('Nombre interno:', costoField.name);
  console.log('Etiqueta:', costoField.label);
  console.log('Tipo:', costoField.type);
  console.log('');
  console.log('🔧 ESTADO:');
  console.log('  isActive:', costoField.isActive);
  console.log('  isDefault:', costoField.isDefault);
  console.log('  isSystem:', costoField.isSystem);
  console.log('');
  console.log('📝 FORMULARIO:');
  console.log('  formOrder:', costoField.formOrder);
  console.log('  formWidth:', costoField.formWidth);
  console.log('');
  console.log('📊 GRID:');
  console.log('  showInGrid:', costoField.gridConfig.showInGrid);
  console.log('  gridOrder:', costoField.gridConfig.gridOrder);
  console.log('  gridWidth:', costoField.gridConfig.gridWidth);
  console.groupEnd();

  console.group('🔍 ANÁLISIS');

  const problems = [];
  const warnings = [];

  // Análisis del problema
  const appearsInForm = costoField.isActive;
  const appearsInGrid = costoField.isActive && costoField.gridConfig.showInGrid;

  console.log('¿Debería aparecer en formulario?', appearsInForm ? 'SÍ ✅' : 'NO ❌');
  console.log('¿Debería aparecer en grid?', appearsInGrid ? 'SÍ ✅' : 'NO ❌');
  console.log('');

  // PROBLEMA 1: Campo activo pero con formOrder muy alto
  if (costoField.isActive && costoField.formOrder > 100) {
    problems.push('formOrder muy alto - podría estar fuera de vista');
  }

  // PROBLEMA 2: Campo activo pero sin formWidth
  if (costoField.isActive && !costoField.formWidth) {
    warnings.push('formWidth no definido - podría tener problemas de visualización');
  }

  // PROBLEMA 3: showInGrid true pero isActive false (inconsistencia)
  if (!costoField.isActive && costoField.gridConfig.showInGrid) {
    problems.push('INCONSISTENCIA: showInGrid=true pero isActive=false');
  }

  if (problems.length > 0) {
    console.group('❌ PROBLEMAS ENCONTRADOS:');
    problems.forEach(p => console.error(`  • ${p}`));
    console.groupEnd();
  }

  if (warnings.length > 0) {
    console.group('⚠️ ADVERTENCIAS:');
    warnings.forEach(w => console.warn(`  • ${w}`));
    console.groupEnd();
  }

  console.groupEnd();

  console.group('💡 SOLUCIONES RECOMENDADAS');

  if (!costoField.isActive && costoField.gridConfig.showInGrid) {
    console.log('OPCIÓN 1: Activar el campo para que aparezca en formulario Y grid');
    console.log('  1. Ve a /modules/clients/config');
    console.log('  2. Busca el campo "' + costoField.label + '"');
    console.log('  3. Activa el toggle "Activo"');
    console.log('  4. Guarda cambios');
    console.log('');
    console.log('OPCIÓN 2: Desactivar en grid (solo ocultar la columna)');
    console.log('  1. Ve a /modules/clients/config');
    console.log('  2. Busca el campo "' + costoField.label + '"');
    console.log('  3. Desactiva "Mostrar en Grid"');
    console.log('  4. Guarda cambios');
  } else if (costoField.isActive) {
    console.log('El campo está activo. Si no lo ves en el formulario:');
    console.log('');
    console.log('POSIBILIDAD 1: El campo está al final y necesitas hacer scroll');
    console.log('  formOrder actual: ' + costoField.formOrder);
    console.log('');
    console.log('POSIBILIDAD 2: El campo tiene un formWidth problemático');
    console.log('  formWidth actual: ' + (costoField.formWidth || 'undefined'));
    console.log('');
    console.log('POSIBILIDAD 3: Hay un layout personalizado que lo oculta');
    console.log('  Verifica en el constructor de formularios el "Layout del Formulario"');
  }

  console.groupEnd();
  console.groupEnd();

  return costoField;
}

// Para ejecutar desde la consola del navegador:
// configService.fields().find(f => f.label.includes('Costo'))
