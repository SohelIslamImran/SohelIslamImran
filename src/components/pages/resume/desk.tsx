import { useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { usePointerTilt } from "../links/usePointerTilt";

/**
 * The résumé as a sheet of paper resting on two others. The pointer moves
 * the sheets *behind* (and a faint light on the front), never the sheet you
 * read, so text stays flat and crisp. Decorative layers are aria-hidden;
 * print strips all of it (see the "depth pass: resume+links" CSS block).
 */
export function ResumeDesk({ children }: { children: ReactNode }) {
	const tilt = usePointerTilt<HTMLDivElement>();
	return (
		<div data-slot="resume-desk" className="relative min-w-0" {...tilt}>
			<span aria-hidden="true" data-sheet="3" />
			<span aria-hidden="true" data-sheet="2" />
			<article data-slot="resume-sheet" aria-label="Résumé" className="relative min-w-0">
				<span aria-hidden="true" data-sheet-light="" />
				{children}
			</article>
		</div>
	);
}

function PrinterGlyph({ done }: { done: boolean }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			className="size-[18px] fill-none stroke-current stroke-[1.5] [stroke-linecap:round] [stroke-linejoin:round]"
		>
			{done ? (
				<path d="m4.5 10.4 3.4 3.2 7.6-8.1" />
			) : (
				<>
					<path d="M5.5 7.5V3.5h9v4" />
					<rect x="2.5" y="7.5" width="15" height="7" rx="2" />
					<path data-paper="" d="M5.5 12.5h9v5h-9z" />
				</>
			)}
		</svg>
	);
}

/**
 * Print / Save as PDF. The sheet lifts off the stack for a beat, then the
 * browser's print dialog opens (where "Save as PDF" lives).
 */
export function PrintButton() {
	const [status, setStatus] = useState<"idle" | "lifting" | "done">("idle");
	const timer = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(timer.current), []);

	const desk = () => document.querySelector<HTMLElement>('[data-slot="resume-desk"]');
	const run = () => {
		if (status === "lifting") return;
		window.clearTimeout(timer.current);
		const delay = prefersReducedMotion() ? 0 : 340;
		desk()?.setAttribute("data-printing", "");
		setStatus("lifting");
		timer.current = window.setTimeout(() => {
			window.print();
			desk()?.removeAttribute("data-printing");
			setStatus("done");
			timer.current = window.setTimeout(() => setStatus("idle"), 2200);
		}, delay);
	};

	return (
		<Button
			size="lg"
			type="button"
			data-status={status}
			onClick={run}
			aria-describedby="resume-print-note"
			className="sm:min-w-[13.5rem]"
		>
			<PrinterGlyph done={status === "done"} />
			<span aria-live="polite">
				{status === "lifting" ? (
					"Opening print…"
				) : status === "done" ? (
					"Ready again"
				) : (
					<>
						<span className="sm:hidden">Save as PDF</span>
						<span className="max-sm:hidden">Print / Save as PDF</span>
					</>
				)}
			</span>
		</Button>
	);
}
