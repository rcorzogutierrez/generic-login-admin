/**
 * Utilidad para instrumentar y monitorear el rendimiento de las consultas a Firebase
 * Muestra en consola el tiempo que demora cada operación
 */

import {
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  DocumentReference,
  CollectionReference,
  Query,
  DocumentData,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';

// Colores para la consola
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

/**
 * Formatea el tiempo en milisegundos con color según la duración
 */
function formatTime(ms: number): string {
  let color = COLORS.green; // < 100ms
  if (ms > 500) color = COLORS.red; // > 500ms
  else if (ms > 200) color = COLORS.yellow; // 200-500ms

  return `${color}${ms.toFixed(2)}ms${COLORS.reset}`;
}

/**
 * Obtiene el nombre de la colección de una referencia
 */
function getCollectionName(ref: any): string {
  try {
    if (ref._query?.path?.segments) {
      return ref._query.path.segments.join('/');
    }
    if (ref._key?.path?.segments) {
      return ref._key.path.segments.join('/');
    }
    if (ref.path) {
      return ref.path;
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Wrapper instrumentado para getDoc
 */
export async function getDocWithLogging<T = DocumentData>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
  const collectionName = getCollectionName(reference);
  const startTime = performance.now();

  try {
    const result = await getDoc(reference);
    const duration = performance.now() - startTime;

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(
      `${COLORS.red}❌ getDoc${COLORS.reset} → ${collectionName} | ` +
      `Tiempo: ${formatTime(duration)} | ` +
      `Error:`, error
    );
    throw error;
  }
}

/**
 * Wrapper instrumentado para getDocs
 */
export async function getDocsWithLogging<T = DocumentData>(
  query: Query<T> | CollectionReference<T>
): Promise<QuerySnapshot<T>> {
  const collectionName = getCollectionName(query);
  const startTime = performance.now();

  try {
    const result = await getDocs(query);
    const duration = performance.now() - startTime;

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(
      `${COLORS.red}❌ getDocs${COLORS.reset} → ${collectionName} | ` +
      `Tiempo: ${formatTime(duration)} | ` +
      `Error:`, error
    );
    throw error;
  }
}

/**
 * Wrapper instrumentado para addDoc
 */
export async function addDocWithLogging<T = DocumentData>(
  reference: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T>> {
  const collectionName = getCollectionName(reference);
  const startTime = performance.now();

  try {
    const result = await addDoc(reference, data);
    const duration = performance.now() - startTime;

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(
      `${COLORS.red}❌ addDoc${COLORS.reset} → ${collectionName} | ` +
      `Tiempo: ${formatTime(duration)} | ` +
      `Error:`, error
    );
    throw error;
  }
}

/**
 * Wrapper instrumentado para setDoc
 */
export async function setDocWithLogging<T = DocumentData>(
  reference: DocumentReference<T>,
  data: T
): Promise<void> {
  const collectionName = getCollectionName(reference);
  const startTime = performance.now();

  try {
    await setDoc(reference, data);
    const duration = performance.now() - startTime;

  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(
      `${COLORS.red}❌ setDoc${COLORS.reset} → ${collectionName} | ` +
      `Tiempo: ${formatTime(duration)} | ` +
      `Error:`, error
    );
    throw error;
  }
}

/**
 * Wrapper instrumentado para updateDoc
 */
export async function updateDocWithLogging<T = DocumentData>(
  reference: DocumentReference<T>,
  data: Partial<T>
): Promise<void> {
  const collectionName = getCollectionName(reference);
  const startTime = performance.now();

  try {
    await updateDoc(reference, data as any);
    const duration = performance.now() - startTime;

  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(
      `${COLORS.red}❌ updateDoc${COLORS.reset} → ${collectionName} | ` +
      `Tiempo: ${formatTime(duration)} | ` +
      `Error:`, error
    );
    throw error;
  }
}

/**
 * Wrapper instrumentado para deleteDoc
 */
export async function deleteDocWithLogging<T = DocumentData>(
  reference: DocumentReference<T>
): Promise<void> {
  const collectionName = getCollectionName(reference);
  const startTime = performance.now();

  try {
    await deleteDoc(reference);
    const duration = performance.now() - startTime;

  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(
      `${COLORS.red}❌ deleteDoc${COLORS.reset} → ${collectionName} | ` +
      `Tiempo: ${formatTime(duration)} | ` +
      `Error:`, error
    );
    throw error;
  }
}

