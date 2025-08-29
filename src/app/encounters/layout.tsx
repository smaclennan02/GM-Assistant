import SectionNav from "@/components/SectionNav";

export default function EncountersLayout({ children }: { children: React.ReactNode }) {
  const items: { href: string; label: string }[] = [
    { href: "/encounters/suite", label: "Suite" },
    { href: "/encounters/monsters", label: "Monsters" },
    { href: "/encounters/tracker", label: "Tracker" },
  ];
  return (
    <div>
      <SectionNav items={items} />
      {children}
    </div>
  );
}
