export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function uploadJSON(): Promise<unknown> {
  return new Promise((res, rej) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return rej(new Error("No file selected"));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          res(JSON.parse(String(reader.result)));
        } catch (e) {
          rej(e instanceof Error ? e : new Error("Invalid JSON"));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
