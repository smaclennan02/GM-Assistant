"use client";

import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";

type DemoState = { count: number; text: string; updatedAt: number };

const initialDemo: DemoState = { count: 0, text: "", updatedAt: Date.now() };

export default function StorageDebugPage() {
  const [demo, setDemo, { reset }] = useStorageState<DemoState>({
    key: STORAGE_KEYS.SETTINGS, // safe sandbox key
    driver: localDriver,
    initial: initialDemo,
    version: 1,
  });

  return (
    <div className="p-6 space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold">Storage Debug</h1>

      <div className="flex items-center gap-2">
        <button
          className="px-3 py-2 border rounded"
          onClick={() =>
            setDemo(d => ({ ...d, count: d.count + 1, updatedAt: Date.now() }))
          }
        >
          +1
        </button>
        <button
          className="px-3 py-2 border rounded"
          onClick={() =>
            setDemo(d => ({ ...d, count: Math.max(0, d.count - 1), updatedAt: Date.now() }))
          }
        >
          -1
        </button>
        <span className="ml-2">Count: <b>{demo.count}</b></span>
      </div>

      <div className="space-y-2">
        <input
          className="w-full px-3 py-2 border rounded"
          placeholder="Type something..."
          value={demo.text}
          onChange={(e) =>
            setDemo(d => ({ ...d, text: e.target.value, updatedAt: Date.now() }))
          }
        />
        <div className="text-sm opacity-75">Text: “{demo.text}”</div>
      </div>

      <div className="flex gap-2">
        <button className="px-3 py-2 border rounded" onClick={reset}>
          Reset
        </button>
        <button
          className="px-3 py-2 border rounded"
          onClick={async () => {
            // Show it’s real localStorage by nuking key manually
            await localDriver.removeItem(STORAGE_KEYS.SETTINGS);
            location.reload();
          }}
        >
          Remove Key & Reload
        </button>
      </div>

      <div className="text-xs opacity-60">
        Updated: {new Date(demo.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}
