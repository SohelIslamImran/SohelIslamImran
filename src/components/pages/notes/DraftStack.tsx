import { useRef, type CSSProperties } from "react";
import { useDepthTilt } from "../../work/useDepthTilt";

/**
 * A stack of blank sheets, and on top a draft that is honest about itself:
 * its front matter says it is a draft with nothing published, and the only
 * line written so far is the empty state's own headline, typed in once (pure
 * CSS, so it plays without JavaScript and is instant under reduced motion).
 * The pointer, the device, or a scroll tilt on touch turns the stack.
 * Decorative: the page states the same facts in text.
 */
export function DraftStack({
	headline,
	origin,
	published,
}: {
	headline: string;
	origin: string;
	published: number;
}) {
	const rigRef = useRef<HTMLDivElement>(null);
	useDepthTilt(rigRef);
	const chars = Array.from(headline);

	return (
		<div className="fn-stack" aria-hidden="true">
			<div ref={rigRef} className="fn-rig">
				{[4, 3, 2, 1].map((d) => (
					<div key={d} className="fn-sheet fn-sheet-blank" style={{ "--d": d } as CSSProperties}>
						<span className="fn-sheet-no">{String(d + 1).padStart(3, "0")}</span>
					</div>
				))}
				<div className="fn-sheet fn-sheet-draft" style={{ "--d": 0 } as CSSProperties}>
					<div className="fn-draft-bar">
						<span>field-notes / 001.md</span>
						<span className="fn-draft-badge">Draft</span>
					</div>
					<div className="fn-draft-body">
						<p className="fn-fm">---</p>
						{origin ? (
							<p className="fn-fm">
								<span className="fn-key">origin:</span> {origin}
							</p>
						) : null}
						<p className="fn-fm">
							<span className="fn-key">status:</span> draft
						</p>
						<p className="fn-fm">
							<span className="fn-key">published:</span> {published}
						</p>
						<p className="fn-fm">---</p>
						<p className="fn-typed">
							<span className="fn-hash"># </span>
							{chars.map((char, index) => (
								<span key={index} className="fn-char" style={{ "--c": index } as CSSProperties}>
									{char}
								</span>
							))}
							<span className="fn-caret" style={{ "--c": chars.length } as CSSProperties} />
						</p>
						<div className="fn-rules">
							{[88, 96, 72, 0, 92, 64].map((width, index) => (
								<span key={index} style={{ "--w": `${width}%` } as CSSProperties} />
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
