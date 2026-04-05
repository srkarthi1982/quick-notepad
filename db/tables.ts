import { column, defineTable, NOW } from "astro:db";

export const NotepadCategories = defineTable({
  deprecated: true,
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    name: column.text(),
    icon: column.text({ optional: true }),
    sortOrder: column.number({ optional: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const Notes = defineTable({
  deprecated: true,
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    categoryId: column.text({
      references: () => NotepadCategories.columns.id,
      optional: true,
    }),
    title: column.text({ optional: true }),
    body: column.text(),
    color: column.text({ optional: true }),
    isPinned: column.boolean({ default: false }),
    isArchived: column.boolean({ default: false }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const QuickNotes = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    title: column.text(),
    content: column.text(),
    category: column.text({ optional: true }),
    isPinned: column.boolean({ default: false }),
    isFavorite: column.boolean({ default: false }),
    status: column.text({ default: "active" }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
    archivedAt: column.date({ optional: true }),
  },
  indexes: [
    { on: ["userId", "status"] },
    { on: ["userId", "category"] },
    { on: ["userId", "isPinned"] },
    { on: ["userId", "isFavorite"] },
    { on: ["userId", "updatedAt"] },
  ],
});

export const tables = { NotepadCategories, Notes, QuickNotes } as const;
