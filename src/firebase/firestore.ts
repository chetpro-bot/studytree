import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { Notebook } from '../types';

/**
 * 사용자의 모든 노트북을 Firestore에서 불러옵니다.
 */
export async function loadUserNotebooks(userId: string): Promise<Notebook[]> {
  try {
    const colRef = collection(db, 'users', userId, 'notebooks');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      return [];
    }
    const notebooks: Notebook[] = [];
    snapshot.forEach((d) => {
      notebooks.push(d.data() as Notebook);
    });
    // 정렬 (createdAt 기준)
    notebooks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return notebooks;
  } catch (error) {
    console.error('Failed to load notebooks from Firestore:', error);
    throw error;
  }
}

/**
 * 단일 노트북을 Firestore에 저장 또는 업데이트합니다.
 */
export async function saveUserNotebook(userId: string, notebook: Notebook): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'notebooks', notebook.id);
    await setDoc(
      docRef,
      {
        ...notebook,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error(`Failed to save notebook ${notebook.id} to Firestore:`, error);
    throw error;
  }
}

/**
 * 모든 노트북을 Firestore에 일괄 배치 저장합니다 (최초 마이그레이션 등).
 */
export async function saveAllUserNotebooks(userId: string, notebooks: Notebook[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const nb of notebooks) {
      const docRef = doc(db, 'users', userId, 'notebooks', nb.id);
      batch.set(docRef, {
        ...nb,
        updatedAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  } catch (error) {
    console.error('Failed to batch save notebooks to Firestore:', error);
    throw error;
  }
}

/**
 * 특정 노트북을 Firestore에서 삭제합니다.
 */
export async function deleteUserNotebook(userId: string, notebookId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'notebooks', notebookId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Failed to delete notebook ${notebookId} from Firestore:`, error);
    throw error;
  }
}
