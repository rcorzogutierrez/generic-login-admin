/**
 * Script para activar todas las funcionalidades de la tabla en la configuración de clientes
 *
 * INSTRUCCIONES:
 * 1. Actualizar firebaseConfig con tus credenciales de Firebase
 * 2. Ejecutar: npx ts-node scripts/enable-all-grid-features.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Configuración de Firebase - REEMPLAZAR CON TUS CREDENCIALES
// Copiar de src/environments/environment.ts o Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

async function enableAllGridFeatures() {
  try {
    console.log('🔥 Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('🔄 Activando todas las funcionalidades de la tabla...');

    // Referencia al documento de configuración
    const configRef = doc(db, 'moduleConfigs/clients/config/main');

    // Obtener configuración actual
    const configDoc = await getDoc(configRef);

    if (!configDoc.exists()) {
      console.error('❌ No se encontró la configuración del módulo de clientes');
      console.log('💡 Asegúrate de que la configuración existe en Firestore');
      process.exit(1);
    }

    const currentConfig = configDoc.data();
    console.log('📋 Configuración actual cargada');

    // Actualizar gridConfig con todas las funcionalidades activadas
    const updatedGridConfig = {
      ...currentConfig?.gridConfig,
      enableColumnSelector: true,
      enableFilters: true,
      enableExport: true,
      enableBulkActions: true,
      enableSearch: true,
      compactMode: true, // También activar modo compacto
      itemsPerPage: 10, // Asegurar que sea 10
    };

    // Actualizar en Firestore
    await updateDoc(configRef, {
      gridConfig: updatedGridConfig,
      lastModified: serverTimestamp()
    });

    console.log('\n✅ Configuración actualizada exitosamente:');
    console.log('   ✓ Selector de Columnas: activado');
    console.log('   ✓ Filtros: activado');
    console.log('   ✓ Exportar: activado');
    console.log('   ✓ Acciones Masivas: activado');
    console.log('   ✓ Búsqueda: activado');
    console.log('   ✓ Modo Compacto: activado');
    console.log('   ✓ Registros por página: 10');
    console.log('\n🎯 Recarga la aplicación para ver los cambios');

  } catch (error) {
    console.error('\n❌ Error actualizando configuración:', error);
    throw error;
  }
}

// Ejecutar el script
enableAllGridFeatures()
  .then(() => {
    console.log('\n✨ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
