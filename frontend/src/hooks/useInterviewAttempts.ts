import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { isStuck } from "@/lib/interview";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/lib/supabase";
import type { InterviewAttempt } from "@/lib/types";

const ATTEMPT_COLUMNS =
  "id, session_id, role, question, transcript, scores, total_score, feedback, status, flagged_reason, created_at";
const POLL_MS = 3000;

export function useInterviewAttempts() {
  const { currentUser } = useAuthContext();
  return useQuery({
    queryKey: queryKeys.interviewAttempts(currentUser?.id),
    enabled: !!currentUser,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<InterviewAttempt[]> => {
      const { data, error } = await supabase
        .from("interview_attempts")
        .select(ATTEMPT_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data.map((a) => (isStuck(a) ? { ...a, status: "failed" as const } : a));
    },
    // Poll while answers are being scored (stuck ones are already shown as failed).
    refetchInterval: (query) =>
      query.state.data?.some((a) => a.status === "processing") ? POLL_MS : false,
  });
}
