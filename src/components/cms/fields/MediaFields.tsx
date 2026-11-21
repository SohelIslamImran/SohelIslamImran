import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listMedia } from "../../../server/cms-history.functions";
import type { MediaAsset } from "../../../types/content";
import {
	useCmsSession,
	useDraftSelector,
	useDraftStore,
	useDraftValue,
	useField,
	useIssuesUnder,
} from "../draft/context";
import { childPath, moveItem, removeItem, setAt } from "../draft/paths";
import { ChoiceSelect } from "./ChoiceFields";
import { FieldFrame, describedBy, fieldId, focusField } from "./FieldFrame";
import { RowActions } from "./ListFields";
import { TextField } from "./TextFields";

const MAX_TRAVEL_MEDIA = 30;
const NO_ASSET = "none";
const embedChoice = (id: string) => `asset:${id}`;

function mediaOption(asset: MediaAsset) {
	return { value: asset.id, label: asset.alt || asset.id, hint: asset.alt ? asset.id : undefined };
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
	if (!published || !/^[A-Za-z0-9_-]{8,160}$/u.test(assetId)) return null;
	return (
		<img
			src={`/media/${encodeURIComponent(assetId)}`}
			alt=""
			width={64}
			height={48}
			loading="lazy"
			className="h-12 w-16 rounded-[10px] border border-line bg-muted object-cover"
		/>
	);
}

const EMPTY_ASSETS: readonly MediaAsset[] = [];

function useMediaLibrary() {
	const { mediaEnabled } = useCmsSession();
	const loadMedia = useServerFn(listMedia);
	const [library, setLibrary] = useState<readonly MediaAsset[]>(EMPTY_ASSETS);
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
				setDescription(
					!result.mediaEnabled
						? "Media storage is not connected."
						: assets.length
							? undefined
							: "Add assets in the media library.",
				);
			},
			() => {
				if (current) setDescription("The media library could not be loaded.");
			},
		);
		return () => {
			current = false;
		};
	}, [loadMedia, mediaEnabled]);

	return { library, description };
}

export function MediaField({ path, label }: { path: string; label: string }) {
	const field = useField<MediaAsset | null | undefined>(path);
	const { library, description } = useMediaLibrary();
	const id = field.value?.id;
	const missing = id && !library.some((asset) => asset.id === id);
	const options = [
		{ value: NO_ASSET, label: "None" },
		...library.map((asset) => ({ ...mediaOption(asset), value: embedChoice(asset.id) })),
		...(missing ? [{ value: embedChoice(id), label: field.value?.alt || id }] : []),
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
			<div className="flex min-w-0 items-center gap-2">
				{id ? <PublishedThumbnail key={id} assetId={id} /> : null}
				<ChoiceSelect
					id={fieldId(path)}
					value={id ? embedChoice(id) : NO_ASSET}
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
				<TextField path={`${path}.alt`} label="Alt text for this image" maxLength={240} />
			) : null}
		</FieldFrame>
	);
}

export function MediaIdsField({ path }: { path: string }) {
	const field = useField<string[]>(path);
	const store = useDraftStore();
	const { library, description: libraryDescription } = useMediaLibrary();
	const draftAssets = useDraftValue<MediaAsset[]>("media");
	const issues = useIssuesUnder(path);
	const ids = field.value;
	const assets = new Map(draftAssets.map((asset) => [asset.id, asset]));
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
			{ids.length ? (
				<ol className="m-0 grid list-none gap-1 p-0" aria-labelledby={`${fieldId(path)}-label`}>
					{ids.map((id, index) => {
						const asset = assets.get(id);
						const label = asset?.alt || id;
						return (
							<li
								key={`${id}-${index}`}
								className="flex min-w-0 flex-wrap items-center gap-2 rounded-[10px] border border-line px-2 py-1"
								onKeyDown={(event) => {
									if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
									event.preventDefault();
									move(index, index + (event.key === "ArrowUp" ? -1 : 1));
								}}
							>
								<PublishedThumbnail assetId={id} />
								<span
									id={fieldId(childPath(path, index))}
									tabIndex={-1}
									className="min-w-0 flex-1 basis-28 wrap-anywhere rounded-sm text-[13px]"
								>
									{asset ? (
										label
									) : (
										<>
											<span className="font-medium text-destructive">Missing asset</span> · {id}
										</>
									)}
								</span>
								<RowActions
									label={label}
									canMoveUp={index > 0}
									canMoveDown={index < ids.length - 1}
									onMoveUp={() => move(index, index - 1)}
									onMoveDown={() => move(index, index + 1)}
									onRemove={() => {
										field.set(removeItem(ids, index));
										requestAnimationFrame(() =>
											focusField(
												ids.length > 1 ? childPath(path, Math.min(index, ids.length - 2)) : path,
											),
										);
									}}
								/>
							</li>
						);
					})}
				</ol>
			) : null}
			<ChoiceSelect
				id={fieldId(path)}
				label="Add photo"
				descriptionId={describedBy(path, true, issues)}
				invalid={issues.length > 0}
				value={null}
				placeholder="Add photo"
				options={available.map(mediaOption)}
				disabled={ids.length >= MAX_TRAVEL_MEDIA || !available.length}
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
		</FieldFrame>
	);
}
