"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // If there's a ?code= param, forward to the server-side callback for PKCE exchange
    const code = searchParams.get("code");
    if (code) {
      const next = searchParams.get("next") ?? "/";
      router.replace(`/auth/callback?code=${code}&next=${next}`);
      return;
    }

    // Otherwise, listen for hash-fragment-based auth events (magic links, implicit flow)
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          router.replace("/reset-password");
        } else if (event === "SIGNED_IN") {
          router.replace("/");
        }
      }
    );

    // Timeout fallback — if nothing happens within 5s, redirect to login
    const timeout = setTimeout(() => {
      router.replace("/login?error=auth");
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, searchParams]);

  return (
    <div className="text-center">
      <span className="loading-spinner w-8 h-8 mb-4 inline-block" />
      <p className="text-secondary">Confirming your account...</p>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Suspense
        fallback={
          <div className="text-center">
            <span className="loading-spinner w-8 h-8 mb-4 inline-block" />
            <p className="text-secondary">Confirming your account...</p>
          </div>
        }
      >
        <AuthConfirmInner />
      </Suspense>
    </main>
  );
}
