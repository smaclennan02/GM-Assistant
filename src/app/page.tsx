"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";
import { Plus, CheckCircle2, Circle, ArrowRight, FolderOpen } from "lucide-react";

/**
 * Home (Campaign Selector)
 *
 * - Reads campaigns from local storage (CAMPAIGNS_KEY).
 * - Sets a single "active campaign" id in ACTIVE_CAMPAIGN_KEY.
 * - Presents quick-create and a clean selector UI.
 * - Provides "Go to…" shortcuts once a campaign is active.
 *
 * Notes:
 * - We don't rename keys here. If STORAGE_KEYS.CAMPAIGNS or STORAGE_KEYS.ACTIVE_CAMPAIGN
 *   aren't present yet, we fall back to stable string keys so this page Just Works™.
 */

type Campaign = {
  id: string;
  name: string;
  world?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  notes?: string;
  log?: { id: string; date: string; title?: string; text?: string }[];
};

const CAMPAIGNS_KEY: string = (STORAGE_KEYS as any)?.CAMPAIGNS ?? "gma.v1.campaigns";
const ACTIVE_CAMPAIGN_KEY: string = (STORAGE_KEYS as any)?.ACTIVE_CAMPAIGN ?? "gma.v1.active-campaign";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function HomeCampaignSelector() {
  const [campaigns, setCampaigns] = useStorageState<Campaign[]>({
    key: CAMPAIGNS_KEY,
    driver: localDriver,
    initial: [],
    version: 1,
  });

  const [activeId, setActiveId] = useStorageState<string | null>({
    key: ACTIVE_CAMPAIGN_KEY,
    driver: localDriver,
    initial: null,
    version: 1,
  });

  const [nm, setNm] = useState("");
  const [world, setWorld] = useState("");

  const sorted = useMemo(() => {
    const list = campaigns || [];
    return [...list].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }, [campaigns]);

  const active = useMemo(() => sorted.find((c) => c.id === activeId) || null, [sorted, activeId]);

  const addCampaign = () => {
    const name = nm.trim() || "New Campaign";
    const now = Date.now();
    const next: Campaign = {
      id: newId(),
      name,
      world: world.trim() || "",
      description: "",
      createdAt: now,
      updatedAt: now,
      notes: "",
      log: [],
    };
    setCampaigns((prev) => [...(prev || []), next]);
    setNm("");
    setWorld("");
    setActiveId(next.id);
  };

  const pickCampaign = (id: string) => setActiveId(id);
  const clearActive = () => setActiveId(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="rounded-lg border p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">GM Assistant</h1>
          <p className="text-xs opacity-70">Choose a campaign to drive what you see across the app.</p>
        </div>

        {/* Active status + quick nav */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm px-3 py-1 rounded border">
            {active ? (
              <>
                Active:&nbsp;
                <span className="font-semibold truncate inline-block max-w-[22ch]" title={active.name}>
                  {active.name}
                </span>
              </>
            ) : (
              <>Idle</>
            )}
          </div>

          {active ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/encounters/suite"
                className="px-3 py-2 border rounded text-sm hover:bg-white/10"
                title="Open Encounter Suite"
              >
                Encounter Suite
              </Link>
              <Link
                href="/characters"
                className="px-3 py-2 border rounded text-sm hover:bg-white/10"
                title="Open Character Hub"
              >
                Characters
              </Link>
              <Link
                href="/campaign"
                className="px-3 py-2 border rounded text-sm hover:bg-white/10"
                title="Open Campaign Hub"
              >
                Campaign Hub
              </Link>
              <button
                className="px-3 py-2 border rounded text-sm hover:bg-white/10"
                onClick={clearActive}
                title="Clear active campaign"
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {/* Quick Create + Existing Campaigns */}
      <section className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 opacity-70" />
            <h2 className="font-semibold">Campaigns</h2>
            <span className="text-xs opacity-70">({sorted.length})</span>
          </div>

          {/* Quick new campaign */}
          <div className="flex items-center gap-2 rounded-lg border px-2 py-1">
            <span className="text-xs opacity-70">New</span>
            <Input
              placeholder="Name…"
              className="w-48"
              value={nm}
              onChange={(e) => setNm(e.target.value)}
            />
            <Input
              placeholder="World (optional)…"
              className="w-44"
              value={world}
              onChange={(e) => setWorld(e.target.value)}
            />
            <Button onClick={addCampaign}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Grid of campaigns */}
        {sorted.length === 0 ? (
          <div className="text-xs opacity-70">
            No campaigns yet. Create one above to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {sorted.map((c) => {
              const isActive = activeId === c.id;
              return (
                <div
                  key={c.id}
                  className={
                    "rounded-lg border p-3 space-y-2 bg-white/5 " +
                    (isActive ? "outline outline-1 outline-amber-400/40" : "")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-base font-semibold truncate" title={c.name}>
                        {c.name || "Untitled Campaign"}
                      </div>
                      <div className="text-xs opacity-70 truncate" title={c.world || ""}>
                        {c.world || "—"}
                      </div>
                    </div>
                    <button
                      className={
                        "h-8 px-3 rounded border text-sm inline-flex items-center gap-1 hover:bg-white/10 " +
                        (isActive ? "border-amber-400 text-amber-200" : "")
                      }
                      onClick={() => pickCampaign(c.id)}
                      title={isActive ? "Active" : "Set active"}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Active
                        </>
                      ) : (
                        <>
                          <Circle className="h-4 w-4" /> Select
                        </>
                      )}
                    </button>
                  </div>

                  {c.description ? (
                    <div className="text-sm opacity-80 line-clamp-3">{c.description}</div>
                  ) : (
                    <div className="text-xs opacity-50">No description.</div>
                  )}

                  <div className="flex items-center justify-end">
                    {isActive ? (
                      <Link
                        href="/encounters/suite"
                        className="px-3 py-1.5 border rounded text-xs hover:bg-white/10 inline-flex items-center gap-1"
                        title="Open Encounter Suite"
                      >
                        Go <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <button
                        className="px-3 py-1.5 border rounded text-xs hover:bg-white/10"
                        onClick={() => pickCampaign(c.id)}
                      >
                        Make Active
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Helpful hint */}
      <section className="rounded-lg border p-3">
        <div className="text-xs opacity-70">
          Once a campaign is active, other pages can read <code>STORAGE_KEYS.ACTIVE_CAMPAIGN</code> (or
          <code> "gma.v1.active-campaign"</code>) to filter what they show — e.g., Characters can show only PCs linked
          to that campaign, and the Encounter Suite can save/restore state per campaign.
        </div>
      </section>
    </div>
  );
}
