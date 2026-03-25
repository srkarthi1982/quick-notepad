import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import {
  archiveQuickNote,
  createQuickNote,
  getQuickNoteDetail,
  listQuickNotes,
  restoreQuickNote,
  toggleQuickNoteFavorite,
  toggleQuickNotePinned,
  updateQuickNote,
} from "../lib/quick-notes";

function requireUser(context: ActionAPIContext) {
  const user = (context.locals as App.Locals | undefined)?.user;

  if (!user) {
    throw new ActionError({ code: "UNAUTHORIZED", message: "You must be signed in." });
  }

  return user;
}

function notFound() {
  throw new ActionError({ code: "NOT_FOUND", message: "Note not found." });
}

export const server = {
  createQuickNote: defineAction({
    input: z.object({
      title: z.string().trim().min(1).max(160),
      content: z.string().trim().min(1).max(20000),
      category: z.string().trim().max(80).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const note = await createQuickNote(user.id, input);
      return { success: true, data: { note } };
    },
  }),

  updateQuickNote: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        title: z.string().trim().min(1).max(160).optional(),
        content: z.string().trim().min(1).max(20000).optional(),
        category: z.string().trim().max(80).optional().nullable(),
      })
      .refine((input) => input.title !== undefined || input.content !== undefined || input.category !== undefined, {
        message: "At least one field is required.",
      }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const note = await updateQuickNote(user.id, input.id, input);
      if (!note) notFound();
      return { success: true, data: { note } };
    },
  }),

  archiveQuickNote: defineAction({
    input: z.object({ id: z.string().min(1) }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const note = await archiveQuickNote(user.id, input.id);
      if (!note) notFound();
      return { success: true, data: { note } };
    },
  }),

  restoreQuickNote: defineAction({
    input: z.object({ id: z.string().min(1) }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const note = await restoreQuickNote(user.id, input.id);
      if (!note) notFound();
      return { success: true, data: { note } };
    },
  }),

  toggleQuickNotePinned: defineAction({
    input: z.object({ id: z.string().min(1) }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const note = await toggleQuickNotePinned(user.id, input.id);
      if (!note) notFound();
      return { success: true, data: { note } };
    },
  }),

  toggleQuickNoteFavorite: defineAction({
    input: z.object({ id: z.string().min(1) }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const note = await toggleQuickNoteFavorite(user.id, input.id);
      if (!note) notFound();
      return { success: true, data: { note } };
    },
  }),

  listQuickNotes: defineAction({
    input: z
      .object({
        status: z.enum(["active", "archived", "all"]).optional(),
        search: z.string().max(120).optional(),
        category: z.string().max(80).optional(),
        favoritesOnly: z.boolean().optional(),
        pinnedOnly: z.boolean().optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);
      const items = await listQuickNotes(user.id, input);
      return { success: true, data: { items, total: items.length } };
    },
  }),

  getQuickNoteDetail: defineAction({
    input: z.object({ id: z.string().min(1) }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const note = await getQuickNoteDetail(user.id, input.id);
      if (!note) notFound();
      return { success: true, data: { note } };
    },
  }),
};
