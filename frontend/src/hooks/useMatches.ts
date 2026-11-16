import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isProfileComplete, matchFields } from "@/lib/profile";
import { queryKeys } from "@/lib/queryKeys";
import type { StudentProfile } from "@/lib/types";

export function useMatches(profile: StudentProfile | undefined) {
  return useQuery({
    queryKey: queryKeys.matches(profile && matchFields(profile)),
    enabled: isProfileComplete(profile),
    queryFn: async () => (await api.matches(profile!)).matches,
    staleTime: 10 * 60 * 1000,
  });
}
