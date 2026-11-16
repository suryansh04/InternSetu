import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/lib/supabase";
import type { Internship } from "@/lib/types";

type ListTable = "saved_internships" | "applications";

/** Saved internships and applications share one shape, so one hook serves both. */
export function useInternshipList(table: ListTable) {
  const { currentUser } = useAuthContext();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.list(table, currentUser?.id);

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
  const { mutate } = useMutation({
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
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const ids = useMemo(() => new Set(query.data?.map((i) => i.id)), [query.data]);
  // Read ids through a ref so the handler never changes identity, and memoised
  // cards are not all re-rendered when one of them is toggled.
  const idsRef = useRef(ids);
  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);
  const toggle = useCallback(
    (internship: Internship) =>
      mutate(
        { internship, add: !idsRef.current.has(internship.id) },
        { onError: (err) => toast.error(err.message) },
      ),
    [mutate],
  );

  return { ...query, ids, toggle };
}

/** Both lists, as internship cards need them. */
export function useShortlists() {
  const saved = useInternshipList("saved_internships");
  const applied = useInternshipList("applications");
  return { saved, applied, toggleSaved: saved.toggle, toggleApplied: applied.toggle };
}
