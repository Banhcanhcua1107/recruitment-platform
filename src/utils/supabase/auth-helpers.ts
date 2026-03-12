import type { SupabaseClient } from "@supabase/supabase-js";

export async function signInWithGoogle(supabase: SupabaseClient) {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : undefined;

  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        prompt: "select_account",
      },
    },
  });
}

export async function signOutAndRedirect(
  supabase: SupabaseClient,
  redirectTo = "/login"
) {
  await supabase.auth.signOut({ scope: "global" });

  if (typeof window !== "undefined") {
    window.location.replace(redirectTo);
  }
}
