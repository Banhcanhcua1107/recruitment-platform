import type { SupabaseClient } from "@supabase/supabase-js";

function getSafeBrowserOrigin() {
  if (typeof window === "undefined") return undefined;

  const currentUrl = new URL(window.location.href);

  // 0.0.0.0 can be used for server binding, but it is not a valid browser destination.
  if (currentUrl.hostname === "0.0.0.0") {
    currentUrl.hostname = "localhost";
  }

  return currentUrl.origin;
}

export async function signInWithGoogle(supabase: SupabaseClient) {
  const origin = getSafeBrowserOrigin();
  const redirectTo = origin ? `${origin}/auth/callback` : undefined;

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
