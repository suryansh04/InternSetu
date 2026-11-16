import { HttpError } from "../lib/http-error.js";

/**
 * Require a signed-in user: the frontend sends the Supabase access token as a
 * bearer token. Sets `req.user`.
 * @param {import("../types.js").TokenVerifier} verifier
 * @returns {import("express").RequestHandler}
 */
export function requireUser(verifier) {
  return async (req, _res, next) => {
    const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return next(new HttpError(401, "Please sign in."));
    const user = await verifier.verify(token);
    if (!user) return next(new HttpError(401, "Your session has expired. Please sign in again."));
    req.user = user;
    next();
  };
}
