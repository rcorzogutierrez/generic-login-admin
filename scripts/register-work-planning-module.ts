/**
 * Script para registrar el módulo de Planificación de Trabajo en Firebase
 *
 * Este script agrega el módulo 'work-planning' a la colección 'system_modules'
 * para que aparezca en el menú de navegación.
 *
 * Ejecutar: npx ts-node scripts/register-work-planning-module.ts
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';

// Configuración de Firebase - REEMPLAZAR CON TUS CREDENCIALES
const firebaseConfig = {
  // Copiar de src/environments/environment.ts
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

async function registerWorkPlanningModule() {
  try {
    console.log('🔥 Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Verificar si el módulo ya existe
    console.log('🔍 Verificando si el módulo ya existe...');
    const modulesRef = collection(db, 'system_modules');
    const q = query(modulesRef, where('value', '==', 'work-planning'));
    const existingModules = await getDocs(q);

    if (!existingModules.empty) {
      console.log('⚠️  El módulo "work-planning" ya existe en la base de datos.');
      console.log('ℹ️  ID del módulo:', existingModules.docs[0].id);
      return;
    }

    // Obtener el orden máximo actual
    const allModulesQuery = await getDocs(modulesRef);
    let maxOrder = 0;
    allModulesQuery.forEach(doc => {
      const order = doc.data()['order'] || 0;
      if (order > maxOrder) maxOrder = order;
    });

    // Crear el nuevo módulo
    console.log('✨ Creando módulo de Planificación de Trabajo...');
    const newModule = {
      value: 'work-planning',
      label: 'Planificación de Trabajo',
      description: 'Gestión y programación de planes de trabajo para trabajadores y propuestas',
      icon: 'event_note',
      route: '/modules/work-planning',
      isActive: true,
      order: maxOrder + 1,
      createdAt: Timestamp.now(),
      createdBy: 'system',
      updatedAt: Timestamp.now(),
      updatedBy: 'system',
      usersCount: 0
    };

    const docRef = await addDoc(modulesRef, newModule);

    console.log('✅ ¡Módulo registrado exitosamente!');
    console.log('📋 ID del módulo:', docRef.id);
    console.log('📦 Valor:', newModule.value);
    console.log('🏷️  Etiqueta:', newModule.label);
    console.log('📊 Orden:', newModule.order);
    console.log('\n🎯 Siguiente paso: Asigna el módulo a los usuarios que deban tener acceso');
    console.log('   Ir a Admin > Gestión de Usuarios > Editar usuario > Módulos');

  } catch (error) {
    console.error('❌ Error registrando el módulo:', error);
    throw error;
  }
}

// Ejecutar el script
registerWorkPlanningModule()
  .then(() => {
    console.log('\n✨ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
