"use client";

import React, { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";
import { Calendar, FileText, Save, Edit3 } from "lucide-react";
import HomeButton from "@/components/HomeButton";

/**
 * Campaign (Active) – detail page
 * Reads active campaign id from ACTIVE_CAMPAIGN_KEY and displays/edits that campaign only.
 * If none is active, shows a friendly prompt to go Home and select one.
 */

type SessionLogEntry = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  title?: string;
  text?: string;
};

type Campaign = {
  id: string;
  name: string;
  world?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  notes?: string;
  log?: SessionLogEntry[];
};

const CAMPAIGNS_KEY: string = (STORAGE_KEYS as any)?.CAMPAIGNS ?? "gma.v1.campaigns";
const ACTIVE_CAMPAIGN_KEY: string = (STORAGE_KEYS as any)?.ACTIVE_CAMPAIGN ?? "gma.v1.active-campaign";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function fmtDate(ts?: number) {
  if (!ts || !Number.isFinite(ts)) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString();
  } catch {
    return "—";
  }
}

export default function ActiveCampaignPage() {
  const [campaigns, setCampaigns] = useStorageState<Campaign[]>({
    key: CAMPAIGNS_KEY,
    driver: localDriver,
    initial: [],
    version: 1,
  });

  const [activeId] = useStorageState<string | null>({
    key: ACTIVE_CAMPAIGN_KEY,
    driver: localDriver,
    initial: null,
    version: 1,
  });

  const active = useMemo(
    () => (campaigns || []).find((c) => c.id === activeId) || null,
    [campaigns, activeId]
  );

  const [editing, setEditing] = useState(false);

  const updateCampaign = (patch: Partial<Campaign>) => {
    if (!active) return;
    setCampaigns((prev) =>
      (prev || []).map((c) =>
        c.id === active.id ? { ...c, ...patch, updatedAt: Date.now() } : c
      )
    );
  };

  const addLog = () => {
    if (!active) return;
    const entry: SessionLogEntry = {
      id: newId(),
      date: new Date().toISOString().slice(0, 10),
      title: "",
      text: "",
    };
    setCampaigns((prev) =>
      (prev || []).map((c) =>
        c.id === active.id
          ? { ...c, log: [...(c.log || []), entry], updatedAt: Date.now() }
          : c
      )
    );
  };

  const updateLog = (entryId: string, patch: Partial<SessionLogEntry>) => {
    if (!active) return;
    setCampaigns((prev) =>
      (prev || []).map((c) =>
        c.id === active.id
          ? {
              ...c,
              log: (c.log || []).map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
              updatedAt: Date.now(),
            }
          : c
      )
    );
  };

  const removeLog = (entryId: string) => {
    if (!active) return;
    setCampaigns((prev) =>
      (prev || []).map((c) =>
        c.id === active.id
          ? { ...c, log: (c.log || []).filter((e) => e.id !== entryId), updatedAt: Date.now() }
          : c
      )
    );
  };

  if (!active) {
    return (
      <div className="space-y-4">
        <header className="rounded-lg border p-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Campaign</h1>
            <p className="text-xs opacity-70">No active campaign selected.</p>
          </div>
          <HomeButton />
        </header>

        <section className="rounded-lg border p-4">
          <div className="text-sm opacity-80">
            Head to <b>Home</b> and select a campaign. Once selected, this page will show that campaign’s
            overview, notes, and session log.
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="rounded-lg border p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Campaign</h1>
          <p className="text-xs opacity-70">
            {active.name || "Untitled"}{active.world ? ` • ${active.world}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <HomeButton />
          {!editing ? (
            <button
              className="h-8 px-3 rounded border text-sm inline-flex items-center gap-1 hover:bg-white/10"
              onClick={() => setEditing(true)}
              title="Edit header"
            >
              <Edit3 className="h-4 w-4" /> Edit
            </button>
          ) : (
            <button
              className="h-8 px-3 rounded border text-sm inline-flex items-center gap-1 hover:bg-white/10"
              onClick={() => setEditing(false)}
              title="Done"
            >
              <Save className="h-4 w-4" /> Done
            </button>
          )}
        </div>
      </header>

      {/* Overview */}
      <section className="rounded-lg border p-3 space-y-3">
        {!editing ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <OverviewRow label="Name" value={active.name || "Untitled"} />
              <OverviewRow label="World" value={active.world || "—"} />
              <OverviewRow label="Created" value={fmtDate(active.createdAt)} />
              <OverviewRow label="Updated" value={fmtDate(active.updatedAt)} />
            </div>
            <div className="text-sm opacity-80 min-h-[20px]">
              {active.description || <span className="opacity-50">No description.</span>}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Labeled>
              <label className="text-xs opacity-70">Name</label>
              <Input
                value={active.name}
                onChange={(e) => updateCampaign({ name: e.target.value })}
                placeholder="Campaign name"
              />
            </Labeled>
            <Labeled>
              <label className="text-xs opacity-70">World</label>
              <Input
                value={active.world || ""}
                onChange={(e) => updateCampaign({ world: e.target.value })}
                placeholder="World/setting"
              />
            </Labeled>
            <Labeled className="md:col-span-1">
              <label className="text-xs opacity-70">Created / Updated</label>
              <div className="text-sm opacity-70 p-2 border rounded">
                {fmtDate(active.createdAt)} • {fmtDate(active.updatedAt)}
              </div>
            </Labeled>
            <Labeled className="md:col-span-3">
              <label className="text-xs opacity-70">Description</label>
              <Input
                value={active.description || ""}
                onChange={(e) => updateCampaign({ description: e.target.value })}
                placeholder="Short description"
              />
            </Labeled>
          </div>
        )}
      </section>

      {/* Notes */}
      <section className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 opacity-70" />
          <div className="text-sm font-semibold">DM Notes</div>
        </div>
        <textarea
          className="px-2 py-2 border rounded bg-transparent w-full min-h-[140px]"
          value={active.notes || ""}
          onChange={(e) => updateCampaign({ notes: e.target.value })}
          placeholder="Worldbuilding, factions, plot threads…"
        />
      </section>

      {/* Session Log */}
      <section className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 opacity-70" />
            <div className="text-sm font-semibold">Session Log</div>
          </div>
        <button
          className="px-2 py-1 border rounded text-xs hover:bg-white/10"
          onClick={addLog}
        >
          + Add Entry
        </button>
        </div>

        {(active.log || []).length === 0 ? (
          <div className="text-xs opacity-60">No entries yet.</div>
        ) : (
          <div className="space-y-2">
            {(active.log || []).map((e) => (
              <div key={e.id} className="rounded border p-2 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="px-2 py-1 border rounded bg-transparent"
                    value={e.date || ""}
                    onChange={(ev) => updateLog(e.id, { date: ev.target.value })}
                  />
                  <Input
                    placeholder="Title (optional)"
                    value={e.title || ""}
                    onChange={(ev) => updateLog(e.id, { title: ev.target.value })}
                  />
                </div>
                <textarea
                  className="px-2 py-2 border rounded bg-transparent w-full min-h-[80px]"
                  placeholder="Summary, major events, loot, NPCs met…"
                  value={e.text || ""}
                  onChange={(ev) => updateLog(e.id, { text: ev.target.value })}
                />
                <div className="flex justify-end">
                  <button
                    className="px-2 py-1 border rounded text-xs hover:bg-white/10"
                    onClick={() => removeLog(e.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ===== UI bits ===== */
function OverviewRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded border p-2">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-sm font-medium">{value ?? "—"}</div>
    </div>
  );
}

function Labeled({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1 ${className}`}>{children}</div>;
}
