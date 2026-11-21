/** Single source of truth for cache keys and invalidation. */
export const queryKeys = {
  dealers: ["dealers"] as const,
  summaries: ["summaries"] as const,
  notes: (dealerId: number) => ["notes", dealerId] as const,
  entries: (noteId: number) => ["entries", noteId] as const,
};
