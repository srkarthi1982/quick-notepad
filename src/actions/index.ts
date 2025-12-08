import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import {
  NotepadCategories,
  Notes,
  and,
  db,
  eq,
} from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getOwnedCategory(categoryId: string, userId: string) {
  const [category] = await db
    .select()
    .from(NotepadCategories)
    .where(and(eq(NotepadCategories.id, categoryId), eq(NotepadCategories.userId, userId)));

  if (!category) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Category not found.",
    });
  }

  return category;
}

export const server = {
  createCategory: defineAction({
    input: z.object({
      name: z.string().min(1),
      icon: z.string().optional(),
      sortOrder: z.number().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [category] = await db
        .insert(NotepadCategories)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          name: input.name,
          icon: input.icon,
          sortOrder: input.sortOrder,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { success: true, data: { category } };
    },
  }),

  updateCategory: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        name: z.string().optional(),
        icon: z.string().optional(),
        sortOrder: z.number().optional(),
      })
      .refine(
        (input) =>
          input.name !== undefined ||
          input.icon !== undefined ||
          input.sortOrder !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedCategory(input.id, user.id);

      const [category] = await db
        .update(NotepadCategories)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.icon !== undefined ? { icon: input.icon } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          updatedAt: new Date(),
        })
        .where(eq(NotepadCategories.id, input.id))
        .returning();

      return { success: true, data: { category } };
    },
  }),

  listCategories: defineAction({
    input: z.object({}).optional(),
    handler: async (_input, context) => {
      const user = requireUser(context);

      const categories = await db
        .select()
        .from(NotepadCategories)
        .where(eq(NotepadCategories.userId, user.id));

      return { success: true, data: { items: categories, total: categories.length } };
    },
  }),

  createNote: defineAction({
    input: z.object({
      categoryId: z.string().optional(),
      title: z.string().optional(),
      body: z.string().min(1),
      color: z.string().optional(),
      isPinned: z.boolean().optional(),
      isArchived: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      if (input.categoryId) {
        await getOwnedCategory(input.categoryId, user.id);
      }

      const now = new Date();
      const [note] = await db
        .insert(Notes)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          categoryId: input.categoryId ?? null,
          title: input.title,
          body: input.body,
          color: input.color,
          isPinned: input.isPinned ?? false,
          isArchived: input.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { success: true, data: { note } };
    },
  }),

  updateNote: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        categoryId: z.string().optional(),
        title: z.string().optional(),
        body: z.string().optional(),
        color: z.string().optional(),
        isPinned: z.boolean().optional(),
        isArchived: z.boolean().optional(),
      })
      .refine(
        (input) =>
          input.categoryId !== undefined ||
          input.title !== undefined ||
          input.body !== undefined ||
          input.color !== undefined ||
          input.isPinned !== undefined ||
          input.isArchived !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [existing] = await db
        .select()
        .from(Notes)
        .where(and(eq(Notes.id, input.id), eq(Notes.userId, user.id)));

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Note not found.",
        });
      }

      if (input.categoryId !== undefined && input.categoryId !== null) {
        await getOwnedCategory(input.categoryId, user.id);
      }

      const [note] = await db
        .update(Notes)
        .set({
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.body !== undefined ? { body: input.body } : {}),
          ...(input.color !== undefined ? { color: input.color } : {}),
          ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
          ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
          updatedAt: new Date(),
        })
        .where(eq(Notes.id, input.id))
        .returning();

      return { success: true, data: { note } };
    },
  }),

  deleteNote: defineAction({
    input: z.object({
      id: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const result = await db.delete(Notes).where(and(eq(Notes.id, input.id), eq(Notes.userId, user.id)));

      if (result.rowsAffected === 0) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Note not found.",
        });
      }

      return { success: true };
    },
  }),

  listNotes: defineAction({
    input: z.object({
      categoryId: z.string().optional(),
      includeArchived: z.boolean().default(false),
      pinnedOnly: z.boolean().default(false),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      if (input.categoryId) {
        await getOwnedCategory(input.categoryId, user.id);
      }

      const filters = [eq(Notes.userId, user.id)];
      if (input.categoryId) {
        filters.push(eq(Notes.categoryId, input.categoryId));
      }
      if (!input.includeArchived) {
        filters.push(eq(Notes.isArchived, false));
      }
      if (input.pinnedOnly) {
        filters.push(eq(Notes.isPinned, true));
      }

      const notes = await db.select().from(Notes).where(and(...filters));

      return { success: true, data: { items: notes, total: notes.length } };
    },
  }),
};
