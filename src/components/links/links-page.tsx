import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";
import { profile, profileLinks, type ProfileLink } from "@/data/folio";
import { Tilt } from "@/components/site/tilt";
import { LinkMark } from "./marks";

const linksRoute = getRouteApi("/links");

function Card({ link }: { link: ProfileLink }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const url = new URL(`/links/${link.id}`, window.location.origin).toString();
    void navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }
  return (
    <Tilt className={link.featured ? "md:col-span-2" : undefined}>
      <article className="glass glass-spec relative overflow-hidden rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-4">
          <p className="kicker">{link.platform}</p>
          <span className="link-mark" aria-hidden="true">
            <LinkMark id={link.id} className="size-5" />
          </span>
        </div>
        <Link
          to="/links/$linkId"
          params={{ linkId: link.id }}
          className="mt-3 inline-block font-display text-2xl md:text-3xl hover:text-primary"
        >
          {link.label}
        </Link>
        <p className="mt-2 text-sm text-muted">{link.description}</p>
        <button
          type="button"
          className="glass mt-4 min-w-24 overflow-hidden rounded-full px-3 py-1.5 text-xs"
          onClick={copy}
          aria-label={`Copy share link for ${link.label}`}
        >
          <span className="block">{copied ? "Copied" : "Copy link"}</span>
        </button>
      </article>
    </Tilt>
  );
}

export function LinksPage() {
  const data = linksRoute.useLoaderData();
  const links = data.payload.links ?? profileLinks;
  const ordered = [...links.filter((l) => l.featured), ...links.filter((l) => !l.featured)];
  return (
    <main className="page pt-28 pb-24 md:pt-36">
      <div className="mx-auto max-w-2xl text-center">
        <img
          src={profile.portrait}
          alt={profile.name}
          width={96}
          height={96}
          className="lens-mini mx-auto size-24 object-cover"
        />
        <p className="kicker mt-6">Filter gels on the light table</p>
        <h1 className="mt-3 text-5xl md:text-6xl">Find me where the work is.</h1>
        <p className="mt-4 text-muted">
          {profile.name} — {profile.title}. A short list of places to read, browse, or start a conversation.
        </p>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {ordered.map((link) => (
          <Card key={link.id} link={link} />
        ))}
      </div>
    </main>
  );
}
