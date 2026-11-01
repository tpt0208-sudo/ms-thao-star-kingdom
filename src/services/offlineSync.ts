import { OfflineOperation, AppState } from '../types';
import { durableStorage } from './durableStorage';

const OFFLINE_QUEUE_KEY = 'star_kingdom_offline_queue';
const OFFLINE_CACHE_KEY = 'star_kingdom_offline_class_cache';

class OfflineSyncService {
  private queue: OfflineOperation[] = [];
  private listeners: Set<() => void> = new Set();
  private syncing = false;

  private inMemoryCache: { timestamp: string; state: AppState } | null = null;

  constructor() {
    this.loadQueue();
    // Also asynchronously load queue and state from Durable IndexedDB
    this.initDurableStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyListeners();
        this.syncPending();
      });
      window.addEventListener('offline', () => {
        this.notifyListeners();
      });
    }
  }

  private async initDurableStorage() {
    try {
      await durableStorage.init();
      const durableQ = await durableStorage.getQueue();
      if (durableQ && durableQ.length > 0) {
        // Merge with existing queue if any pending ops exist
        const map = new Map<string, OfflineOperation>();
        this.queue.forEach((op) => map.set(op.id, op));
        durableQ.forEach((op) => {
          if (!map.has(op.id)) map.set(op.id, op);
        });
        this.queue = Array.from(map.values());
        this.notifyListeners();
      }
      const durableState = await durableStorage.getState();
      if (durableState && durableState.state && !this.inMemoryCache) {
        this.inMemoryCache = {
          timestamp: durableState.timestamp || new Date().toISOString(),
          state: durableState.state,
        };
      }
    } catch (e) {
      console.debug('Durable storage init in offlineSync:', e);
    }
  }

  public isOnline(): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  private loadQueue() {
    try {
      if (typeof localStorage === 'undefined') return;
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (e) {
      console.debug('Failed to load offline queue:', e);
    }
  }

  private saveQueue() {
    // Save to Durable IndexedDB asynchronously without blocking
    durableStorage.saveQueue(this.queue).catch((err: unknown) => {
      console.debug('Failed to save queue to durable storage:', err);
    });

    if (typeof localStorage === 'undefined') {
      this.notifyListeners();
      return;
    }
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (e: unknown) {
      const isQuotaError =
        (e as any)?.name === 'QuotaExceededError' ||
        (e as any)?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        (e as any)?.code === 22 ||
        (e as any)?.code === 1014;
      if (isQuotaError) {
        // Drop already synced or stale operations to conserve space
        this.queue = this.queue.filter((op) => op.status === 'pending' || op.status === 'syncing');
        try {
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
        } catch (_) {
          console.warn('LocalStorage quota reached while saving queue; queue kept in durable IndexedDB & memory.');
        }
      } else {
        console.debug('Failed to save offline queue:', e);
      }
    }
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn());
  }

  public getQueue(): OfflineOperation[] {
    return [...this.queue];
  }

  public enqueue(type: string, payload: any): OfflineOperation {
    const op: OfflineOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };
    this.queue.push(op);
    this.saveQueue();
    return op;
  }

  public clearCompleted() {
    this.queue = this.queue.filter((op) => op.status !== 'synced');
    this.saveQueue();
  }

  public clearAll() {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Remove non-essential, heavy, or duplicate data before saving to localStorage
   */
  private pruneStateForCache(state: AppState): AppState {
    const sanitizeUrl = (url?: string, fallback: string = '') => {
      if (!url) return fallback;
      // If it's a huge base64 data URL (> 2KB), drop it to protect localStorage quota
      if (url.startsWith('data:') && url.length > 2048) {
        return fallback;
      }
      return url;
    };

    return {
      ...state,
      // Omit heavy backups array which can duplicate the whole database many times
      backups: [],
      // Omit audit logs to save space
      auditLogs: [],
      // Keep only recent 30 transactions
      starTransactions: Array.isArray(state.starTransactions)
        ? state.starTransactions.slice(-30)
        : [],
      // Keep only recent 15 news items and strip heavy embedded base64 images
      news: Array.isArray(state.news)
        ? state.news.slice(0, 15).map((item) => ({
            ...item,
            imageUrl: sanitizeUrl(item.imageUrl, ''),
          }))
        : [],
      // Keep only first 20 learning resources
      learningResources: Array.isArray(state.learningResources)
        ? state.learningResources.slice(0, 20).map((res) => ({
            ...res,
            thumbnailUrl: sanitizeUrl(res.thumbnailUrl, ''),
          }))
        : [],
      // Sanitize student avatars if they are massive data URLs
      students: Array.isArray(state.students)
        ? state.students.map((st) => ({
            ...st,
            avatarUrl: sanitizeUrl(st.avatarUrl, '/assets/kingdom/student_anh.png'),
          }))
        : [],
      // Sanitize school & class images if needed
      school: state.school
        ? {
            ...state.school,
            logoUrl: sanitizeUrl(state.school.logoUrl, '/assets/kingdom/school_logo_v2.png'),
          }
        : state.school,
      classInfo: state.classInfo
        ? {
            ...state.classInfo,
            coverUrl: sanitizeUrl(state.classInfo.coverUrl, '/assets/kingdom/hero_banner_v2.png'),
            teacherAvatar: sanitizeUrl(state.classInfo.teacherAvatar, '/assets/kingdom/teacher_avatar.png'),
          }
        : state.classInfo,
      kingdomAvatarUrl: sanitizeUrl(state.kingdomAvatarUrl, '/assets/kingdom/mobile_mascot_v2.png'),
      sidebarMascotUrl: sanitizeUrl(state.sidebarMascotUrl, '/assets/kingdom/sidebar_mascot_v2.png'),
      notifications: Array.isArray(state.notifications) ? state.notifications.slice(0, 30) : [],
      notificationReads: Array.isArray(state.notificationReads) ? state.notificationReads.slice(-100) : [],
    };
  }


  /**
   * Ultra-minimal fallback state when storage quota is critically tight
   */
  private createMinimalState(state: AppState): AppState {
    return {
      school: state.school,
      classes: state.classes || [],
      currentClassId: state.currentClassId,
      classInfo: state.classInfo,
      teams: state.teams || [],
      students: (state.students || []).map((s) => ({
        id: s.id,
        fullName: s.fullName,
        studentCode: s.studentCode,
        teamId: s.teamId,
        totalEarnedStars: s.totalEarnedStars,
        spendableStars: s.spendableStars || 0,
        weeklyStars: s.weeklyStars || 0,
        monthlyStars: s.monthlyStars || 0,
        level: s.level,
        gender: s.gender,
        badgeIds: s.badgeIds || [],
        passcode: s.passcode || '2026',
        classId: s.classId,
      })),
      starTransactions: (state.starTransactions || []).slice(-10),
      badges: state.badges || [],
      rewards: state.rewards || [],
      redemptions: (state.redemptions || []).slice(-10),
      attendance: {},
      seatingChart: { classId: state.currentClassId, rows: 4, cols: 5, seats: [], updatedAt: '' },
      news: [],
      learningResources: [],
      levelRules: state.levelRules || [],
      backups: [],
      auditLogs: [],
    };
  }

  /**
   * Pre-cache current classroom state locally for offline readiness.
   * Uses memory cache as immediate source of truth, and gracefully handles localStorage quotas.
   */
  public cacheClassState(state: AppState): boolean {
    if (!state) return false;

    // 1. Always update memory cache so offline operations in the active session remain fast
    this.inMemoryCache = {
      timestamp: new Date().toISOString(),
      state,
    };

    // 2. Persist complete unpruned state into Durable IndexedDB (hundreds of MB capacity)
    durableStorage.saveState(state).catch((err) => {
      console.debug('Failed to save state to durable storage:', err);
    });

    if (typeof localStorage === 'undefined') {
      return true;
    }

    // 2. Attempt pruned storage
    try {
      const pruned = this.pruneStateForCache(state);
      const payload = JSON.stringify({
        timestamp: new Date().toISOString(),
        state: pruned,
      });
      localStorage.setItem(OFFLINE_CACHE_KEY, payload);
      return true;
    } catch (e: unknown) {
      const isQuotaError =
        (e as any)?.name === 'QuotaExceededError' ||
        (e as any)?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        (e as any)?.code === 22 ||
        (e as any)?.code === 1014;

      if (isQuotaError) {
        try {
          // Clear any stale cached state to free up contiguous space
          localStorage.removeItem(OFFLINE_CACHE_KEY);

          // Try saving ultra-minimal state
          const minimal = this.createMinimalState(state);
          localStorage.setItem(
            OFFLINE_CACHE_KEY,
            JSON.stringify({
              timestamp: new Date().toISOString(),
              state: minimal,
            })
          );
          return true;
        } catch (innerErr) {
          // If storage is fully exhausted, clear the key and rely on memory cache
          try {
            localStorage.removeItem(OFFLINE_CACHE_KEY);
          } catch (_) {}
          console.warn('LocalStorage quota exhausted. Active session will use in-memory offline cache.');
          return false;
        }
      }

      console.warn('Unable to persist offline state cache:', e);
      return false;
    }
  }

  public getCachedClassState(): { timestamp: string; state: AppState } | null {
    // Prefer the active in-memory cache if available
    if (this.inMemoryCache) {
      return this.inMemoryCache;
    }
    if (typeof localStorage === 'undefined') {
      return null;
    }
    try {
      const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.inMemoryCache = parsed;
        return parsed;
      }
    } catch (e) {
      console.debug('Failed to read cached class state:', e);
    }
    return null;
  }

  /**
   * Sync pending operations when network is available
   */
  public async syncPending(): Promise<{ syncedCount: number; errorsCount: number }> {
    if (!this.isOnline() || this.syncing) return { syncedCount: 0, errorsCount: 0 };
    this.syncing = true;
    let syncedCount = 0;
    let errorsCount = 0;

    const pendingOps = this.queue.filter((op) => op.status === 'pending' || op.status === 'failed');

    for (const op of pendingOps) {
      op.status = 'syncing';
      this.saveQueue();

      try {
        if (op.type === 'giveStars') {
          const res = await fetch('/api/stars/give', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op.payload),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Server error');
        } else if (op.type === 'batchGiveStars') {
          const res = await fetch('/api/stars/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op.payload),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Server error');
        } else if (op.type === 'saveAttendance') {
          const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op.payload),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Server error');
        } else if (op.type === 'redeemReward') {
          const res = await fetch('/api/rewards/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op.payload),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Server error');
        }

        op.status = 'synced';
        delete op.error;
        syncedCount++;
      } catch (err: unknown) {
        op.status = 'failed';
        op.error = err instanceof Error ? err.message : 'Lỗi đồng bộ';
        errorsCount++;
      }
      this.saveQueue();
    }

    this.syncing = false;
    this.notifyListeners();
    return { syncedCount, errorsCount };
  }
}

export const offlineSync = new OfflineSyncService();
