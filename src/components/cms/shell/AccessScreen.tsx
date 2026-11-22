import { Link } from "@tanstack/react-router";
import { buttonVariants } from "../../ui/button";
import { ExternalArrowIcon, LockIcon } from "./cms-icons";

export type AccessCode = "unauthenticated" | "forbidden" | "configuration" | "unavailable";

const COPY: Record<AccessCode, { title: string; body: string; action: string }> = {
	unauthenticated: {
		title: "Sign in to Control plane",
		body: "Continue with your owner account through Cloudflare Access.",
		action: "Sign in",
	},
	forbidden: {
		title: "Owner access required",
		body: "Try signing in with the account that owns this workspace.",
		action: "Try again",
	},
	configuration: {
		title: "Access setup incomplete",
		body: "The workspace will be available once Cloudflare Access is configured.",
		action: "Try again",
	},
	unavailable: {
		title: "Workspace unavailable",
		body: "The content store is temporarily unavailable. Try again in a moment.",
		action: "Try again",
	},
};

export function AccessScreen({ code }: { code: AccessCode }) {
	const copy = COPY[code];
	return (
		<main
			id="main-content"
			tabIndex={-1}
			data-slot="cms-access"
			className="cms-root cms-access grid min-h-svh place-items-center px-4 py-10"
		>
			<div className="cms-panel cms-access-panel grid w-full max-w-[420px] justify-items-start gap-5 p-[clamp(24px,5vw,36px)]">
				<span className="grid size-12 place-items-center rounded-[14px] border border-primary-line bg-primary-soft text-primary-text">
					<LockIcon className="size-6" />
				</span>
				<div className="grid gap-2">
					<h1 className="m-0 text-[clamp(24px,4vw,30px)] leading-tight font-semibold tracking-[-0.025em]">
						{copy.title}
					</h1>
					<p className="m-0 text-[14px] leading-relaxed text-muted-foreground">{copy.body}</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Link className={buttonVariants({ size: "default" })} to="/cms" reloadDocument>
						{copy.action}
					</Link>
					<a
						className={buttonVariants({
							variant: "ghost",
							size: "default",
							className: "cms-chrome-control text-foreground",
						})}
						href="https://sohelislamimran.com"
					>
						Public site <ExternalArrowIcon />
					</a>
				</div>
			</div>
		</main>
	);
}
