import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
    staleTime: Infinity, // only this app writes it, and writes update the cache directly
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
    // Matches are keyed by the matching fields, so they refresh by themselves when those change.
    onSuccess: (profile) => queryClient.setQueryData(["profile", currentUser?.id], profile),
  });
}

/** Only what affects matching, in a stable order, so a name change or reordered skills reuse the cache. */
function matchKey(p: StudentProfile) {
  const sorted = (xs: string[]) => [...xs].map((x) => x.toLowerCase()).sort();
  return { skills: sorted(p.skills), interests: sorted(p.interests), location: p.location.toLowerCase(), months: p.duration_months };
}

export function useMatches(profile: StudentProfile | undefined) {
  return useQuery({
    queryKey: ["matches", profile && matchKey(profile)],
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
    staleTime: 5 * 60 * 1000,
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
    // On success the optimistic list is already right; only resync after a failure.
    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const ids = useMemo(() => new Set(query.data?.map((i) => i.id)), [query.data]);
  // Read ids through a ref so the handler never changes identity, and memoised
  // cards are not all re-rendered when one of them is toggled.
  const idsRef = useRef(ids);
  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);
  const { mutate } = toggle;
  const toggleItem = useCallback(
    (internship: Internship, onError: (err: Error) => void) =>
      mutate({ internship, add: !idsRef.current.has(internship.id) }, { onError }),
    [mutate],
  );
  return { ...query, ids, toggle: toggleItem };
}

const showError = (err: Error) => toast.error(err.message);

/** Saved and applied lists plus stable toggle handlers for internship cards. */
export function useShortlists() {
  const saved = useInternshipList("saved_internships");
  const applied = useInternshipList("applications");
  const { toggle: toggleSavedItem } = saved;
  const { toggle: toggleAppliedItem } = applied;
  const toggleSaved = useCallback((i: Internship) => toggleSavedItem(i, showError), [toggleSavedItem]);
  const toggleApplied = useCallback((i: Internship) => toggleAppliedItem(i, showError), [toggleAppliedItem]);
  return { saved, applied, toggleSaved, toggleApplied };
}

const ATTEMPT_COLUMNS =
  "id, session_id, role, question, transcript, scores, total_score, feedback, status, flagged_reason, created_at";
const STALE_AFTER_MS = 15 * 60 * 1000;

/** An attempt still 'processing' after 15 minutes was lost (e.g. a server restart): show it as failed. */
export const isStuck = (a: InterviewAttempt, now = Date.now()) =>
  a.status === "processing" && now - new Date(a.created_at).getTime() > STALE_AFTER_MS;

export function useInterviewAttempts() {
  const { currentUser } = useAuthContext();
  return useQuery({
    queryKey: ["interview_attempts", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async (): Promise<InterviewAttempt[]> => {
      const { data, error } = await supabase
        .from("interview_attempts")
        .select(ATTEMPT_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data.map((a) => (isStuck(a) ? { ...a, status: "failed" as const } : a));
    },
    staleTime: 30 * 1000,
    // Poll while answers are being scored (stuck ones are already shown as failed).
    refetchInterval: (query) =>
      query.state.data?.some((a) => a.status === "processing") ? 3000 : false,
  });
}
