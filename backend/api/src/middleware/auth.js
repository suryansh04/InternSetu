import { HttpError } from "../lib/http-error.js";

/**
 * Require a signed-in Supabase user. The frontend sends the user's access
 * token as a bearer token. Supabase signs tokens with an asymmetric key, so
 * getClaims verifies them locally against its cached public keys: no network
 * round trip per request (it falls back to asking Supabase for symmetric keys).
 */
export function requireUser(supabase) {
  return async (req, _res, next) => {
    const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return next(new HttpError(401, "Please sign in."));
    const { data, error } = await supabase.auth.getClaims(token);
    const sub = data?.claims?.sub;
    if (error || !sub) {
      return next(new HttpError(401, "Your session has expired. Please sign in again."));
    }
    req.user = { id: sub, email: data.claims.email };
    next();
  };
}
