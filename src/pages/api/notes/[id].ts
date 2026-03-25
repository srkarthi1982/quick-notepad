import type { APIRoute } from "astro";
import {
  archiveQuickNote,
  getQuickNoteDetail,
  restoreQuickNote,
  toggleQuickNoteFavorite,
  toggleQuickNotePinned,
  updateQuickNote,
} from "../../../lib/quick-notes";

function getUser(locals: App.Locals) {
  return locals.user ?? null;
}

async function readBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return request.json();
  }

  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

export const GET: APIRoute = async ({ params, locals }) => {
  const user = getUser(locals);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const note = await getQuickNoteDetail(user.id, params.id!);
  if (!note) return new Response("Not found", { status: 404 });

  return Response.json({ note });
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const user = getUser(locals);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await readBody(request);
  const note = await updateQuickNote(user.id, params.id!, {
    title: typeof body.title === "string" ? body.title : undefined,
    content: typeof body.content === "string" ? body.content : undefined,
    category: typeof body.category === "string" || body.category === null ? body.category : undefined,
  });

  if (!note) return new Response("Not found", { status: 404 });
  return Response.json({ note });
};

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const user = getUser(locals);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await readBody(request);
  const action = typeof body.action === "string" ? body.action : "";

  let note = null;
  if (action === "archive") note = await archiveQuickNote(user.id, params.id!);
  if (action === "restore") note = await restoreQuickNote(user.id, params.id!);
  if (action === "togglePinned") note = await toggleQuickNotePinned(user.id, params.id!);
  if (action === "toggleFavorite") note = await toggleQuickNoteFavorite(user.id, params.id!);

  if (!note) return new Response("Not found", { status: 404 });

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data") || (request.headers.get("accept") ?? "").includes("text/html")) {
    return redirect(`/app/notes/${params.id}`);
  }

  return Response.json({ note });
};
