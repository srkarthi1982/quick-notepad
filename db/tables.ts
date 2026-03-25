import { column, defineTable, NOW } from "astro:db";

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

export const tables = { QuickNotes } as const;
