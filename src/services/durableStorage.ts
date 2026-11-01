/**
 * Durable IndexedDB Storage Service for Ms. Thao's Star Kingdom
 * Provides persistent multi-megabyte offline storage for AppState,
 * sync queue, local snapshots, and uploaded file blobs.
 */

import { AppState, OfflineOperation } from '../types';

const DB_NAME = 'StarKingdom_DurableDB';
const DB_VERSION = 1;

export interface DurableBackupRecord {
  id: string;
  label: string;
  timestamp: string;
  studentCount: number;
  classCount: number;
  state: AppState;
}

export interface CachedFileRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  updatedAt: string;
}

class DurableStorageService {
  private db: IDBDatabase | null = null;
  private isSupported: boolean = false;
  private initPromise: Promise<boolean> | null = null;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  public async init(): Promise<boolean> {
    if (!this.isSupported) return false;
    if (this.db) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;

          // Store 1: Application State
          if (!db.objectStoreNames.contains('app_state')) {
            db.createObjectStore('app_state', { keyPath: 'key' });
          }

          // Store 2: Offline Pending Operations Queue
          if (!db.objectStoreNames.contains('offline_queue')) {
            db.createObjectStore('offline_queue', { keyPath: 'id' });
          }

          // Store 3: Local Backup Snapshots
          if (!db.objectStoreNames.contains('local_backups')) {
            db.createObjectStore('local_backups', { keyPath: 'id' });
          }

          // Store 4: Binary Files Cache (images, PDFs, documents)
          if (!db.objectStoreNames.contains('cached_files')) {
            db.createObjectStore('cached_files', { keyPath: 'id' });
          }
        };

        req.onsuccess = (e) => {
          this.db = (e.target as IDBOpenDBRequest).result;
          resolve(true);
        };

        req.onerror = (e) => {
          console.warn('Failed to open IndexedDB, fallback will be used:', e);
          resolve(false);
        };
      } catch (err) {
        console.warn('IndexedDB initialization error:', err);
        resolve(false);
      }
    });

    return this.initPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore | null> {
    const ready = await this.init();
    if (!ready || !this.db) return null;
    try {
      const tx = this.db.transaction(storeName, mode);
      return tx.objectStore(storeName);
    } catch (e) {
      console.warn(`Error getting store ${storeName}:`, e);
      return null;
    }
  }

  // ---------------- APP STATE PERSISTENCE ----------------

  public async saveState(state: AppState): Promise<boolean> {
    if (!state) return false;
    try {
      const store = await this.getStore('app_state', 'readwrite');
      if (!store) return false;

      return new Promise((resolve) => {
        const req = store.put({
          key: 'current_state',
          timestamp: new Date().toISOString(),
          state,
        });
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (err) {
      console.warn('DurableStorage: saveState failed:', err);
      return false;
    }
  }

  public async getState(): Promise<{ timestamp: string; state: AppState } | null> {
    try {
      const store = await this.getStore('app_state', 'readonly');
      if (!store) return null;

      return new Promise((resolve) => {
        const req = store.get('current_state');
        req.onsuccess = () => {
          if (req.result && req.result.state) {
            resolve({
              timestamp: req.result.timestamp || new Date().toISOString(),
              state: req.result.state,
            });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch (err) {
      console.warn('DurableStorage: getState failed:', err);
      return null;
    }
  }

  // ---------------- OFFLINE QUEUE ----------------

  public async saveQueueOperation(op: OfflineOperation): Promise<boolean> {
    try {
      const store = await this.getStore('offline_queue', 'readwrite');
      if (!store) return false;

      return new Promise((resolve) => {
        const req = store.put(op);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  public async getQueue(): Promise<OfflineOperation[]> {
    try {
      const store = await this.getStore('offline_queue', 'readonly');
      if (!store) return [];

      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async removeQueueOperation(id: string): Promise<boolean> {
    try {
      const store = await this.getStore('offline_queue', 'readwrite');
      if (!store) return false;

      return new Promise((resolve) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  public async clearQueue(): Promise<boolean> {
    try {
      const store = await this.getStore('offline_queue', 'readwrite');
      if (!store) return false;

      return new Promise((resolve) => {
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  public async saveQueue(queue: OfflineOperation[]): Promise<boolean> {
    try {
      const store = await this.getStore('offline_queue', 'readwrite');
      if (!store) return false;

      return new Promise((resolve) => {
        store.clear();
        queue.forEach((op) => store.put(op));
        resolve(true);
      });
    } catch {
      return false;
    }
  }

  // ---------------- LOCAL SNAPSHOT BACKUPS ----------------

  public async createLocalBackup(label: string, state: AppState): Promise<DurableBackupRecord | null> {
    try {
      const store = await this.getStore('local_backups', 'readwrite');
      if (!store) return null;

      const record: DurableBackupRecord = {
        id: `backup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        label: label || `Bản sao lưu ${new Date().toLocaleDateString('vi-VN')}`,
        timestamp: new Date().toISOString(),
        studentCount: state.students?.length || 0,
        classCount: state.classes?.length || 0,
        state,
      };

      return new Promise((resolve) => {
        const req = store.put(record);
        req.onsuccess = () => resolve(record);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async getLocalBackups(): Promise<DurableBackupRecord[]> {
    try {
      const store = await this.getStore('local_backups', 'readonly');
      if (!store) return [];

      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result || []) as DurableBackupRecord[];
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          resolve(list);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async deleteLocalBackup(id: string): Promise<boolean> {
    try {
      const store = await this.getStore('local_backups', 'readwrite');
      if (!store) return false;

      return new Promise((resolve) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  // Aliases for local snapshots
  public async createLocalSnapshot(state: AppState, label?: string): Promise<DurableBackupRecord | null> {
    return this.createLocalBackup(label || `Bản chụp ${new Date().toLocaleDateString('vi-VN')}`, state);
  }

  public async listLocalSnapshots(): Promise<DurableBackupRecord[]> {
    return this.getLocalBackups();
  }

  public async deleteLocalSnapshot(id: string): Promise<boolean> {
    return this.deleteLocalBackup(id);
  }

  // ---------------- CACHED FILE BLOBS ----------------

  public async cacheFileBlob(id: string, name: string, blob: Blob, mimeType: string): Promise<boolean> {
    try {
      const store = await this.getStore('cached_files', 'readwrite');
      if (!store) return false;

      const record: CachedFileRecord = {
        id,
        name,
        mimeType: mimeType || blob.type || 'application/octet-stream',
        size: blob.size,
        blob,
        updatedAt: new Date().toISOString(),
      };

      return new Promise((resolve) => {
        const req = store.put(record);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  public async getCachedFileBlob(id: string): Promise<Blob | null> {
    try {
      const store = await this.getStore('cached_files', 'readonly');
      if (!store) return null;

      return new Promise((resolve) => {
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result && req.result.blob) {
            resolve(req.result.blob);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  // Check storage quota estimate
  public async getStorageEstimate(): Promise<{ usageMB: number; quotaMB: number } | null> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const usageMB = Math.round(((est.usage || 0) / (1024 * 1024)) * 10) / 10;
        const quotaMB = Math.round(((est.quota || 0) / (1024 * 1024)) * 10) / 10;
        return { usageMB, quotaMB };
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const durableStorage = new DurableStorageService();
