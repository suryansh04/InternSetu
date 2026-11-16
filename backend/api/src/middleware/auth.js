import { HttpError } from "../lib/http-error.js";

/**
 * Require a signed-in Supabase user. The frontend sends the user's access
 * token as a bearer token; Supabase verifies it and returns the user.
 */
export function requireUser(supabase) {
  return async (req, _res, next) => {
    const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return next(new HttpError(401, "Please sign in."));
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return next(new HttpError(401, "Your session has expired. Please sign in again."));
    }
    req.user = data.user;
    next();
  };
}
