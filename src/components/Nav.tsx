"use client";
import { Sword, Users, Map, BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();
  const items = [
    { href: "/encounters", label: "Encounters", Icon: Sword },
    { href: "/characters", label: "Characters", Icon: Users },
    { href: "/campaign", label: "Campaign", Icon: Map },
    { href: "/resources", label: "Resources", Icon: BookOpen },
  ];
  return (
    <nav className="sticky top-0 z-50 backdrop-blur bg-parchment/70 border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 flex gap-2">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition ${
                active ? "bg-wood/10" : "hover:bg-wood/10"
              }`}
            >
              <Icon className="size-4" />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
