import pkg from "../../package.json";

export default function VersionFooter() {
  const version = pkg.version || "0.0.0";
  return (
    <footer className="mt-10 text-xs opacity-70 text-center py-6">
      GM Assistant • v{version}
    </footer>
  );
}
