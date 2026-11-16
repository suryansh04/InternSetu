/** Every React Query cache key in one place, so readers and writers cannot drift apart. */
export const queryKeys = {
  profile: (userId: string | undefined) => ["profile", userId] as const,
  matches: (fields: unknown) => ["matches", fields] as const,
  list: (table: "saved_internships" | "applications", userId: string | undefined) =>
    [table, userId] as const,
  interviewAttempts: (userId: string | undefined) => ["interview_attempts", userId] as const,
};
