import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/lib/supabase";
import type { StudentProfile } from "@/lib/types";

const PROFILE_COLUMNS = "display_name, location, skills, interests, duration_months";

export function useProfile() {
  const { currentUser } = useAuthContext();
  const userId = currentUser?.id;
  return useQuery({
    queryKey: queryKeys.profile(userId),
    enabled: !!userId,
    staleTime: Infinity, // only this app writes it, and writes update the cache directly
    queryFn: async (): Promise<StudentProfile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", userId!)
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
  const userId = currentUser?.id;
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
        .eq("id", userId!);
      if (error) throw error;
      return profile;
    },
    // Matches are keyed by the matching fields, so they refresh by themselves when those change.
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.profile(userId), profile),
  });
}
