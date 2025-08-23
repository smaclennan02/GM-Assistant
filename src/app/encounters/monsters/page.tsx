import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MonstersPage() {
  return (
    <Card className="bg-parchment/90">
      <CardHeader><CardTitle>Monster Lookup (Coming Soon)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="opacity-80">
          Plan: fast search over SRD monsters, quick copy, add to Encounter.
        </p>
      </CardContent>
    </Card>
  );
}
