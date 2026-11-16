import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Internship, InterviewAttempt, StudentProfile } from "@/lib/types";

const PROFILE_COLUMNS = "display_name, location, skills, interests, duration_months";

/** A profile is complete once it has enough for matching. */
export const isProfileComplete = (p: StudentProfile | null | undefined): p is StudentProfile =>
  !!p && p.skills.length > 0 && !!p.location && p.duration_months > 0;

export function useProfile() {
  const { currentUser } = useAuthContext();
  return useQuery({
    queryKey: ["profile", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async (): Promise<StudentProfile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", currentUser!.id)
        .single();
      if (error) throw error;
      return {
        name: data.display_name ?? currentUser?.displayName ?? "",
        location: data.location ?? "",
        skills: data.skills ?? [],
        interests: data.interests ?? [],
        duration_months: data.duration_months ?? 0,
      };
    },
  });
}

export function useSaveProfile() {
  const { currentUser } = useAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: StudentProfile) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profile.name,
          location: profile.location,
          skills: profile.skills,
          interests: profile.interests,
          duration_months: profile.duration_months,
        })
        .eq("id", currentUser!.id);
      if (error) throw error;
      return profile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(["profile", currentUser?.id], profile);
      queryClient.removeQueries({ queryKey: ["matches"] });
    },
  });
}

export function useMatches(profile: StudentProfile | undefined) {
  return useQuery({
    queryKey: ["matches", profile],
    enabled: isProfileComplete(profile),
    queryFn: async () => (await api.matches(profile!)).matches,
    staleTime: 10 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Saved internships and applications share one shape, so one hook serves both.
// ---------------------------------------------------------------------------
type ListTable = "saved_internships" | "applications";

export function useInternshipList(table: ListTable) {
  const { currentUser } = useAuthContext();
  const queryClient = useQueryClient();
  const queryKey = [table, currentUser?.id];

  const query = useQuery({
    queryKey,
    enabled: !!currentUser,
    queryFn: async (): Promise<Internship[]> => {
      const { data, error } = await supabase
        .from(table)
        .select("created_at, internship:internships(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as { internship: Internship }[]).map((row) => row.internship);
    },
  });

  // The caller decides add vs remove at click time. Deciding inside mutationFn
  // would read the list after the optimistic update and do the opposite.
  const toggle = useMutation({
    mutationFn: async ({ internship, add }: { internship: Internship; add: boolean }) => {
      const { error } = add
        ? await supabase.from(table).insert({ internship_id: internship.id })
        : await supabase.from(table).delete().eq("internship_id", internship.id);
      if (error) throw error;
    },
    // Update the list at once; roll back if the request fails.
    onMutate: async ({ internship, add }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Internship[]>(queryKey) ?? [];
      const without = previous.filter((i) => i.id !== internship.id);
      queryClient.setQueryData(queryKey, add ? [internship, ...without] : without);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const ids = new Set(query.data?.map((i) => i.id));
  const toggleItem = (internship: Internship, onError: (err: Error) => void) =>
    toggle.mutate({ internship, add: !ids.has(internship.id) }, { onError });
  return { ...query, ids, toggle: toggleItem };
}

export function useInterviewAttempts() {
  const { currentUser } = useAuthContext();
  return useQuery({
    queryKey: ["interview_attempts", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async (): Promise<InterviewAttempt[]> => {
      const { data, error } = await supabase
        .from("interview_attempts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    // Keep polling while answers are still being scored.
    refetchInterval: (query) =>
      query.state.data?.some((a) => a.status === "processing") ? 3000 : false,
  });
}
