"use client";

import Link from "next/link";
import { Home } from "lucide-react";

export default function HomeButton() {
  return (
    <Link
      href="/"
      className="h-8 px-3 rounded border text-sm inline-flex items-center gap-1 hover:bg-white/10"
      title="Go Home"
      aria-label="Go Home"
    >
      <Home className="h-4 w-4" />
      Home
    </Link>
  );
}
