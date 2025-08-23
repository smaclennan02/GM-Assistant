import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import VersionFooter from "@/components/VersionFooter";
import { Toaster } from "sonner";
import FloatingDice from "@/components/FloatingDice";

export const metadata: Metadata = {
  title: "GM Assistant",
  description: "One-stop D&D 5e GM toolkit",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        {/* NAV: sticky, with container + horizontal padding */}
        <div className="sticky top-0 z-50 bg-neutral-900/90 backdrop-blur border-b border-neutral-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Nav />
          </div>
        </div>

        {/* PAGE CONTENT: container with responsive padding */}
        <main className="pt-4 sm:pt-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
            {children}
          </div>
        </main>

        {/* FOOTER: container with padding + top border */}
        <div className="mt-8 border-t border-neutral-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <VersionFooter />
          </div>
        </div>

        {/* Floating dice + toasts */}
        <FloatingDice />
        <Toaster theme="dark" richColors position="top-right" />
      </body>
    </html>
  );
}

