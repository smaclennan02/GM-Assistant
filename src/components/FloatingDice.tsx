"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { roll, type RollResult } from "@/lib/dice";
import { Dice5, Pin, PinOff, X } from "lucide-react";

/* ---------- safe storage helpers (SSR-proof) ---------- */
function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

type Macro = { name: string; expr: string };

export default function FloatingDice() {
  // initialize with defaults on the server; hydrate from localStorage on mount
  const [open, setOpen] = useState<boolean>(false);
  const [pinned, setPinned] = useState<boolean>(false);
  const [expr, setExpr] = useState("1d20+5");
  const [history, setHistory] = useState<RollResult[]>([]);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [d20mod, setD20mod] = useState<string>("0");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // hydrate state from localStorage after mount
  useEffect(() => {
    setOpen(safeRead<boolean>("dice.open", false));
    setPinned(safeRead<boolean>("dice.pinned", false));
    setHistory(safeRead<RollResult[]>("dice.history", []));
    setMacros(safeRead<Macro[]>("dice.macros", []));
    setD20mod(safeRead<string>("dice.d20mod", "0") ?? "0");
  }, []);

  // persist changes (client only)
  useEffect(() => { safeWrite("dice.history", history.slice(0, 50)); }, [history]);
  useEffect(() => { safeWrite("dice.macros", macros); }, [macros]);
  useEffect(() => { safeWrite("dice.d20mod", d20mod); }, [d20mod]);
  useEffect(() => { safeWrite("dice.pinned", pinned); }, [pinned]);
  useEffect(() => { safeWrite("dice.open", open); }, [open]);

  // don't hijack keys while typing anywhere
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      const editable = el.getAttribute?.("contenteditable");
      return tag === "input" || tag === "textarea" || editable === "true" || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping()) return;
      const k = e.key.toLowerCase();
      if (k === "r") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (k === "escape" || k === "esc") {
        if (!pinned) setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinned]);

  function doRoll(input: string) {
    try {
      const r = roll(input);
      setHistory((h) => [r, ...h].slice(0, 50));
      toast.success(`${r.input} → ${r.total}`);
    } catch {
      toast.error("Invalid roll");
    }
  }

  function addMacro() {
    const name = prompt("Macro name (e.g., Rapier +7)")?.trim();
    if (!name) return;
    const mexpr = prompt("Expression (e.g., 1d20+7)")?.trim();
    if (!mexpr) return;
    setMacros((m) => [...m, { name, expr: mexpr }]);
    toast.success("Macro saved");
  }
  function removeMacro(i: number) {
    setMacros((m) => m.filter((_, idx) => idx !== i));
  }

  const Fab = (
    <Button
      aria-label="Open Dice Roller (R)"
      onClick={() => setOpen(true)}
      className="h-12 w-12 rounded-full shadow-lg"
      style={{ padding: 0 }}
    >
      <Dice5 className="h-6 w-6" />
    </Button>
  );

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open ? (
        Fab
      ) : (
        <Card className="w-[360px] max-w-[90vw] bg-parchment/95 shadow-2xl border-ink/10">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Dice Roller</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title={pinned ? "Unpin" : "Pin"}
                  onClick={() => setPinned((v) => !v)}
                >
                  {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Close"
                  onClick={() => (!pinned ? setOpen(false) : null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 pb-4">
            {/* Quick d20 controls */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-80">d20 mod</span>
                <Input
                  className="w-16 h-8"
                  value={d20mod}
                  onChange={(e) => setD20mod(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => doRoll(`2d20kh1+${Number(d20mod) || 0}`)}>Adv</Button>
                <Button size="sm" variant="outline" onClick={() => doRoll(`2d20kl1+${Number(d20mod) || 0}`)}>Dis</Button>
              </div>
              <div className="flex gap-1">
                {[20, 100, 12, 10, 8, 6, 4].map((d) => (
                  <Button key={d} size="sm" variant="secondary" onClick={() => doRoll(`1d${d}`)}>
                    d{d}
                  </Button>
                ))}
              </div>
            </div>

            {/* Freeform */}
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                className="h-9"
                value={expr}
                onChange={(e) => setExpr(e.target.value)}
                placeholder="e.g., 2d20kh1+5, 3d8+2"
                onKeyDown={(e) => { if (e.key === "Enter") doRoll(expr); }}
              />
              <Button onClick={() => doRoll(expr)}>Roll</Button>
            </div>

            {/* Macros */}
            {macros.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {macros.map((m, i) => (
                  <div key={i} className="flex gap-[2px]">
                    <Button size="sm" variant="secondary" onClick={() => doRoll(m.expr)} title={m.expr}>
                      {m.name}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => removeMacro(i)} title="Remove">✕</Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addMacro}>+ Macro</Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setHistory([]); toast.success("History cleared"); }}
              >
                Clear History
              </Button>
            </div>

            {/* History (compact) */}
            {history.length > 0 && (
              <div className="max-h-28 overflow-auto rounded border bg-white/60 text-xs">
                <ul className="divide-y">
                  {history.slice(0, 20).map((h) => (
                    <li key={h.timestamp} className="px-2 py-1">
                      {new Date(h.timestamp).toLocaleTimeString()} — {h.input} = <b>{h.total}</b>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
