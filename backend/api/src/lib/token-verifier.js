/**
 * Verifies Supabase access tokens. Supabase signs them with an asymmetric key,
 * so getClaims checks them locally against its cached public keys: no network
 * round trip per request (it asks Supabase only for symmetric keys).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @returns {import("../types.js").TokenVerifier}
 */
export function createTokenVerifier(supabase) {
  return {
    async verify(token) {
      const { data, error } = await supabase.auth.getClaims(token);
      const claims = data?.claims;
      if (error || !claims?.sub) return null;
      return { id: claims.sub, email: claims.email };
    },
  };
}
