"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SectionNav({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  return (
    <div className="mb-4 overflow-x-auto">
      <div className="flex gap-2">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`px-3 py-2 rounded-lg border transition whitespace-nowrap ${
                active ? "bg-white/80" : "bg-parchment/80 hover:bg-white/60"
              }`}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
