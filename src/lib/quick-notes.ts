import { and, db, desc, eq, QuickNotes } from "astro:db";

export type NoteStatus = "active" | "archived";
export type QuickNote = typeof QuickNotes.$inferSelect;

export type QuickNoteInput = {
  title: string;
  content: string;
  category?: string | null;
};

export async function listQuickNotes(userId: string, options?: { status?: NoteStatus | "all"; search?: string; category?: string; favoritesOnly?: boolean; pinnedOnly?: boolean }): Promise<QuickNote[]> {
  const filters = [eq(QuickNotes.userId, userId)];

  if (options?.status && options.status !== "all") {
    filters.push(eq(QuickNotes.status, options.status));
  }
  if (options?.category) {
    filters.push(eq(QuickNotes.category, options.category));
  }
  if (options?.favoritesOnly) {
    filters.push(eq(QuickNotes.isFavorite, true));
  }
  if (options?.pinnedOnly) {
    filters.push(eq(QuickNotes.isPinned, true));
  }

  const where = filters.length === 1 ? filters[0] : and(...filters);
  const items = await db.select().from(QuickNotes).where(where).orderBy(desc(QuickNotes.updatedAt)) as QuickNote[];

  if (!options?.search?.trim()) return items;

  const searchTerm = options.search.trim().toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm) ||
      item.content.toLowerCase().includes(searchTerm) ||
      (item.category?.toLowerCase().includes(searchTerm) ?? false),
  );
}

export async function getQuickNoteDetail(userId: string, id: string): Promise<QuickNote | null> {
  const [note] = await db
    .select()
    .from(QuickNotes)
    .where(and(eq(QuickNotes.id, id), eq(QuickNotes.userId, userId)));

  return (note as QuickNote | undefined) ?? null;
}

export async function createQuickNote(userId: string, input: QuickNoteInput) {
  const now = new Date();
  const [note] = await db
    .insert(QuickNotes)
    .values({
      id: crypto.randomUUID(),
      userId,
      title: input.title.trim(),
      content: input.content.trim(),
      category: input.category?.trim() || null,
      status: "active",
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    })
    .returning();

  await emitDashboardSummary(userId);
  await emitHighSignalNotifications(userId, "created");

  return note;
}

export async function updateQuickNote(userId: string, id: string, input: Partial<QuickNoteInput>) {
  const existing = await getQuickNoteDetail(userId, id);
  if (!existing) return null;

  const [note] = await db
    .update(QuickNotes)
    .set({
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.content !== undefined ? { content: input.content.trim() } : {}),
      ...(input.category !== undefined ? { category: input.category?.trim() || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(QuickNotes.id, id))
    .returning();

  await emitDashboardSummary(userId);

  return note;
}

export async function archiveQuickNote(userId: string, id: string) {
  const existing = await getQuickNoteDetail(userId, id);
  if (!existing) return null;

  const [note] = await db
    .update(QuickNotes)
    .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(QuickNotes.id, id))
    .returning();

  await emitDashboardSummary(userId);
  return note;
}

export async function restoreQuickNote(userId: string, id: string) {
  const existing = await getQuickNoteDetail(userId, id);
  if (!existing) return null;

  const [note] = await db
    .update(QuickNotes)
    .set({ status: "active", archivedAt: null, updatedAt: new Date() })
    .where(eq(QuickNotes.id, id))
    .returning();

  await emitDashboardSummary(userId);
  return note;
}

export async function toggleQuickNotePinned(userId: string, id: string) {
  const existing = await getQuickNoteDetail(userId, id);
  if (!existing) return null;

  const [note] = await db
    .update(QuickNotes)
    .set({ isPinned: !existing.isPinned, updatedAt: new Date() })
    .where(eq(QuickNotes.id, id))
    .returning();

  await emitDashboardSummary(userId);
  if (note.isPinned) {
    await emitHighSignalNotifications(userId, "pinned");
  }

  return note;
}

export async function toggleQuickNoteFavorite(userId: string, id: string) {
  const existing = await getQuickNoteDetail(userId, id);
  if (!existing) return null;

  const [note] = await db
    .update(QuickNotes)
    .set({ isFavorite: !existing.isFavorite, updatedAt: new Date() })
    .where(eq(QuickNotes.id, id))
    .returning();

  await emitDashboardSummary(userId);
  if (note.isFavorite) {
    await emitHighSignalNotifications(userId, "favorited");
  }

  return note;
}

export async function getQuickNoteSummary(userId: string) {
  const notes = await listQuickNotes(userId, { status: "all" });
  const lastUpdated = notes[0];
  const activeNotes = notes.filter((note) => note.status === "active");

  return {
    totalNotes: notes.length,
    activeNotes: activeNotes.length,
    pinnedNotes: notes.filter((note) => note.isPinned).length,
    favoriteNotes: notes.filter((note) => note.isFavorite).length,
    archivedNotes: notes.filter((note) => note.status === "archived").length,
    recentlyUpdatedCount: notes.filter((note) => Date.now() - new Date(note.updatedAt).getTime() < 1000 * 60 * 60 * 24 * 7).length,
    mostRecentlyUpdatedTitle: lastUpdated?.title ?? null,
  };
}

async function emitDashboardSummary(userId: string) {
  const url = import.meta.env.ANSIVERSA_DASHBOARD_WEBHOOK_URL;
  if (!url) return;

  const summary = await getQuickNoteSummary(userId);

  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      appId: "quick-notepad",
      userId,
      summary: {
        totalNotes: summary.totalNotes,
        pinnedCount: summary.pinnedNotes,
        favoritesCount: summary.favoriteNotes,
        mostRecentlyUpdatedTitle: summary.mostRecentlyUpdatedTitle,
      },
      emittedAt: new Date().toISOString(),
    }),
  }).catch(() => undefined);
}

type NotificationEvent = "created" | "pinned" | "favorited";

async function emitHighSignalNotifications(userId: string, event: NotificationEvent) {
  const url = import.meta.env.ANSIVERSA_NOTIFICATIONS_WEBHOOK_URL;
  if (!url) return;

  const summary = await getQuickNoteSummary(userId);
  const shouldSend =
    (event === "created" && summary.totalNotes === 1) ||
    (event === "pinned" && summary.pinnedNotes === 1) ||
    (event === "favorited" && summary.favoriteNotes === 1);

  if (!shouldSend) return;

  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      appId: "quick-notepad",
      userId,
      type: "high_signal",
      event,
      summary,
      emittedAt: new Date().toISOString(),
    }),
  }).catch(() => undefined);
}
