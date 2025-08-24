import SectionNav from "@/components/SectionNav";

export default function EncountersLayout({ children }: { children: React.ReactNode }) {
  const items = [
    
  ];
  return (
    <div>
      <SectionNav items={items} />
      {children}
    </div>
  );
}
