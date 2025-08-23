export type Note = {
  id: string;
  title: string;
  body: string;
  folderId?: string | null;
  pinned?: boolean;
  updatedAt: number;
  createdAt: number;
};

export type Folder = { id: string; name: string };

export type NotesState = {
  folders: Folder[];
  notes: Note[];
  updatedAt: number;
};
