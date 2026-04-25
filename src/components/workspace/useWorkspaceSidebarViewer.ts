"use client";

import { useEffect, useMemo, useState } from "react";
import { type User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

function getDisplayName(fullName: string | null, email: string | null, fallback: string) {
  const trimmedName = typeof fullName === "string" ? fullName.trim() : "";
  if (trimmedName) {
    return trimmedName;
  }

  const trimmedEmail = typeof email === "string" ? email.trim() : "";
  if (trimmedEmail) {
    return trimmedEmail.split("@")[0] || fallback;
  }

  return fallback;
}

export function useWorkspaceSidebarViewer(fallbackViewerName: string) {
  const supabase = useMemo(() => createClient(), []);
  const [viewerName, setViewerName] = useState(fallbackViewerName);

  useEffect(() => {
    let active = true;

    async function resolveViewer(nextUser?: User | null) {
      const authUser =
        typeof nextUser === "undefined"
          ? (await supabase.auth.getUser()).data.user
          : nextUser;

      if (!active) {
        return;
      }

      if (!authUser) {
        setViewerName(fallbackViewerName);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!active) {
        return;
      }

      setViewerName(
        getDisplayName(
          typeof profile?.full_name === "string" ? profile.full_name : null,
          typeof profile?.email === "string" ? profile.email : authUser.email ?? null,
          fallbackViewerName,
        ),
      );
    }

    void resolveViewer();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveViewer(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fallbackViewerName, supabase]);

  return viewerName;
}
