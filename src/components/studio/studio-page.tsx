import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getStudioAccess, saveStudioDocument } from "@/lib/cms-owner";
import { getStudioDocument, type StudioPayload } from "@/lib/cms";

export function StudioPage() {
  const { user, isPending } = useCurrentUserState();
  const [access, setAccess] = useState<{ owner: boolean; email: string | null } | null>(null);
  const [doc, setDoc] = useState<StudioPayload | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!user) return;
    void Promise.all([getStudioAccess(), getStudioDocument()]).then(([a, d]) => {
      setAccess({ owner: a.owner, email: a.email });
      setDoc(d.payload);
    });
  }, [user]);

  if (isPending) {
    return (
      <main className="page pt-36">
        <div className="h-40 animate-pulse rounded-[32px] bg-fg/5" />
      </main>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;

  if (access && !access.owner) {
    return (
      <main className="page pt-36 pb-24">
        <h1 className="text-5xl">Locked.</h1>
        <p className="mt-4 max-w-lg text-muted">
          Signed in as {access.email ?? "this account"}. The studio only opens for
          sohelislamimran@gmail.com.
        </p>
      </main>
    );
  }

  if (!doc) {
    return (
      <main className="page pt-36">
        <div className="h-40 animate-pulse rounded-[32px] bg-fg/5" />
      </main>
    );
  }

  const save = async () => {
    setStatus("saving");
    try {
      await saveStudioDocument({ data: doc });
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main className="page pt-28 pb-24 md:pt-36">
        <p className="kicker">Enlarger · Owner studio</p>
        <h1 className="mt-3 text-5xl">Edit the plates.</h1>
        <p className="mt-3 max-w-xl text-muted">
          Sign in with Google or X using sohelislamimran@gmail.com. Changes land in the live
          document — field notes, links, and the home lede read from here.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <label className="block text-sm">
              Lede
              <textarea
                className="field mt-2"
                rows={2}

                value={doc.lede}
                onChange={(e) => setDoc({ ...doc, lede: e.target.value })}
              />
            </label>
            <label className="mt-6 block text-sm">
              Intro
              <textarea
                className="field mt-2"
                rows={3}
                value={doc.intro}

                onChange={(e) => setDoc({ ...doc, intro: e.target.value })}
              />
            </label>
            <label className="mt-6 block text-sm">
              Quote
              <textarea
                className="field mt-2"
                rows={3}
                value={doc.quote}

                onChange={(e) => setDoc({ ...doc, quote: e.target.value })}
              />
            </label>
          </div>
          <aside className="glass glass-spec h-fit rounded-[32px] p-6">
            <p className="kicker">Proof plate</p>
            <p className="mt-4 font-display text-4xl">{doc.lede}</p>
            <p className="mt-4 text-sm text-muted">{doc.intro}</p>
            <p className="mt-4 text-sm text-primary">{doc.quote}</p>
          </aside>
        </div>

        <h2 className="mt-12 text-3xl">Links</h2>
        <div className="mt-4 space-y-4">
          {doc.links.map((link, i) => (
            <div key={link.id} className="glass grid gap-3 rounded-2xl p-4 md:grid-cols-2">
              <input
                className="field"

                value={link.label}
                onChange={(e) => {
                  const links = doc.links.slice();
                  links[i] = { ...link, label: e.target.value };
                  setDoc({ ...doc, links });
                }}
              />
              <input
                className="field"

                value={link.href}
                onChange={(e) => {
                  const links = doc.links.slice();
                  links[i] = { ...link, href: e.target.value };
                  setDoc({ ...doc, links });
                }}
              />
              <input
                className="field md:col-span-2"

                value={link.description}
                onChange={(e) => {
                  const links = doc.links.slice();
                  links[i] = { ...link, description: e.target.value };
                  setDoc({ ...doc, links });
                }}
              />
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-3xl">Field notes</h2>
        <div className="mt-4 space-y-4">
          {doc.notes.map((note, i) => (
            <div key={note.id} className="glass space-y-3 rounded-2xl p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="field"

                  value={note.place}
                  onChange={(e) => {
                    const notes = doc.notes.slice();
                    notes[i] = { ...note, place: e.target.value };
                    setDoc({ ...doc, notes });
                  }}
                />
                <input
                  className="field"

                  value={note.title}
                  onChange={(e) => {
                    const notes = doc.notes.slice();
                    notes[i] = { ...note, title: e.target.value };
                    setDoc({ ...doc, notes });
                  }}
                />
              </div>
              <textarea
                className="field"

                rows={3}
                value={note.reflection}
                onChange={(e) => {
                  const notes = doc.notes.slice();
                  notes[i] = { ...note, reflection: e.target.value };
                  setDoc({ ...doc, notes });
                }}
              />
            </div>
          ))}
        </div>

        <button type="button" className="btn mt-10" onClick={() => void save()} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Retry save" : "Save live document"}
        </button>
      </main>
  );
}

