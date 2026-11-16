import { useState, useEffect } from "react";
import type { AuthError, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
}

interface ProfileRow {
  display_name: string | null;
  avatar_url: string | null;
  role: string;
}

// Turn Supabase auth errors into messages people can act on.
const friendlyError = (err: AuthError | Error): Error => {
  const code = (err as AuthError).code;
  const messages: Record<string, string> = {
    invalid_credentials: "Invalid email or password. Please try again.",
    email_not_confirmed: "Please confirm your email first. Check your inbox.",
    user_already_exists: "An account with this email already exists. Sign in instead.",
    weak_password: "Please choose a stronger password (at least 6 characters).",
    over_request_rate_limit: "Too many attempts. Please wait a minute and try again.",
    over_email_send_rate_limit: "Too many emails sent. Please wait a few minutes and try again.",
    validation_failed: "Google sign-in is not set up for this project yet.",
  };
  return new Error((code && messages[code]) || err.message);
};

const toAuthUser = (user: User, profile?: ProfileRow | null): AuthUser => ({
  id: user.id,
  email: user.email ?? null,
  displayName:
    profile?.display_name ??
    user.user_metadata?.name ??
    user.user_metadata?.full_name ??
    null,
  photoURL: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
  role: profile?.role ?? "user",
});

const loadUser = async (user: User): Promise<AuthUser> => {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();
  return toAuthUser(user, data);
};

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      // Set the basic user at once, then add the profile row. Calling Supabase
      // inside this callback directly can deadlock, so defer it.
      setCurrentUser(toAuthUser(session.user));
      setLoading(false);
      setTimeout(() => {
        loadUser(session.user).then(setCurrentUser).catch(() => {});
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      setError(null);
      return await fn();
    } catch (err) {
      const friendly = friendlyError(err as AuthError);
      setError(friendly.message);
      throw friendly;
    }
  };

  // Returns the user, or null when the project requires email confirmation.
  const signup = (email: string, password: string, name: string) =>
    run(async () => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/form`,
        },
      });
      if (error) throw error;
      if (!data.session || !data.user) return null;
      const user = toAuthUser(data.user);
      setCurrentUser(user);
      return user;
    });

  const login = (email: string, password: string) =>
    run(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const user = await loadUser(data.user);
      setCurrentUser(user);
      return user;
    });

  // Redirects to Google; the user comes back signed in at /form.
  const signInWithGoogle = () =>
    run(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/form` },
      });
      if (error) throw error;
    });

  const logout = () =>
    run(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    });

  const resetPassword = (email: string) =>
    run(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
    });

  return {
    currentUser,
    loading,
    error,
    signup,
    login,
    signInWithGoogle,
    logout,
    resetPassword,
  };
};
