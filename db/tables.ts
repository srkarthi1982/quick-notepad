/**
 * Quick Notepad - super-light notes with pins & colors.
 *
 * Design goals:
 * - Simple, fast: notes list + optional categories.
 * - Support pinned notes, colors, and soft-archive.
 */

import { defineTable, column, NOW } from "astro:db";

export const NotepadCategories = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),

    name: column.text(),                          // "Personal", "Work", etc.
    icon: column.text({ optional: true }),        // emoji/icon
    sortOrder: column.number({ optional: true }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const Notes = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),

    categoryId: column.text({
      references: () => NotepadCategories.columns.id,
      optional: true,
    }),

    title: column.text({ optional: true }),
    body: column.text(),                          // main note content
    color: column.text({ optional: true }),       // e.g. "#FFF7C2" sticky-note style
    isPinned: column.boolean({ default: false }),
    isArchived: column.boolean({ default: false }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const tables = {
  NotepadCategories,
  Notes,
} as const;
