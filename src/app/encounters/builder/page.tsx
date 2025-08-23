import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BuilderPage() {
  return (
    <Card className="bg-parchment/90">
      <CardHeader><CardTitle>Encounter Builder (Coming Soon)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="opacity-80">
          Plan: CR/XP budget helper, theme presets, and “Send to Tracker”.
        </p>
      </CardContent>
    </Card>
  );
}
