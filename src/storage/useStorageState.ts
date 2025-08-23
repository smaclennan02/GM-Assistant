import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StorageDriver } from "./driver";

type MigrateFn<T> = (fromVersion: number, data: unknown) => T;

type Options<T> = {
  key: string;
  driver: StorageDriver;
  initial: T | (() => T);
  version?: number;              // bump when shape changes
  migrate?: MigrateFn<T>;        // required if version is used
  debounceMs?: number;           // default 300
  listen?: boolean;              // default true (cross‑tab)
};

type Versioned<T> = { __v: number; value: T };

export function useStorageState<T>(opts: Options<T>) {
  const {
    key,
    driver,
    version = 1,
    migrate,
    initial,
    debounceMs = 300,
    listen = true,
  } = opts;

  const initialValue = useMemo(
    () => (typeof initial === "function" ? (initial as any)() : initial),
    [initial]
  );

  const [state, setState] = useState<T>(initialValue);
  const readyRef = useRef(false);
  const writeTimer = useRef<number | null>(null);

  // Hydrate once
  useEffect(() => {
    let alive = true;
    (async () => {
      const stored = await driver.getItem<Versioned<T>>(key);
      if (!alive) return;

      if (stored && typeof stored === "object" && "value" in stored && "__v" in stored) {
        if (stored.__v === version) {
          setState(stored.value);
        } else if (migrate) {
          try {
            const migrated = migrate(stored.__v, stored.value);
            setState(migrated);
            await driver.setItem(key, { __v: version, value: migrated });
          } catch {
            setState(initialValue);
          }
        } else {
          setState(initialValue);
          await driver.setItem(key, { __v: version, value: initialValue });
        }
      } else if (stored != null) {
        // Legacy (unversioned)
        const legacy = (stored as unknown) as T;
        if (migrate) {
          try {
            const migrated = migrate(0, legacy);
            setState(migrated);
            await driver.setItem(key, { __v: version, value: migrated });
          } catch {
            setState(initialValue);
          }
        } else {
          setState(legacy);
          await driver.setItem(key, { __v: version, value: legacy });
        }
      } else {
        await driver.setItem(key, { __v: version, value: initialValue });
      }

      readyRef.current = true;
    })();

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Debounced persist
  useEffect(() => {
    if (!readyRef.current) return;
    if (writeTimer.current) window.clearTimeout(writeTimer.current);
    writeTimer.current = window.setTimeout(() => {
      driver.setItem(key, { __v: version, value: state });
      driver.ping?.(key);
    }, debounceMs);
    return () => {
      if (writeTimer.current) window.clearTimeout(writeTimer.current);
    };
  }, [state, key, version, debounceMs, driver]);

  // Cross‑tab sync
  useEffect(() => {
    if (!listen) return;
    const handler = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        const payload = e.newValue ? JSON.parse(e.newValue) as Versioned<T> : null;
        if (payload && payload.__v === version) {
          setState(payload.value);
        }
      } catch {}
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [key, version, listen]);

  const reset = useCallback(async () => {
    setState(initialValue);
    await driver.setItem(key, { __v: version, value: initialValue });
  }, [driver, initialValue, key, version]);

  return [state, setState, { reset }] as const;
}
