import SectionNav from "@/components/SectionNav";

export default function EncountersLayout({ children }: { children: React.ReactNode }) {
  const items = [
    { label: "Tracker", href: "/encounters/tracker" },
    { label: "Builder", href: "/encounters/builder" },
    { label: "Monsters", href: "/encounters/monsters" },
  ];
  return (
    <div>
      <SectionNav items={items} />
      {children}
    </div>
  );
}
