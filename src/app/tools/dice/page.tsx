"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { roll, type RollResult } from "@/lib/dice";

type Macro = { name: string; expr: string };

export default function DicePage() {
  const [expr, setExpr] = useState("1d20+5");
  const [result, setResult] = useState<RollResult | null>(null);
  const [history, setHistory] = useState<RollResult[]>(
    () => JSON.parse(localStorage.getItem("dice.history") || "[]")
  );
  const [macros, setMacros] = useState<Macro[]>(
    () => JSON.parse(localStorage.getItem("dice.macros") || "[]")
  );
  const [d20mod, setD20mod] = useState<string>(() => localStorage.getItem("dice.d20mod") || "0");

  useEffect(() => localStorage.setItem("dice.history", JSON.stringify(history.slice(0, 50))), [history]);
  useEffect(() => localStorage.setItem("dice.macros", JSON.stringify(macros)), [macros]);
  useEffect(() => localStorage.setItem("dice.d20mod", d20mod), [d20mod]);

  function doRoll(input: string) {
    try {
      const r = roll(input);
      setResult(r);
      setHistory((h) => [r, ...h].slice(0, 50));
      toast.success(`${r.input} → ${r.total}`);
    } catch {
      toast.error("Invalid roll");
    }
  }

  function addMacro() {
    const name = prompt("Macro name (e.g., Rapier +7)")?.trim();
    if (!name) return;
    const expr = prompt("Expression (e.g., 1d20+7)")?.trim();
    if (!expr) return;
    setMacros((m) => [...m, { name, expr }]);
    toast.success("Macro saved");
  }
  function removeMacro(i: number) {
    setMacros((m) => m.filter((_, idx) => idx !== i));
  }

  function onQuickDie(d: number) { doRoll(`1d${d}`); }
  function onAdv() { doRoll(`2d20kh1+${Number(d20mod) || 0}`); }
  function onDis() { doRoll(`2d20kl1+${Number(d20mod) || 0}`); }

  return (
    <div className="space-y-6">
      <Card className="bg-parchment/90">
        <CardHeader><CardTitle>Dice Roller</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Quick controls */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-80">d20 mod</span>
              <Input className="w-20" value={d20mod} onChange={(e) => setD20mod(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={onAdv}>d20 Adv</Button>
              <Button variant="outline" onClick={onDis}>d20 Dis</Button>
            </div>
            <div className="flex gap-2">
              {[20, 12, 10, 8, 6, 4].map((d) => (
                <Button key={d} variant="secondary" onClick={() => onQuickDie(d)}>{`1d${d}`}</Button>
              ))}
            </div>
          </div>

          {/* Freeform */}
          <div className="flex gap-3">
            <Input
              className="max-w-xs"
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              placeholder="e.g., 2d20kh1+5, 3d8+2"
              onKeyDown={(e) => { if (e.key === "Enter") doRoll(expr); }}
            />
            <Button onClick={() => doRoll(expr)}>Roll</Button>
            <Button variant="outline" onClick={addMacro}>+ Macro</Button>
          </div>

          {/* Macros */}
          {!!macros.length && (
            <div className="flex flex-wrap gap-2">
              {macros.map((m, i) => (
                <div key={i} className="flex gap-1">
                  <Button variant="secondary" onClick={() => doRoll(m.expr)} title={m.expr}>
                    {m.name}
                  </Button>
                  <Button variant="outline" onClick={() => removeMacro(i)} title="Remove">✕</Button>
                </div>
              ))}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-4 rounded border p-3 bg-white/60 text-sm">
              <div><b>{result.input}</b> ⇒ <b>{result.total}</b></div>
              <ul className="mt-2 list-disc ml-5">
                {result.parts.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          {/* History */}
          {!!history.length && (
            <div className="mt-4">
              <div className="font-medium">History</div>
              <ul className="text-sm mt-2 space-y-1">
                {history.slice(0, 12).map((h) => (
                  <li key={h.timestamp}>
                    {new Date(h.timestamp).toLocaleTimeString()} — {h.input} = <b>{h.total}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
