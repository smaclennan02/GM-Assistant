"use client";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONDITIONS } from "@/lib/conditions";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <ConditionsBlock />
      <Card className="bg-parchment/90">
        <CardHeader><CardTitle>Content Packs</CardTitle></CardHeader>
        <CardContent><p className="opacity-80">SRD & homebrew loaders (coming soon).</p></CardContent>
      </Card>
    </div>
  );
}

function ConditionsBlock() {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? CONDITIONS.filter(c => c.name.toLowerCase().includes(s)) : CONDITIONS;
  }, [q]);
  return (
    <Card className="bg-parchment/90">
      <CardHeader><CardTitle>Conditions (Quick Ref)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Search condition…" value={q} onChange={e=>setQ(e.target.value)} />
        <div className="grid sm:grid-cols-2 gap-2">
          {list.map((c) => (
            <div key={c.name} className="rounded border p-3 bg-white/70">
              <div className="font-medium">{c.name}</div>
              <div className="text-sm opacity-80">{c.brief}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
