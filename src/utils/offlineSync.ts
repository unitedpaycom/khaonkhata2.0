import { MessState } from '../types';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const DB_NAME = 'khaonkhata_offline_db';
const DB_VERSION = 1;
const STORE_STATES = 'mess_states';
const STORE_QUEUE = 'sync_queue';

export interface OfflineAction {
  id: string;
  messId: string;
  actionType: 'save_state' | 'add_deposit' | 'update_meal' | 'add_cost' | 'update_cost' | 'delete_item';
  description: string;
  state: MessState;
  timestamp: number;
}

// Open or initialize IndexedDB
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_STATES)) {
        dbInstance.createObjectStore(STORE_STATES, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(STORE_QUEUE)) {
        dbInstance.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Clean undefined recursively for Firestore
function cleanUndefined<T>(val: T): T {
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) {
    return val.map((item) => cleanUndefined(item)) as unknown as T;
  }
  if (typeof val === 'object') {
    const res: any = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        res[k] = cleanUndefined(v);
      }
    }
    return res;
  }
  return val;
}

/**
 * Cache current MessState locally in IndexedDB (with LocalStorage fallback)
 */
export async function saveCachedMessState(state: MessState): Promise<void> {
  if (!state || !state.id) return;
  try {
    const idb = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_STATES, 'readwrite');
      const store = tx.objectStore(STORE_STATES);
      const req = store.put(state);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveCachedMessState failed, using localStorage fallback', err);
  }

  // Also maintain localStorage backup for ultra-fast instantaneous retrieval
  try {
    localStorage.setItem(`khaonkhata_cached_mess_${state.id}`, JSON.stringify(state));
    localStorage.setItem('khaonkhata_last_mess_id', state.id);
  } catch (e) {
    console.warn('LocalStorage backup error:', e);
  }
}

/**
 * Get cached MessState from IndexedDB (or LocalStorage fallback)
 */
export async function getCachedMessState(messId: string): Promise<MessState | null> {
  if (!messId) return null;

  try {
    const idb = await openIndexedDB();
    const state = await new Promise<MessState | null>((resolve, reject) => {
      const tx = idb.transaction(STORE_STATES, 'readonly');
      const store = tx.objectStore(STORE_STATES);
      const req = store.get(messId);
      req.onsuccess = () => resolve((req.result as MessState) || null);
      req.onerror = () => reject(req.error);
    });
    if (state) return state;
  } catch (err) {
    console.warn('IndexedDB getCachedMessState failed, checking localStorage fallback', err);
  }

  try {
    const raw = localStorage.getItem(`khaonkhata_cached_mess_${messId}`);
    if (raw) return JSON.parse(raw) as MessState;
  } catch (e) {
    console.warn(e);
  }

  return null;
}

/**
 * Queue an offline action to sync when back online
 */
export async function enqueueOfflineAction(action: OfflineAction): Promise<void> {
  try {
    const idb = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_QUEUE);
      const req = store.put(action);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB enqueueOfflineAction failed, using localStorage fallback', err);
  }

  // Backup in LocalStorage queue
  try {
    const raw = localStorage.getItem('khaonkhata_offline_queue') || '[]';
    const queue: OfflineAction[] = JSON.parse(raw);
    const existingIdx = queue.findIndex((item) => item.id === action.id);
    if (existingIdx >= 0) {
      queue[existingIdx] = action;
    } else {
      queue.push(action);
    }
    localStorage.setItem('khaonkhata_offline_queue', JSON.stringify(queue));
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Retrieve all pending offline actions
 */
export async function getOfflineQueue(): Promise<OfflineAction[]> {
  try {
    const idb = await openIndexedDB();
    const list = await new Promise<OfflineAction[]>((resolve, reject) => {
      const tx = idb.transaction(STORE_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_QUEUE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as OfflineAction[]) || []);
      req.onerror = () => reject(req.error);
    });
    if (list && list.length > 0) return list;
  } catch (err) {
    console.warn('IndexedDB getOfflineQueue failed, checking localStorage fallback', err);
  }

  try {
    const raw = localStorage.getItem('khaonkhata_offline_queue') || '[]';
    return JSON.parse(raw) as OfflineAction[];
  } catch {
    return [];
  }
}

/**
 * Clear the offline queue after successful sync
 */
export async function clearOfflineQueue(): Promise<void> {
  try {
    const idb = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_QUEUE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB clearOfflineQueue failed', err);
  }

  try {
    localStorage.removeItem('khaonkhata_offline_queue');
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Synchronize all queued offline actions to Firestore
 */
export async function syncOfflineQueueToFirestore(): Promise<{ syncedCount: number; error?: any }> {
  const queue = await getOfflineQueue();
  if (!queue || queue.length === 0) {
    return { syncedCount: 0 };
  }

  // Sort chronologically
  queue.sort((a, b) => a.timestamp - b.timestamp);

  // Group latest state by messId
  const latestByMess = new Map<string, OfflineAction>();
  for (const item of queue) {
    latestByMess.set(item.messId, item);
  }

  let syncedCount = 0;

  for (const [messId, item] of latestByMess.entries()) {
    try {
      const docRef = doc(db, 'messes', messId);
      const stateToSave = { ...item.state, updatedAt: new Date().toISOString() };
      const sanitized = cleanUndefined(stateToSave);
      await setDoc(docRef, sanitized, { merge: true });
      syncedCount += 1;
    } catch (err) {
      console.error('Failed to sync offline action for mess ' + messId, err);
      return { syncedCount, error: err };
    }
  }

  // Clear queue if all succeeded
  await clearOfflineQueue();
  return { syncedCount: queue.length };
}
