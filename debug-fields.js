// Script de diagnóstico para identificar campos con configuración inconsistente
// Ejecutar con: node debug-fields.js

console.log('=== DIAGNÓSTICO DE CAMPOS ===\n');
console.log('Este script necesita acceso a Firestore.');
console.log('Por favor, proporciona la siguiente información:\n');
console.log('1. ¿Cuál es el nombre del campo que aparece en el grid pero no en el formulario?');
console.log('2. ¿Qué datos muestra en la columna del grid (vacío, undefined, etc.)?');
console.log('3. ¿Es un campo por defecto o personalizado?\n');

console.log('Mientras tanto, verifica lo siguiente en el constructor de formularios:');
console.log('- Ve a: /modules/clients/config');
console.log('- Revisa la lista de "Campos Disponibles"');
console.log('- Busca el campo problemático');
console.log('- Verifica su configuración:');
console.log('  * ¿Está marcado como "Activo"?');
console.log('  * ¿Tiene "Mostrar en Grid" activado?');
console.log('  * ¿Cuál es su "Orden en Formulario" (formOrder)?');
console.log('  * ¿Cuál es su "Orden en Grid" (gridOrder)?');
