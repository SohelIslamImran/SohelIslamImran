import { Counter } from "./TextFields";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, Reorder } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { listMedia } from "../../../server/cms-history.functions";
import type { MediaAsset } from "../../../types/content";
import {
	useCmsSession,
	useDraftSelector,
	useDraftStore,
	useField,
	useIssuesUnder,
} from "../draft/context";
import { childPath, setAt } from "../draft/paths";
import { MediaFrame } from "../library/MediaFrame";
import { mediaTypeShortLabel } from "../../../lib/media-policy";
import { ChevronRightIcon, ImageIcon } from "./field-icons";
import { ChoiceSelect } from "./ChoiceFields";
import { FieldFrame, describedBy, fieldId, focusField } from "./FieldFrame";
import { RowMenu } from "./RowControls";
import { SortableRow, useReorderFeedback } from "./SortableRow";
import { UndoRemoval, usePendingRemovals } from "./UndoRemoval";
import { sameValue } from "./row-list";
import { TextAreaField } from "./TextFields";

const MAX_TRAVEL_MEDIA = 30;
const NO_ASSET = "none";
const embedChoice = (id: string) => `asset:${id}`;

function mediaOption(asset: MediaAsset) {
	return {
		value: asset.id,
		label: asset.alt || asset.id,
		hint: asset.alt ? asset.id : undefined,
		thumbnail: (
			<MediaFrame
				key={asset.id}
				assetId={asset.id}
				mimeType={asset.mimeType}
				width={asset.width}
				height={asset.height}
				className="cms-media-thumbnail"
			/>
		),
	};
}

const EMPTY_ASSETS: readonly MediaAsset[] = [];

function useMediaLibrary() {
	const { mediaEnabled } = useCmsSession();
	const loadMedia = useServerFn(listMedia);
	const [library, setLibrary] = useState<readonly MediaAsset[]>(EMPTY_ASSETS);
	const [loading, setLoading] = useState(mediaEnabled);
	const [description, setDescription] = useState<string | undefined>(
		mediaEnabled ? "Loading media library…" : "Media storage is not connected.",
	);

	useEffect(() => {
		if (!mediaEnabled) return;
		let current = true;
		void loadMedia({ data: { includeAttachments: true } }).then(
			(result) => {
				if (!current) return;
				const assets = result.items.flatMap((item) => (item.attachment ? [item.attachment] : []));
				setLibrary(assets);
				setLoading(false);
				setDescription(
					!result.mediaEnabled
						? "Media storage is not connected."
						: assets.length
							? undefined
							: "Add assets in the media library.",
				);
			},
			() => {
				if (current) {
					setDescription("The media library could not be loaded.");
					setLoading(false);
				}
			},
		);
		return () => {
			current = false;
		};
	}, [loadMedia, mediaEnabled]);

	return { library, description, loading, mediaEnabled };
}

export function MediaField({ path, label }: { path: string; label: string }) {
	const field = useField<MediaAsset | null | undefined>(path);
	const { library, description, loading, mediaEnabled } = useMediaLibrary();
	const id = field.value?.id;
	const missing = id && !library.some((asset) => asset.id === id);
	const options = [
		{ value: NO_ASSET, label: "None" },
		...library.map((asset) => ({ ...mediaOption(asset), value: embedChoice(asset.id) })),
		...(missing
			? [
					{
						value: embedChoice(id),
						label: field.value?.alt || id,
						thumbnail: (
							<MediaFrame
								assetId={id}
								mimeType={field.value?.mimeType}
								width={field.value?.width}
								height={field.value?.height}
								className="cms-media-thumbnail"
							/>
						),
					},
				]
			: []),
	];
	const issues = useIssuesUnder(path);
	const pickerIssues = issues.filter((issue) => issue.path !== `${path}.alt`);
	const libraryLink =
		mediaEnabled && !loading ? (
			<Link
				to="/cms/library"
				className="cms-press cms-page-focus -my-1 inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-xs font-medium text-primary-text no-underline hover:bg-primary-soft pointer-coarse:-my-3 pointer-coarse:min-h-11"
			>
				<span>Media library</span>
				<span aria-hidden="true">→</span>
			</Link>
		) : null;

	const asset = field.value;
	const unavailable = !loading && !id && library.length === 0;
	const descriptionId = describedBy(path, Boolean(description), pickerIssues);
	const body = (
		<>
			{asset ? (
				<MediaFrame
					assetId={asset.id}
					mimeType={asset.mimeType}
					width={asset.width}
					height={asset.height}
					className="cms-media-thumbnail"
				/>
			) : (
				<span className="cms-media-thumbnail cms-media-placeholder">
					<ImageIcon className="size-5" />
				</span>
			)}
			<span className="grid min-w-0">
				<span className="truncate font-medium">
					{asset ? asset.alt || asset.id : unavailable ? "No images yet" : "Choose image"}
				</span>
				<span className="text-xs text-muted-foreground tabular-nums">
					{asset
						? [
								asset.mimeType && mediaTypeShortLabel(asset.mimeType),
								asset.width && asset.height ? `${asset.width}×${asset.height}` : null,
							]
								.filter(Boolean)
								.join(" · ")
						: unavailable
							? "Upload in Media library"
							: "From the media library"}
				</span>
			</span>
		</>
	);
	return (
		<FieldFrame
			path={path}
			label={label}
			asGroup={unavailable}
			description={description}
			issues={pickerIssues}
			changed={field.changed}
			onRevert={field.revert}
			meta={libraryLink}
		>
			<div className="grid min-w-0 gap-3">
				{loading ? (
					<button
						type="button"
						id={fieldId(path)}
						className="cms-control cms-media-card"
						disabled
						aria-busy="true"
						aria-label={`${label}, loading media`}
					>
						<span className="cms-media-thumbnail cms-skeleton" />
						<span className="grid gap-[7px]">
							<span className="cms-skeleton h-2.5 w-36 max-w-full rounded-sm" />
							<span className="cms-skeleton h-2 w-24 max-w-full rounded-sm" />
						</span>
					</button>
				) : unavailable ? (
					<div
						id={fieldId(path)}
						tabIndex={-1}
						className="cms-input cms-media-card"
						data-disabled=""
						data-invalid={pickerIssues.length > 0 || undefined}
						aria-describedby={descriptionId}
					>
						{body}
					</div>
				) : (
					<ChoiceSelect
						id={fieldId(path)}
						trigger="media"
						triggerContent={body}
						value={id ? embedChoice(id) : null}
						options={options}
						invalid={pickerIssues.length > 0}
						descriptionId={descriptionId}
						onChange={(next) => {
							if (next === NO_ASSET) field.set(null);
							else {
								const asset = library.find((entry) => embedChoice(entry.id) === next);
								if (asset && asset.id !== id) field.set({ ...asset });
							}
						}}
					/>
				)}
				{field.value ? (
					<div className="cms-enter">
						<TextAreaField
							singleLine
							path={`${path}.alt`}
							label="Alt text for this image"
							maxLength={240}
						/>
					</div>
				) : null}
			</div>
		</FieldFrame>
	);
}

export function MediaIdsField({ path }: { path: string }) {
	const field = useField<string[] | undefined>(path);
	const store = useDraftStore();
	const { library, description: libraryDescription, loading, mediaEnabled } = useMediaLibrary();
	const issues = useIssuesUnder(path);
	const ids = field.value ?? [];
	const available = library.filter((asset) => !ids.includes(asset.id));
	const removals = usePendingRemovals<string>(path, MAX_TRAVEL_MEDIA, sameValue);
	const { keys } = removals;
	const keysRef = useRef(keys);
	keysRef.current = keys;
	const reorderFeedback = useReorderFeedback();
	const move = (from: number, to: number) => {
		if (from === to || to < 0 || to >= ids.length) return;
		const movedKey = keysRef.current[from];
		const movedId = ids[from];
		const movedAlt = store.getState().draft.media.find((asset) => asset.id === movedId)?.alt;
		const handle = document.activeElement
			?.closest(".cms-sortable-row")
			?.querySelector<HTMLButtonElement>("[data-row-handle]");
		removals.move(from, to);
		if (movedKey !== undefined) {
			reorderFeedback.markMoved(movedKey, movedAlt || `Photo ${from + 1}`, from, to, ids.length);
		}
		requestAnimationFrame(() => {
			if (handle?.isConnected && !handle.closest("[inert]")) {
				handle.focus({ preventScroll: true });
			} else focusField(childPath(path, to));
		});
	};
	const description =
		libraryDescription ??
		(available.length ? "Photos appear in this order." : "All library assets are attached.");
	return (
		<FieldFrame
			path={path}
			asGroup
			label="Photos"
			description={description}
			issues={issues}
			changed={field.changed}
			onRevert={
				removals.restoresLive
					? undefined
					: () => {
							removals.clear();
							field.revert();
						}
			}
			meta={
				<>
					{mediaEnabled && !loading ? (
						<Link
							to="/cms/library"
							className="cms-press cms-page-focus -my-1 inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-xs font-medium text-primary-text no-underline hover:bg-primary-soft pointer-coarse:-my-3 pointer-coarse:min-h-11"
						>
							<span>Media library</span>
							<span aria-hidden="true">→</span>
						</Link>
					) : null}
					<Counter length={ids.length} max={MAX_TRAVEL_MEDIA} />
				</>
			}
		>
			<Reorder.Group
				as="ol"
				axis="y"
				values={keys}
				onReorder={removals.reorder}
				className="m-0 mb-2 grid list-none gap-2 p-0 empty:hidden"
				aria-labelledby={`${fieldId(path)}-label`}
			>
				<AnimatePresence initial={false}>
					{ids.map((id, index) => (
						<PhotoRow
							key={keys[index]}
							rowKey={keys[index]}
							id={id}
							path={childPath(path, index)}
							index={index}
							settled={reorderFeedback.settledKey === keys[index]}
							canMoveDown={index < ids.length - 1}
							move={move}
							onDragStart={(rowLabel) => reorderFeedback.startDrag(keys[index]!, index, rowLabel)}
							onDragEnd={() => reorderFeedback.endDrag(keysRef.current)}
							remove={(label, touch) => {
								removals.remove(index, label);
								requestAnimationFrame(() =>
									focusField(
										ids.length > 1 ? childPath(path, Math.min(index, ids.length - 2)) : path,
										touch,
									),
								);
							}}
						/>
					))}
				</AnimatePresence>
			</Reorder.Group>
			<p role="status" aria-live="polite" className="sr-only">
				{reorderFeedback.announcement}
			</p>
			<ChoiceSelect
				id={fieldId(path)}
				label="Add photo"
				disabled={loading || ids.length >= MAX_TRAVEL_MEDIA || !available.length}
				descriptionId={describedBy(path, true, issues)}
				invalid={issues.length > 0}
				value={null}
				placeholder={loading ? "Loading media…" : "Add photo"}
				options={available.map(mediaOption)}
				onChange={(id) => {
					const asset = available.find((entry) => entry.id === id);
					if (!asset) return;
					const draft = store.getState().draft;
					const withAttachment = setAt(draft, path, [...ids, id]);
					store.update(
						[],
						draft.media.some((entry) => entry.id === id)
							? withAttachment
							: { ...withAttachment, media: [...draft.media, asset] },
					);
				}}
			/>
			{removals.removals.map((removal) => (
				<UndoRemoval
					key={removal.id}
					removal={removal}
					onDismiss={() => {
						removals.dismiss(removal.id);
						focusField(path);
					}}
					onUndo={() => {
						const index = removals.undo(removal.id);
						if (index !== undefined)
							requestAnimationFrame(() => focusField(childPath(path, index)));
					}}
				/>
			))}
		</FieldFrame>
	);
}

function PhotoRow({
	rowKey,
	id,
	path,
	index,
	settled,
	canMoveDown,
	move,
	onDragStart,
	onDragEnd,
	remove,
}: {
	rowKey: number;
	id: string;
	path: string;
	index: number;
	settled: boolean;
	canMoveDown: boolean;
	move: (from: number, to: number) => void;
	onDragStart: (label: string) => void;
	onDragEnd: () => void;
	remove: (label: string, touch: boolean) => void;
}) {
	const [assetIndex, alt, mimeType, width, height] = useDraftSelector(({ draft }) => {
		const index = draft.media.findIndex((asset) => asset.id === id);
		const asset = draft.media[index];
		return [index, asset?.alt, asset?.mimeType, asset?.width, asset?.height] as const;
	});
	const label = alt || `Photo ${index + 1}`;
	return (
		<SortableRow
			value={rowKey}
			settled={settled}
			reorderable={index > 0 || canMoveDown}
			label={label}
			className="cms-repeater-row p-2"
			onMove={(offset) => move(index, index + offset)}
			onDragStart={() => onDragStart(label)}
			onDragEnd={onDragEnd}
		>
			{(handle) => (
				<>
					<div className="flex min-w-0 flex-wrap items-center gap-2">
						{handle}
						<MediaFrame
							assetId={id}
							mimeType={mimeType}
							width={width}
							height={height}
							className="cms-media-thumbnail"
						/>
						<span
							id={fieldId(path)}
							tabIndex={-1}
							className="min-w-0 flex-1 basis-20 wrap-anywhere rounded-sm text-[13px]"
						>
							{assetIndex >= 0 ? (
								label
							) : (
								<>
									<span className="text-destructive">Missing asset</span> · {id}
								</>
							)}
						</span>
						<RowMenu
							label={label}
							canMoveUp={index > 0}
							canMoveDown={canMoveDown}
							onMoveUp={() => move(index, index - 1)}
							onMoveDown={() => move(index, index + 1)}
							onRemove={(touch) => remove(label, touch)}
						/>
					</div>
					{assetIndex >= 0 ? (
						<details className="cms-disclosure pt-1">
							<summary className="cms-repeater-summary text-[13px]">
								<ChevronRightIcon className="cms-disclosure-chevron size-3.5 text-muted-foreground" />
								Edit alt text
							</summary>
							<div className="px-2 pb-2">
								<TextAreaField
									singleLine
									path={`media[${assetIndex}].alt`}
									label="Alt text"
									description="Used wherever this photo appears in travel entries."
									maxLength={240}
								/>
							</div>
						</details>
					) : null}
				</>
			)}
		</SortableRow>
	);
}
