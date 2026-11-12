import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CopyStatus = "idle" | "copied" | "failed";

async function writeClipboard(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// Fall through to the legacy path (insecure origins, denied permission).
	}
	try {
		const field = document.createElement("textarea");
		field.value = text;
		field.setAttribute("readonly", "");
		field.style.position = "fixed";
		field.style.opacity = "0";
		document.body.appendChild(field);
		field.select();
		const ok = document.execCommand("copy");
		field.remove();
		return ok;
	} catch {
		return false;
	}
}

/** Copy text and expose a short-lived status for UI feedback. */
export function useCopyToClipboard(resetAfter = 1800) {
	const [status, setStatus] = useState<CopyStatus>("idle");
	const timerRef = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(timerRef.current), []);
	const copy = useCallback(
		async (text: string) => {
			const ok = await writeClipboard(text);
			setStatus(ok ? "copied" : "failed");
			window.clearTimeout(timerRef.current);
			timerRef.current = window.setTimeout(() => setStatus("idle"), resetAfter);
			return ok;
		},
		[resetAfter],
	);
	return { status, copied: status === "copied", copy };
}

function CopyGlyph({ status }: { status: CopyStatus }) {
	return (
		<span className="relative grid size-4 place-items-center" aria-hidden="true">
			<svg
				viewBox="0 0 16 16"
				className={cn(
					"col-start-1 row-start-1 size-4 fill-none stroke-current stroke-[1.4] transition-[opacity,scale] duration-200 ease-trace [stroke-linejoin:round]",
					status === "idle" ? "scale-100 opacity-100" : "scale-50 opacity-0",
				)}
			>
				<rect x="5.25" y="5.25" width="8" height="8" rx="2" />
				<path d="M10.75 5.25v-1.5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1.5" />
			</svg>
			<svg
				viewBox="0 0 16 16"
				className={cn(
					"absolute size-4 fill-none stroke-current stroke-[1.8] transition-[opacity,scale] duration-200 ease-trace [stroke-linecap:round] [stroke-linejoin:round]",
					status === "copied" ? "scale-100 opacity-100" : "scale-50 opacity-0",
				)}
			>
				<path d="m3.5 8.4 3 2.85 6-6.5" />
			</svg>
			<svg
				viewBox="0 0 16 16"
				className={cn(
					"absolute size-4 fill-none stroke-current stroke-[1.6] transition-[opacity,scale] duration-200 ease-trace [stroke-linecap:round]",
					status === "failed" ? "scale-100 opacity-100" : "scale-50 opacity-0",
				)}
			>
				<path d="M8 4.5v4.25M8 11.5v.01" />
			</svg>
		</span>
	);
}

type CopyButtonProps = {
	/** Text written to the clipboard. */
	value: string;
	/** Visible label. Defaults to "Copy". Pass `null` for an icon-only button (then set `aria-label`). */
	label?: ReactNode;
	copiedLabel?: ReactNode;
	failedLabel?: ReactNode;
	/** Screen reader announcement after a successful copy. */
	announcement?: string;
	onCopied?: () => void;
	className?: string;
	"aria-label"?: string;
} & VariantProps<typeof buttonVariants>;

/**
 * Button that copies `value`, morphs its icon to a check, and announces the
 * result through a polite live region.
 */
export function CopyButton({
	value,
	label = "Copy",
	copiedLabel = "Copied",
	failedLabel = "Couldn’t copy",
	announcement = "Copied to clipboard",
	onCopied,
	variant = "outline",
	size = "default",
	className,
	"aria-label": ariaLabel,
}: CopyButtonProps) {
	const { status, copy } = useCopyToClipboard();
	const text = status === "copied" ? copiedLabel : status === "failed" ? failedLabel : label;
	return (
		<>
			<button
				type="button"
				data-slot="button"
				data-status={status}
				aria-label={ariaLabel}
				className={cn(
					buttonVariants({ variant, size }),
					status === "copied" && "text-success",
					className,
				)}
				onClick={async () => {
					if (await copy(value)) onCopied?.();
				}}
			>
				<CopyGlyph status={status} />
				{label === null ? null : <span className="min-w-0">{text}</span>}
			</button>
			<span role="status" aria-live="polite" className="sr-only">
				{status === "copied"
					? announcement
					: status === "failed"
						? "Couldn’t copy. Select the text and copy it manually."
						: ""}
			</span>
		</>
	);
}
