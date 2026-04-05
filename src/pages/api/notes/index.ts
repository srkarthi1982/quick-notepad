import type { APIRoute } from "astro";
import { createQuickNote, getQuickNoteSummary, listQuickNotes } from "../../../lib/quick-notes";

function readRequiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

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
  const title = readRequiredText(body.title);
  const content = readRequiredText(body.content);

  if (!title || !content) {
    return new Response("Invalid payload", { status: 400 });
  }

  const note = await createQuickNote(locals.user.id, {
    title,
    content,
    category: typeof body.category === "string" ? body.category : undefined,
  });

  return Response.json({ note });
};
