import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tools = [
    { href: "/tools/ai", title: "AI Prompt Helper", desc: "NPCs, monsters, flavour text" },
    // more coming soon�
];

export default function Tools() {
    return (
        <div className="grid md:grid-cols-2 gap-6">
            {tools.map(t => (
                <Link key={t.href} href={t.href}>
                    <Card className="hover:shadow-soft transition bg-parchment/90">
                        <CardHeader><CardTitle>{t.title}</CardTitle></CardHeader>
                        <CardContent><p className="opacity-80">{t.desc}</p></CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
