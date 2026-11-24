import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { CloseIcon } from "../shell/cms-icons";
import { CheckIcon, DuplicateIcon } from "./field-icons";

export const inputClass = "cms-input-native";

export const inputAttributes = {
	"data-1p-ignore": "",
	"data-lpignore": "true",
	"data-form-type": "other",
	autoComplete: "off",
} as const;

export const proseAttributes = {
	...inputAttributes,
	autoCapitalize: "sentences",
	autoCorrect: "on",
	spellCheck: true,
} as const;

export const identifierAttributes = {
	...inputAttributes,
	autoCapitalize: "none",
	autoCorrect: "off",
	spellCheck: false,
} as const;

export function InputShell({
	children,
	leading,
	prefix,
	trailing,
	size,
	multiline,
	invalid,
	disabled,
	readOnly,
	pending,
	className,
}: {
	children: ReactNode;
	leading?: ReactNode;
	prefix?: ReactNode;
	trailing?: ReactNode;
	size?: "sm";
	multiline?: boolean;
	invalid?: boolean;
	disabled?: boolean;
	readOnly?: boolean;
	pending?: boolean;
	className?: string;
}) {
	return (
		<div
			className={cn("cms-input", className)}
			data-size={size}
			data-multiline={multiline || undefined}
			data-invalid={invalid || undefined}
			data-disabled={disabled || undefined}
			data-readonly={readOnly || undefined}
			aria-busy={pending || undefined}
			onPointerDown={(event) => {
				if (event.button !== 0 || !(event.target instanceof Element)) return;
				if (event.target.closest("input, textarea, button, a, .cms-input-trailing")) return;
				const control = event.currentTarget.querySelector<HTMLElement>(
					"input:not(:disabled), textarea:not(:disabled)",
				);
				if (control) {
					event.preventDefault();
					control.focus();
				}
			}}
		>
			{prefix || leading ? (
				<span
					className="cms-input-leading"
					data-prefix={prefix ? "" : undefined}
					aria-hidden="true"
				>
					{prefix ?? leading}
				</span>
			) : null}
			{children}
			{trailing || pending ? (
				<span className="cms-input-trailing">
					{pending ? <span className="cms-spinner" aria-hidden="true" /> : trailing}
				</span>
			) : null}
		</div>
	);
}

type InputActionProps = { label: string; children: ReactNode } & (
	| { href: string }
	| ({ href?: never } & ComponentPropsWithoutRef<"button">)
);

export function InputAction({ label, children, ...props }: InputActionProps) {
	if (props.href !== undefined) {
		return (
			<a
				className="cms-input-action"
				href={props.href}
				target="_blank"
				rel="noreferrer"
				aria-label={label}
				title={label}
			>
				{children}
			</a>
		);
	}
	return (
		<button
			{...props}
			className={cn("cms-input-action", props.className)}
			type="button"
			aria-label={label}
			title={label}
		>
			{children}
		</button>
	);
}

export function ClearAction({ label, onClear }: { label: string; onClear: () => void }) {
	return (
		<InputAction
			label={label}
			onPointerDown={(event) => event.preventDefault()}
			onClick={(event) => {
				event.currentTarget
					.closest(".cms-input")
					?.querySelector<HTMLElement>("input, textarea")
					?.focus();
				onClear();
			}}
		>
			<CloseIcon className="cms-action-enter" />
		</InputAction>
	);
}

export function CopyAction({ text }: { text: string }) {
	const [status, setStatus] = useState("");
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	useEffect(() => () => clearTimeout(timer.current), []);
	return (
		<>
			<InputAction
				label="Copy public path"
				data-done={status === "Copied" || undefined}
				onClick={async () => {
					try {
						await navigator.clipboard.writeText(text);
						setStatus("Copied");
					} catch {
						setStatus("Copy failed");
					}
					clearTimeout(timer.current);
					timer.current = setTimeout(() => setStatus(""), 1200);
				}}
			>
				{status === "Copied" ? <CheckIcon className="cms-action-enter" /> : <DuplicateIcon />}
			</InputAction>
			<span className="sr-only" role="status">
				{status}
			</span>
		</>
	);
}
