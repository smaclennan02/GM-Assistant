"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadJSON, uploadJSON } from "@/lib/io";
import { toast } from "sonner";

/* =============== SSR-safe storage helpers =============== */
function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/* =============== Types & utils =============== */
type Note = {
  id: string;
  title: string;
  body: string;        // markdown text
  tags: string[];      // ["session","quest"]
  folderId?: string;   // for tree
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
};
type Folder = {
  id: string;
  name: string;
  parentId?: string;
};

const newId = () => Math.random().toString(36).slice(2, 9);
const parseTags = (s: string) =>
  Array.from(new Set(s.split(",").map(t => t.trim()).filter(Boolean)));

/* =============== Page =============== */
export default function CampaignPage() {
  /* ---- state ---- */
const [folders, setFolders] = useState<Folder[]>(() =>
  typeof window !== "undefined" ? safeRead<Folder[]>("notes.folders", []) : []
);
const [notes, setNotes] = useState<Note[]>(() =>
  typeof window !== "undefined" ? safeRead<Note[]>("notes.items", []) : []
);
const [selectedId, setSelectedId] = useState<string | null>(() =>
  typeof window !== "undefined" ? safeRead<string | null>("notes.selected", null) : null
);

  const [search, setSearch] = useState("");

  /* ---- persist ---- */
  useEffect(() => { safeWrite("notes.folders", folders); }, [folders]);
  useEffect(() => { safeWrite("notes.items", notes); }, [notes]);
  useEffect(() => { safeWrite("notes.selected", selectedId); }, [selectedId]);

  /* ---- derived ---- */
  const selected = useMemo(
    () => notes.find(n => n.id === selectedId) || null,
    [notes, selectedId]
  );

  const pinned = useMemo(
    () => notes.filter(n => n.pinned).sort((a, b) => b.updatedAt - a.updatedAt),
    [notes]
  );

  const rootFolders = useMemo(
    () => folders.filter(f => !f.parentId),
    [folders]
  );

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [notes, search]);

  /* ---- folder ops ---- */
  function addFolder() {
    const name = prompt("New folder name?")?.trim();
    if (!name) return;
    setFolders(f => [...f, { id: newId(), name }]);
  }
  function renameFolder(id: string) {
    const f = folders.find(x => x.id === id);
    if (!f) return;
    const name = prompt("Rename folder:", f.name)?.trim();
    if (!name) return;
    setFolders(fs => fs.map(x => x.id === id ? { ...x, name } : x));
  }
  function deleteFolder(id: string) {
    if (!confirm("Delete this folder? Notes will not be deleted.")) return;
    setFolders(fs => fs.filter(x => x.id !== id));
    // orphaned notes remain, but no folderId
    setNotes(ns => ns.map(n => n.folderId === id ? { ...n, folderId: undefined } : n));
  }

  /* ---- note ops ---- */
  function newNote(folderId?: string) {
    const n: Note = {
      id: newId(),
      title: "Untitled",
      body: "",
      tags: [],
      folderId,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes(ns => [n, ...ns]);
    setSelectedId(n.id);
  }

  function dupNote(id: string) {
    const src = notes.find(n => n.id === id); if (!src) return;
    const copy: Note = {
      ...src,
      id: newId(),
      title: src.title + " (copy)",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes(ns => [copy, ...ns]);
    setSelectedId(copy.id);
    toast.success("Note duplicated");
  }

  function deleteNote(id: string) {
    if (!confirm("Delete this note?")) return;
    setNotes(ns => ns.filter(n => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updateNote(id: string, patch: Partial<Note>) {
    setNotes(ns => ns.map(n => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n));
  }

  function moveNoteToFolder(id: string, folderId?: string) {
    updateNote(id, { folderId });
  }

  /* ---- export / import ---- */
  function exportAll() {
    downloadJSON("campaign-notes.json", { folders, notes, selectedId });
    toast.success("Exported campaign notes");
  }
  async function importAll() {
    try {
      const data = await uploadJSON();
      const obj = data as { folders?: Folder[]; notes?: Note[]; selectedId?: string | null };
      if (!obj || !Array.isArray(obj.notes) || !Array.isArray(obj.folders)) {
        throw new Error("Invalid file format");
      }
      setFolders(obj.folders);
      setNotes(obj.notes);
      setSelectedId(obj.selectedId ?? null);
      toast.success("Imported campaign notes");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  }

  /* ---- UI helpers ---- */
  const notesInFolder = (folderId?: string) =>
    filteredNotes
      .filter(n => (folderId ? n.folderId === folderId : !n.folderId))
      .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4">
      {/* ---------------- Sidebar ---------------- */}
      <Card className="bg-parchment/90">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">Campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => newNote()} className="flex-1">+ New Note</Button>
            <Button variant="outline" onClick={addFolder}>+ Folder</Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={exportAll}>Export</Button>
            <Button variant="outline" onClick={importAll}>Import</Button>
          </div>

          {/* Pinned */}
          {pinned.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase opacity-70 mb-1">Pinned</div>
              <ul className="space-y-1">
                {pinned.map(n => (
                  <li key={n.id}>
                    <button
                      className={`w-full text-left rounded px-2 py-1 hover:bg-black/5 ${selectedId === n.id ? "bg-black/5" : ""}`}
                      onClick={() => setSelectedId(n.id)}
                      title={new Date(n.updatedAt).toLocaleString()}
                    >
                      ⭐ {n.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Folders */}
          <div className="mt-2">
            <div className="text-xs font-medium uppercase opacity-70 mb-1">Folders</div>
            {rootFolders.length === 0 && (
              <div className="text-xs opacity-70 mb-2">No folders yet.</div>
            )}
            <ul className="space-y-2">
              {rootFolders.map(f => (
                <li key={f.id}>
                  <div className="flex items-center justify-between">
                    <button
                      className="text-left font-medium hover:underline"
                      onClick={() => {/* noop: section heading */}}
                    >
                      {f.name}
                    </button>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => renameFolder(f.id)}>Rename</Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteFolder(f.id)}>Delete</Button>
                    </div>
                  </div>

                  {/* Notes in this folder */}
                  <ul className="mt-1 space-y-1">
                    {notesInFolder(f.id).map(n => (
                      <li key={n.id}>
                        <button
                          className={`w-full text-left rounded px-2 py-1 hover:bg-black/5 ${selectedId === n.id ? "bg-black/5" : ""}`}
                          onClick={() => setSelectedId(n.id)}
                          title={new Date(n.updatedAt).toLocaleString()}
                        >
                          {n.title}
                        </button>
                      </li>
                    ))}
                    {notesInFolder(f.id).length === 0 && (
                      <li className="text-xs opacity-60 px-2 py-1">No notes here.</li>
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          </div>

          {/* Unfiled */}
          <div className="mt-2">
            <div className="text-xs font-medium uppercase opacity-70 mb-1">Unfiled</div>
            <ul className="space-y-1">
              {notesInFolder(undefined).map(n => (
                <li key={n.id}>
                  <button
                    className={`w-full text-left rounded px-2 py-1 hover:bg-black/5 ${selectedId === n.id ? "bg-black/5" : ""}`}
                    onClick={() => setSelectedId(n.id)}
                    title={new Date(n.updatedAt).toLocaleString()}
                  >
                    {n.title}
                  </button>
                </li>
              ))}
              {notesInFolder(undefined).length === 0 && (
                <li className="text-xs opacity-60 px-2 py-1">No unfiled notes.</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- Editor Pane ---------------- */}
      <Card className="bg-parchment/90">
        <CardHeader className="pb-2">
          <CardTitle>Editor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selected ? (
            <div className="opacity-70 text-sm">Select a note or create a new one.</div>
          ) : (
            <NoteEditor
              note={selected}
              folders={folders}
              onChange={(patch) => updateNote(selected.id, patch)}
              onDelete={() => deleteNote(selected.id)}
              onDuplicate={() => dupNote(selected.id)}
              onMove={(fid) => moveNoteToFolder(selected.id, fid)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* =============== Note Editor =============== */
function NoteEditor(props: {
  note: Note;
  folders: Folder[];
  onChange: (patch: Partial<Note>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (folderId?: string) => void;
}) {
  const { note, folders, onChange, onDelete, onDuplicate, onMove } = props;

  // local editable fields
  const [title, setTitle] = useState(note.title);
  const [tagsStr, setTagsStr] = useState(note.tags.join(", "));
  const [body, setBody] = useState(note.body);
  const [folderId, setFolderId] = useState<string | "">(note.folderId ?? "");
  const [pinned, setPinned] = useState<boolean>(!!note.pinned);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  // ✅ Initialize locals ONLY when the selected note changes
  useEffect(() => {
    setTitle(note.title);
    setTagsStr(note.tags.join(", "));
    setBody(note.body);
    setFolderId(note.folderId ?? "");
    setPinned(!!note.pinned);
  }, [note.id]); // <-- key change: depend on note.id only

  // ✅ Autosave upstream when locals change (guarded)
  useEffect(() => {
    if (title !== note.title) onChange({ title });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  useEffect(() => {
    const tags = parseTags(tagsStr);
    if (tags.join(",") !== note.tags.join(",")) onChange({ tags });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsStr]);

  useEffect(() => {
    if (body !== note.body) onChange({ body });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  useEffect(() => {
    const fid = folderId || undefined;
    if (fid !== note.folderId) onMove(fid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  useEffect(() => {
    const p = !!pinned;
    if (p !== !!note.pinned) onChange({ pinned: p });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned]);

  // Tiny markdown toolbar helpers
  function wrap(prefix: string, suffix: string = "") {
    const ta = areaRef.current; if (!ta) return;
    const { selectionStart, selectionEnd, value } = ta;
    const before = value.slice(0, selectionStart);
    const sel = value.slice(selectionStart, selectionEnd);
    const after = value.slice(selectionEnd);
    const next = before + prefix + sel + suffix + after;
    setBody(next);
    const caret = selectionStart + prefix.length + sel.length + suffix.length;
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = caret; ta.focus(); });
  }

  function insertLineStart(s: string) {
    const ta = areaRef.current; if (!ta) return;
    const { selectionStart, selectionEnd, value } = ta;
    const start = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const end = selectionEnd;
    const before = value.slice(0, start);
    const mid = value.slice(start, end);
    const after = value.slice(end);
    const next = before + s + mid + after;
    setBody(next);
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = end + s.length; ta.focus(); });
  }

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-6 gap-2 items-center">
        <div className="md:col-span-4">
          <Input
            placeholder="Title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="md:col-span-2 flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setPinned(v => !v)}>
            {pinned ? "⭐ Unpin" : "☆ Pin"}
          </Button>
          <Button variant="outline" onClick={onDuplicate}>Duplicate</Button>
          <Button variant="destructive" onClick={onDelete}>Delete</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-6 gap-2">
        <div className="md:col-span-3">
          <Input
            placeholder="tags, comma, separated"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <select
            className="w-full border rounded px-2 py-2 bg-white/80 text-sm"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value as "" | string)}
            title="Folder"
          >
            <option value="">(No folder)</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-1 text-right text-xs opacity-70 self-center">
          Last saved: {new Date(note.updatedAt).toLocaleTimeString()}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => insertLineStart("# ")}>H1</Button>
        <Button variant="outline" size="sm" onClick={() => insertLineStart("## ")}>H2</Button>
        <Button variant="outline" size="sm" onClick={() => wrap("**", "**")}>Bold</Button>
        <Button variant="outline" size="sm" onClick={() => wrap("_", "_")}>Italic</Button>
        <Button variant="outline" size="sm" onClick={() => insertLineStart("- ")}>• List</Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const url = prompt("Link URL (https://...)")?.trim(); if (!url) return;
            wrap("[", `](${url})`);
          }}
        >
          Link
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => wrap("@", "")}
          title="Insert @ reference"
        >
          @Ref
        </Button>
      </div>

      {/* Editor */}
      <textarea
        ref={areaRef}
        className="w-full min-h-[420px] rounded border bg-white/80 p-3 font-mono text-sm leading-6"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your notes in Markdown…"
      />

      {/* Footer */}
      <div className="flex items-center justify-between text-xs opacity-70">
        <div>Created: {new Date(note.createdAt).toLocaleString()}</div>
        <div>Words: {body.trim() ? body.trim().split(/\s+/).length : 0}</div>
      </div>
    </div>
  );
}
