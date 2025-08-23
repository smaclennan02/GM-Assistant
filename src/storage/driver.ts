export interface StorageDriver {
  getItem<T = unknown>(key: string): Promise<T | null>;
  setItem<T = unknown>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  /** Optional: broadcast to other tabs (localDriver uses native 'storage' events). */
  ping?(key: string): void;
}
