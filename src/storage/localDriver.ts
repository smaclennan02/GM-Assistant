import { StorageDriver } from "./driver";

const hasWindow = () => typeof window !== "undefined";

export const localDriver: StorageDriver = {
  async getItem<T>(key: string): Promise<T | null> {
    if (!hasWindow()) return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null; // corrupted or blocked
    }
  },
  async setItem<T>(key: string, value: T): Promise<void> {
    if (!hasWindow()) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota/block—ignore, in-memory state still works
    }
  },
  async removeItem(key: string): Promise<void> {
    if (!hasWindow()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {}
  },
  ping(key: string) {
    void key; // mark as used (no-op)
    // No-op; native 'storage' event handles cross-tab sync
  }
};
