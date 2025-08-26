"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sword, Users, Map, BookOpen } from "lucide-react";
import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";

type Campaign = { id: string; name: string };

const CAMPAIGNS_KEY: string =
  (STORAGE_KEYS as any)?.CAMPAIGNS ?? "gma.v1.campaigns";
const ACTIVE_CAMPAIGN_KEY: string =
  (STORAGE_KEYS as any)?.ACTIVE_CAMPAIGN ?? "gma.v1.active-campaign";

export default function Nav() {
  const pathname = usePathname();

  // Read active campaign (optional context display on the right)
  const [activeId] = useStorageState<string | null>({
    key: ACTIVE_CAMPAIGN_KEY,
    driver: localDriver,
    initial: null,
    version: 1,
  });
  const [campaigns] = useStorageState<Campaign[]>({
    key: CAMPAIGNS_KEY,
    driver: localDriver,
    initial: [],
    version: 1,
  });
  const activeName =
    (campaigns || []).find((c) => c?.id === activeId)?.name ?? null;

  const items = [
    { href: "/",                  label: "Home",           Icon: Home,  exact: true },
    { href: "/encounters/suite", label: "Encounter Suite", Icon: Sword },
    { href: "/characters",       label: "Characters",       Icon: Users },
    { href: "/campaign",         label: "Campaign",         Icon: Map },
    { href: "/resources",        label: "Resources",        Icon: BookOpen },
  ] as const;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur bg-parchment/70 border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
        {/* Left: nav items */}
        <div className="flex gap-2">
          {items.map(({ href, label, Icon, exact }) => {
            const active = exact ? pathname === href : (pathname === href || pathname.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition ${
                  active ? "bg-wood/10" : "hover:bg-wood/10"
                }`}
                title={label}
              >
                {Icon ? <Icon className="size-4" /> : null}
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right: active campaign (optional) */}
        <div className="text-xs px-3 py-1 rounded-xl border">
          {activeName ? (
            <>
              Active:&nbsp;<span className="font-semibold">{activeName}</span>
            </>
          ) : (
            <>No active campaign</>
          )}
        </div>
      </div>
    </nav>
  );
}
