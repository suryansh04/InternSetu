import { useEffect, useMemo, useState } from "react";
import type { AuthError, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  email: string | null;
  /** The name given at sign-up (or by Google). The editable name lives on the profile. */
  displayName: string | null;
}

// Turn Supabase auth errors into messages people can act on.
const friendlyError = (err: AuthError | Error): Error => {
  const code = (err as AuthError).code;
  const messages: Record<string, string> = {
    invalid_credentials: "Invalid email or password. Please try again.",
    email_not_confirmed: "Please confirm your email first. Check your inbox.",
    user_already_exists: "An account with this email already exists. Sign in instead.",
    weak_password: "Please choose a stronger password (at least 8 characters).",
    over_request_rate_limit: "Too many attempts. Please wait a minute and try again.",
    over_email_send_rate_limit: "Too many emails sent. Please wait a few minutes and try again.",
    validation_failed: "Google sign-in is not set up for this project yet.",
  };
  return new Error((code && messages[code]) || err.message);
};

const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email ?? null,
  displayName: user.user_metadata?.name ?? user.user_metadata?.full_name ?? null,
});

/** Run an auth call, turning its error into a friendly one. */
async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw friendlyError(err as AuthError);
  }
}

// These never change, so they live outside the hook and the context value stays stable.
const actions = {
  // Returns the user, or null when the project requires email confirmation.
  signup: (email: string, password: string, name: string) =>
    run(async () => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name }, emailRedirectTo: `${window.location.origin}/profile` },
      });
      if (error) throw error;
      return data.session && data.user ? toAuthUser(data.user) : null;
    }),

  login: (email: string, password: string) =>
    run(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return toAuthUser(data.user);
    }),

  // Redirects to Google; the user comes back signed in at /app.
  signInWithGoogle: () =>
    run(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/app` },
      });
      if (error) throw error;
    }),

  logout: () =>
    run(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }),

  resetPassword: (email: string) =>
    run(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    }),

  updatePassword: (password: string) =>
    run(async () => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    }),
};

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ? toAuthUser(session.user) : null;
      // Token refreshes fire this hourly with the same user: keep the old object
      // so nothing that depends on currentUser re-renders.
      setCurrentUser((prev) =>
        prev &&
        next &&
        prev.id === next.id &&
        prev.email === next.email &&
        prev.displayName === next.displayName
          ? prev
          : next,
      );
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return useMemo(() => ({ currentUser, loading, ...actions }), [currentUser, loading]);
};
