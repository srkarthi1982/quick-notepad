import type { Alpine } from "alpinejs";

type NoteItem = {
  id: string;
  title: string;
  content: string;
  category?: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  status: "active" | "archived";
  updatedAt: string | Date;
  createdAt: string | Date;
};

type Summary = Record<string, number | string | null>;

type QuickNotepadStore = {
  notes: NoteItem[];
  summary: Summary | null;
  query: string;
  activeTab: "overview" | "notes" | "favorites" | "archived";
  categoryFilter: string;
  flash: { type: string; message: string };
  drawerOpen: boolean;
  isSubmitting: boolean;
  activeNote: NoteItem | null;
  init(payload: { notes: NoteItem[]; summary: Summary }): void;
  readonly filteredNotes: NoteItem[];
  refresh(): Promise<void>;
  openCreate(): void;
  openEdit(note: NoteItem): void;
  saveNote(form: HTMLFormElement): Promise<void>;
  triggerAction(id: string, action: string): Promise<void>;
};

export default function initAlpine(Alpine: Alpine) {
  const store: QuickNotepadStore = {
    notes: [] as NoteItem[],
    summary: null,
    query: "",
    activeTab: "overview",
    categoryFilter: "",
    flash: { type: "", message: "" },
    drawerOpen: false,
    isSubmitting: false,
    activeNote: null as NoteItem | null,

    init(payload: { notes: NoteItem[]; summary: Summary }) {
      this.notes = payload.notes ?? [];
      this.summary = payload.summary;
    },

    get filteredNotes() {
      return this.notes.filter((note) => {
        if (this.activeTab === "favorites" && !note.isFavorite) return false;
        if (this.activeTab === "archived" && note.status !== "archived") return false;
        if (this.activeTab !== "archived" && note.status === "archived") return false;
        if (this.categoryFilter && (note.category ?? "") !== this.categoryFilter) return false;
        if (!this.query.trim()) return true;
        const term = this.query.toLowerCase();
        return note.title.toLowerCase().includes(term) || note.content.toLowerCase().includes(term) || (note.category ?? "").toLowerCase().includes(term);
      });
    },

    async refresh() {
      const params = new URLSearchParams({ status: "all" });
      const response = await fetch(`/api/notes?${params.toString()}`);
      if (!response.ok) return;
      const data = await response.json();
      this.notes = data.items;
      this.summary = data.summary;
    },

    openCreate() {
      this.activeNote = null;
      this.drawerOpen = true;
    },

    openEdit(note: NoteItem) {
      this.activeNote = note;
      this.drawerOpen = true;
    },

    async saveNote(form: HTMLFormElement) {
      this.isSubmitting = true;
      this.flash = { type: "", message: "" };
      const formData = new FormData(form);
      const payload = {
        title: String(formData.get("title") || ""),
        content: String(formData.get("content") || ""),
        category: String(formData.get("category") || ""),
      };

      const response = this.activeNote
        ? await fetch(`/api/notes/${this.activeNote.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });

      this.isSubmitting = false;
      if (!response.ok) {
        this.flash = { type: "error", message: "Unable to save note." };
        return;
      }

      this.drawerOpen = false;
      form.reset();
      this.flash = { type: "success", message: this.activeNote ? "Note updated." : "Note created." };
      await this.refresh();
    },

    async triggerAction(id: string, action: string) {
      const response = await fetch(`/api/notes/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        this.flash = { type: "error", message: "Unable to update note." };
        return;
      }

      await this.refresh();
    },
  };

  Alpine.store("quickNotepad", store);
}
