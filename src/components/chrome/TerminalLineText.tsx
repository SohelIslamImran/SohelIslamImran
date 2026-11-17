/**
 * One terminal line. A line with a description (help, ls work, ls links) is a
 * two-column row whose name column is the same width on every row; on a
 * narrow interface the description drops under the name instead of wrapping
 * into a wall of space-padded text.
 */
export function TerminalLineText({ text, description }: { text: string; description?: string }) {
	if (!description) return <>{text}</>;
	return (
		<span className="grid grid-cols-[minmax(0,26ch)_minmax(0,1fr)] gap-x-4 max-[480px]:grid-cols-1">
			<span>{text}</span>
			<span className="max-[480px]:pl-[2ch] max-[480px]:text-muted-foreground">{description}</span>
		</span>
	);
}
