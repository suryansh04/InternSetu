// Interview attempts in Supabase. supabase-js reports failures in `error`
// instead of throwing, so every call is checked here, in one place.

const TABLE = "interview_attempts";

/** @param {{ error: unknown }} result */
function check({ error }) {
  if (error) throw error;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @returns {import("../types.js").AttemptStore}
 */
export function createAttemptStore(supabase) {
  return {
    async create({ userId, sessionId, role, question, videoUrl }) {
      const { data, error } = await supabase
        .from(TABLE)
        .insert({ user_id: userId, session_id: sessionId, role, question, video_url: videoUrl })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },

    async markScored(id, transcript, { scores, total, feedback }) {
      check(
        await supabase
          .from(TABLE)
          .update({ transcript, scores, total_score: total, feedback, status: "scored" })
          .eq("id", id),
      );
    },

    async markFailed(id) {
      check(await supabase.from(TABLE).update({ status: "failed" }).eq("id", id));
    },

    async recordFlag({ userId, sessionId, role, question, reason }) {
      check(
        await supabase.from(TABLE).insert({
          user_id: userId,
          session_id: sessionId,
          role,
          question,
          status: "failed",
          flagged_reason: reason,
        }),
      );
    },

    async failStale(olderThanMinutes) {
      const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
      const { data, error } = await supabase
        .from(TABLE)
        .update({ status: "failed" })
        .eq("status", "processing")
        .lt("created_at", cutoff)
        .select("id");
      if (error) throw error;
      return data.length;
    },
  };
}
