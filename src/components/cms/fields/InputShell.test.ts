import { createElement, useState, type MouseEventHandler, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClearAction, CopyAction } from "./InputShell";

vi.mock("react", { spy: true });

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe("ClearAction", () => {
	it("keeps focus on the native input and clears its value", () => {
		const focus = vi.fn();
		const querySelector = vi.fn(() => ({ focus }));
		const closest = vi.fn(() => ({ querySelector }));
		const preventDefault = vi.fn();
		let value = "search";
		const action = ClearAction({
			label: "Clear search",
			onClear: () => {
				value = "";
			},
		});

		expect(renderToStaticMarkup(action)).toContain('aria-label="Clear search"');
		action.props.onPointerDown({ preventDefault });
		action.props.onClick({ currentTarget: { closest } });

		expect(preventDefault).toHaveBeenCalledOnce();
		expect(closest).toHaveBeenCalledWith(".cms-input");
		expect(querySelector).toHaveBeenCalledWith("input, textarea");
		expect(focus).toHaveBeenCalledOnce();
		expect(value).toBe("");
	});
});

describe("CopyAction", () => {
	it.each([
		{ succeeds: true, message: "Copied" },
		{ succeeds: false, message: "Copy failed" },
	])("announces $message after writing the full path", async ({ succeeds, message }) => {
		vi.useFakeTimers();
		const text = "/links/github";
		const writeText = succeeds
			? vi.fn().mockResolvedValue(undefined)
			: vi.fn().mockRejectedValue(new Error());
		vi.stubGlobal("navigator", { clipboard: { writeText } });
		let status = "";
		// SSR has no event loop for state updates. Retain the state slot across
		// static renders and invoke the real action handler between renders.
		vi.mocked(useState).mockImplementation(() => [
			status,
			(next) => {
				if (typeof next !== "string") throw new Error("Expected a clipboard status");
				status = next;
			},
		]);
		let click: MouseEventHandler<HTMLButtonElement> | undefined;
		function CopyHarness() {
			const tree = CopyAction({ text });
			const [button] = tree.props.children as [ReactElement<{ onClick: typeof click }>];
			click = button.props.onClick;
			return tree;
		}
		const render = () => renderToStaticMarkup(createElement(CopyHarness));

		const initial = render();
		expect(initial).toContain('role="status"></span>');
		if (!click) throw new Error("Copy action has no click handler");
		await click({} as Parameters<typeof click>[0]);
		expect(writeText).toHaveBeenCalledExactlyOnceWith(text);
		const feedback = render();
		expect(feedback).toContain(`role="status">${message}</span>`);
		expect(feedback.includes('data-done="true"')).toBe(succeeds);
		vi.advanceTimersByTime(1200);
		expect(render()).toContain('role="status"></span>');
	});
});
