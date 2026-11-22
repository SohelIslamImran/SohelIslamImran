import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, Reorder } from "motion/react";
import { useEffect, useState } from "react";
import { listMedia } from "../../../server/cms-history.functions";
import type { MediaAsset } from "../../../types/content";
import {
	useCmsSession,
	useDraftSelector,
	useDraftStore,
	useField,
	useIssuesUnder,
} from "../draft/context";
import { childPath, moveItem, removeItem, setAt } from "../draft/paths";
import { MediaLibraryIcon } from "../shell/cms-icons";
import { ChoiceSelect } from "./ChoiceFields";
import { FieldFrame, describedBy, fieldId, focusField } from "./FieldFrame";
import { RowActions } from "./ListFields";
import { SortableRow } from "./SortableRow";
import { TextField } from "./TextFields";

const MAX_TRAVEL_MEDIA = 30;
const NO_ASSET = "none";
const embedChoice = (id: string) => `asset:${id}`;

function mediaOption(asset: MediaAsset) {
	return {
		value: asset.id,
		label: asset.alt || asset.id,
		hint: asset.alt ? asset.id : undefined,
		thumbnail: <PublishedThumbnail key={asset.id} assetId={asset.id} />,
	};
}

function PublishedThumbnail({ assetId }: { assetId: string }) {
	const published = useDraftSelector(
		({ published }) =>
			published.identity.avatar?.id === assetId ||
			published.projects.some((project) => project.cover?.id === assetId) ||
			published.travel.entries.some(
				(entry) => entry.visibility === "public" && entry.mediaIds.includes(assetId),
			),
	);
	const [failed, setFailed] = useState(false);
	return (
		<span className="cms-media-thumbnail" aria-hidden="true">
			{published && !failed && /^[A-Za-z0-9_-]{8,160}$/u.test(assetId) ? (
				<img
					src={`/media/${encodeURIComponent(assetId)}`}
					alt=""
					width={64}
					height={48}
					loading="lazy"
					onError={() => setFailed(true)}
				/>
			) : (
				<MediaLibraryIcon />
			)}
		</span>
	);
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
						thumbnail: <PublishedThumbnail assetId={id} />,
					},
				]
			: []),
	];
	const issues = useIssuesUnder(path);
	const pickerIssues = issues.filter((issue) => issue.path !== `${path}.alt`);

	return (
		<FieldFrame
			path={path}
			label={label}
			description={description}
			issues={pickerIssues}
			changed={field.changed}
			onRevert={field.revert}
		>
			<div className="cms-media-field grid min-w-0 gap-3" aria-busy={loading}>
				<div className="flex min-w-0 items-center gap-2.5">
					{loading ? (
						<span className="cms-skeleton h-11 w-14 shrink-0" />
					) : (
						<PublishedThumbnail key={id ?? ""} assetId={id ?? ""} />
					)}
					<ChoiceSelect
						id={fieldId(path)}
						value={id ? embedChoice(id) : null}
						placeholder={loading ? "Loading media…" : "Choose image"}
						disabled={!id && library.length === 0}
						options={options}
						invalid={pickerIssues.length > 0}
						descriptionId={describedBy(path, Boolean(description), pickerIssues)}
						onChange={(next) => {
							if (next === NO_ASSET) field.set(null);
							else {
								const asset = library.find((entry) => embedChoice(entry.id) === next);
								if (asset && asset.id !== id) field.set({ ...asset });
							}
						}}
					/>
				</div>
				{field.value ? (
					<div className="cms-enter">
						<TextField path={`${path}.alt`} label="Alt text for this image" maxLength={240} />
					</div>
				) : null}
				{mediaEnabled && !loading ? (
					<Link to="/cms/library" className="cms-editor-button cms-press justify-self-start">
						Media library <span aria-hidden="true">↗</span>
					</Link>
				) : null}
			</div>
		</FieldFrame>
	);
}

export function MediaIdsField({ path }: { path: string }) {
	const field = useField<string[]>(path);
	const store = useDraftStore();
	const { library, description: libraryDescription, loading, mediaEnabled } = useMediaLibrary();
	const issues = useIssuesUnder(path);
	const ids = field.value;
	const keys = ids.map((id, index) =>
		JSON.stringify([id, ids.slice(0, index).filter((value) => value === id).length]),
	);
	const available = library.filter((asset) => !ids.includes(asset.id));
	const move = (from: number, to: number) => {
		if (to < 0 || to >= ids.length) return;
		field.set(moveItem(ids, from, to));
		requestAnimationFrame(() => focusField(childPath(path, to)));
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
			onRevert={field.revert}
			meta={
				<span className="font-mono text-[11px] text-muted-foreground">
					{ids.length}/{MAX_TRAVEL_MEDIA}
				</span>
			}
		>
			<Reorder.Group
				as="ol"
				axis="y"
				values={keys}
				onReorder={(next) => field.set(next.map((key) => ids[keys.indexOf(key)]))}
				className="m-0 grid list-none gap-2 p-0 empty:hidden"
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
							canMoveDown={index < ids.length - 1}
							move={move}
							remove={() => {
								field.set(removeItem(ids, index));
								requestAnimationFrame(() =>
									focusField(
										ids.length > 1 ? childPath(path, Math.min(index, ids.length - 2)) : path,
									),
								);
							}}
						/>
					))}
				</AnimatePresence>
			</Reorder.Group>
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
			{mediaEnabled && !loading ? (
				<Link to="/cms/library" className="cms-editor-button cms-press justify-self-start">
					Media library <span aria-hidden="true">↗</span>
				</Link>
			) : null}
		</FieldFrame>
	);
}

function PhotoRow({
	rowKey,
	id,
	path,
	index,
	canMoveDown,
	move,
	remove,
}: {
	rowKey: string;
	id: string;
	path: string;
	index: number;
	canMoveDown: boolean;
	move: (from: number, to: number) => void;
	remove: () => void;
}) {
	const [assetIndex, alt] = useDraftSelector(({ draft }) => {
		const index = draft.media.findIndex((asset) => asset.id === id);
		return [index, draft.media[index]?.alt] as const;
	});
	const label = alt || `Photo ${index + 1}`;
	return (
		<SortableRow
			value={rowKey}
			reorderable={index > 0 || canMoveDown}
			label={label}
			className="cms-repeater-row p-2"
			onKeyDown={(event) => {
				if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
				event.preventDefault();
				move(index, index + (event.key === "ArrowUp" ? -1 : 1));
			}}
		>
			{(handle) => (
				<>
					<div className="flex min-w-0 flex-wrap items-center gap-2">
						{handle}
						<PublishedThumbnail assetId={id} />
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
						<RowActions
							label={label}
							canMoveUp={index > 0}
							canMoveDown={canMoveDown}
							onMoveUp={() => move(index, index - 1)}
							onMoveDown={() => move(index, index + 1)}
							onRemove={remove}
						/>
					</div>
					{assetIndex >= 0 ? (
						<details className="pt-1">
							<summary className="cms-repeater-summary cms-press text-[13px]">
								Edit alt text
							</summary>
							<div className="cms-enter px-2 pb-2">
								<TextField
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
