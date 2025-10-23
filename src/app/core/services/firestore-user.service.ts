// src/app/core/services/firestore-user.service.ts
import { Injectable } from '@angular/core';
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  DocumentReference,
  Timestamp
} from 'firebase/firestore';
import {
  getDocsWithLogging as getDocs,
  getDocWithLogging as getDoc,
  updateDocWithLogging as updateDoc
} from '../../shared/utils/firebase-logger.utils';

export interface FirestoreUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  modules: string[];
  isActive: boolean;
  createdAt: any;
  createdBy: string;
  lastLogin?: any;
  lastLoginDate?: string;
  accountStatus?: string;
  firstLoginDate?: any;
  profileComplete?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreUserService {
  private db = getFirestore();
  private usersCollection = 'authorized_users';

  /**
   * Busca un usuario por email (método principal recomendado)
   */
  async findUserByEmail(email: string): Promise<{ ref: DocumentReference, data: FirestoreUser } | null> {
    try {
      const usersRef = collection(this.db, this.usersCollection);
      const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      return {
        ref: userDoc.ref,
        data: { uid: userDoc.id, ...userDoc.data() } as FirestoreUser
      };
    } catch (error) {
      console.error('Error buscando usuario por email:', error);
      throw error;
    }
  }

  /**
   * Busca un usuario por UID de Firebase Auth
   */
  async findUserByUid(uid: string): Promise<{ ref: DocumentReference, data: FirestoreUser } | null> {
    try {
      const usersRef = collection(this.db, this.usersCollection);
      const q = query(usersRef, where('uid', '==', uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      return {
        ref: userDoc.ref,
        data: { uid: userDoc.id, ...userDoc.data() } as FirestoreUser
      };
    } catch (error) {
      console.error('Error buscando usuario por UID:', error);
      throw error;
    }
  }

  /**
   * Busca un usuario por ID de documento
   */
  async findUserByDocId(docId: string): Promise<{ ref: DocumentReference, data: FirestoreUser } | null> {
    try {
      const userRef = doc(this.db, this.usersCollection, docId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return null;
      }

      return {
        ref: userRef,
        data: { uid: userSnap.id, ...userSnap.data() } as FirestoreUser
      };
    } catch (error) {
      console.error('Error buscando usuario por doc ID:', error);
      throw error;
    }
  }

  /**
   * Busca un usuario por cualquier identificador (email, uid, docId)
   * Método inteligente que intenta todas las opciones
   */
  async findUser(identifier: string): Promise<{ ref: DocumentReference, data: FirestoreUser } | null> {
    // Intentar por email si tiene formato de email
    if (identifier.includes('@')) {
      const result = await this.findUserByEmail(identifier);
      if (result) return result;
    }

    // Intentar por UID
    const resultByUid = await this.findUserByUid(identifier);
    if (resultByUid) return resultByUid;

    // Intentar por doc ID
    const resultByDocId = await this.findUserByDocId(identifier);
    if (resultByDocId) return resultByDocId;

    return null;
  }

  /**
   * Actualiza el último login del usuario
   */
  async updateLastLogin(emailOrUid: string): Promise<void> {
    try {
      const user = await this.findUser(emailOrUid);
      
      if (!user) {
        console.warn('Usuario no encontrado para actualizar lastLogin');
        return;
      }

      const now = Timestamp.now();
      await updateDoc(user.ref, {
        lastLogin: now,
        lastLoginDate: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Error actualizando lastLogin (no crítico):', error);
    }
  }

  /**
   * Actualiza datos del usuario
   */
  async updateUser(emailOrUid: string, data: Partial<FirestoreUser>): Promise<void> {
    const user = await this.findUser(emailOrUid);
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    await updateDoc(user.ref, data as any);
  }
}