import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Swords, Wand2, Ghost } from "lucide-react";

export default function EncountersHub() {
  return (
    <div className="space-y-6">
      {/* Single header (no duplicate section titles) */}
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Encounters</h1>
          <p className="text-sm opacity-70">
            Plan, run, and reference—everything you need for combat at the table.
          </p>
        </div>
      </header>

      {/* Sleek tiles (no extra headings below) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Initiative Tracker */}
        <Card className="hover:border-neutral-700 transition-colors">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="rounded-xl border px-3 py-2">
              <Swords className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Initiative Tracker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm opacity-80">
              Load your party and only type initiatives. Lock order, track rounds.
            </p>
            <div>
              <Link href="/encounters/tracker">
                <Button size="sm" className="inline-flex items-center gap-2">
                  Open tracker <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Encounter Builder */}
        <Card className="hover:border-neutral-700 transition-colors">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="rounded-xl border px-3 py-2">
              <Wand2 className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Encounter Builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm opacity-80">
              Assemble balanced encounters. Save presets for later.
            </p>
            <div>
              <Link href="/encounters/builder">
                <Button size="sm" className="inline-flex items-center gap-2" variant="outline">
                  Go to builder <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Monsters / Bestiary */}
        <Card className="hover:border-neutral-700 transition-colors">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="rounded-xl border px-3 py-2">
              <Ghost className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Monsters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm opacity-80">
              Quick reference for stat blocks and conditions.
            </p>
            <div>
              <Link href="/encounters/monsters">
                <Button size="sm" className="inline-flex items-center gap-2" variant="outline">
                  Browse monsters <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
