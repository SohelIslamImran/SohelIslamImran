export interface PublishStep {
	step: "save" | "publish" | "live";
	text: string;
	unconfirmed?: boolean;
}

export function publishStep({
	status,
	revision,
	dirty,
	ahead,
	attempting,
	unconfirmed,
	published,
}: {
	status: "idle" | "saving" | "publishing" | "error" | "conflict";
	revision: number;
	dirty: boolean;
	ahead: boolean;
	attempting: boolean;
	unconfirmed: boolean;
	published: boolean;
}): PublishStep | null {
	if (status === "conflict") return null;
	if (published) return { step: "live", text: `Live r${revision}.` };
	if (status === "publishing") return { step: "publish", text: `Publishing r${revision}…` };
	if (attempting && status === "saving") return { step: "save", text: "Saving draft…" };
	if (unconfirmed) {
		return {
			step: "publish",
			text: `Publish not confirmed. Retrying is safe: if r${revision} already went live, it won't publish twice.`,
			unconfirmed: true,
		};
	}
	if (dirty) return { step: "save", text: "Unsaved edits will be saved first." };
	return ahead ? { step: "publish", text: `Ready to publish r${revision}.` } : null;
}
