import { createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Folio" }] }),
  component: Login,
});

function Login() {
  return (
    <main className="page flex min-h-[80dvh] items-center justify-center py-24">
      <div className="glass glass-spec w-full max-w-md rounded-[32px] p-8">
        <p className="kicker">Studio</p>
        <h1 className="mt-3 text-4xl">Enter the instrument.</h1>
        <p className="mt-3 text-sm text-muted">
          Sign in with Google or X. The studio opens only for the owner account
          (sohelislamimran@gmail.com).
        </p>
        <div className="mt-6 space-y-3">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/studio" })}
                className="btn btn-ghost w-full"
              >
                Continue with {p.label}
              </button>
            ))
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
      </div>
    </main>
  );
}
