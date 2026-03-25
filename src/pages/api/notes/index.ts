import type { APIRoute } from "astro";
import { createQuickNote, getQuickNoteSummary, listQuickNotes } from "../../../lib/quick-notes";

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) return new Response("Unauthorized", { status: 401 });

  const items = await listQuickNotes(locals.user.id, {
    status: (url.searchParams.get("status") as "active" | "archived" | "all" | null) ?? "all",
    search: url.searchParams.get("search") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    favoritesOnly: url.searchParams.get("favoritesOnly") === "true",
    pinnedOnly: url.searchParams.get("pinnedOnly") === "true",
  });

  const summary = await getQuickNoteSummary(locals.user.id);
  return Response.json({ items, summary });
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return new Response("Unauthorized", { status: 401 });

  const body = await request.json();
  if (typeof body.title !== "string" || typeof body.content !== "string") {
    return new Response("Invalid payload", { status: 400 });
  }

  const note = await createQuickNote(locals.user.id, {
    title: body.title,
    content: body.content,
    category: typeof body.category === "string" ? body.category : undefined,
  });

  return Response.json({ note });
};
