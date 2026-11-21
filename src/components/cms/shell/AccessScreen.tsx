import { Link } from "@tanstack/react-router";
import { buttonVariants } from "../../ui/button";
import { cn } from "../../../lib/utils";

export type AccessCode = "unauthenticated" | "forbidden" | "configuration" | "unavailable";

const PUBLIC_ORIGIN = "https://sohelislamimran.com";

const COPY: Record<AccessCode, { title: string; body: string; action: string; log: string }> = {
	unauthenticated: {
		title: "Sign-in required.",
		body: "This console is owner-only. Sign in through Cloudflare Access to continue.",
		action: "Sign in",
		log: "no access assertion on this request",
	},
	forbidden: {
		title: "This console is owner-only.",
		body: "You are signed in, but this account is not the owner.",
		action: "Try again",
		log: "identity is not on the owner allowlist",
	},
	configuration: {
		title: "The console is not ready.",
		body: "Access is not configured on this Worker yet.",
		action: "Try again",
		log: "access team or audience missing",
	},
	unavailable: {
		title: "The console is temporarily unavailable.",
		body: "The content store did not answer. Try again in a moment.",
		action: "Try again",
		log: "storage did not respond",
	},
};

/** Full-page state for a CMS request that did not pass the owner gate. */
export function AccessScreen({ code }: { code: AccessCode }) {
	const copy = COPY[code];
	return (
		<main
			id="main-content"
			tabIndex={-1}
			data-slot="cms-access"
			className="cms-root grid min-h-svh place-items-center px-4 py-10"
		>
			<div className="cms-panel grid w-full max-w-[480px] gap-6 p-[clamp(20px,4vw,32px)]">
				<p className="mono-label m-0 text-primary-text">Control plane · access</p>
				<div className="grid gap-3">
					<h1 className="m-0 text-headline">{copy.title}</h1>
					<p className="m-0 text-[15px] text-muted-foreground">{copy.body}</p>
				</div>
				<p className="m-0 rounded-[10px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)] px-3 py-2.5 font-mono text-[12px] text-ink-soft">
					<span className="text-destructive" aria-hidden="true">
						✗{" "}
					</span>
					access · {copy.log}
				</p>
				<div className="flex flex-wrap gap-2.5">
					{/* A full document load, so Cloudflare Access can intercept and sign in. */}
					<Link className={cn(buttonVariants())} to="/cms" reloadDocument>
						{copy.action} <span aria-hidden="true">↗</span>
					</Link>
					<a className={cn(buttonVariants({ variant: "outline" }))} href={PUBLIC_ORIGIN}>
						Open the public site <span aria-hidden="true">→</span>
					</a>
				</div>
			</div>
		</main>
	);
}
