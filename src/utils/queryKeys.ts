/**
 * Centralized query key factory for React Query.
 * Every query key is a tuple — React Query uses structural equality for cache matching.
 * Invalidating ['doses', userId] will invalidate all dose queries for that user regardless of `days`.
 */
export const queryKeys = {
  // User data
  protocol: (userId: string) => ['protocol', userId] as const,
  baseline: (userId: string) => ['baseline', userId] as const,
  doses: (userId: string, days: number) => ['doses', userId, days] as const,
  checkins: (userId: string, days: number) => ['checkins', userId, days] as const,
  followUpCurrent: (userId: string, monthYear?: string) => ['followup-current', userId, monthYear] as const,
  followUpsCompleted: (userId: string) => ['followups-completed', userId] as const,
  recetas: (userId: string) => ['recetas', userId] as const,
  solicitudes: (userId: string) => ['solicitudes', userId] as const,
  solicitudDetail: (userId: string, id: string) => ['solicitud', userId, id] as const,
  shopifyProfile: (userId: string) => ['shopify-profile', userId] as const,
  storeData: (userId: string) => ['store-data', userId] as const,

  // Non-user-scoped
  catalog: () => ['catalog'] as const,
  randomQuote: () => ['random-quote'] as const,
  hasPassword: () => ['has-password'] as const,
  userRecord: (userId: string) => ['user-record', userId] as const,
} as const;
