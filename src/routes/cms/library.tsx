/**
 * Media library page (`/cms/library`, served at `/library` on the CMS host;
 * `/media/:id` stays the public asset delivery route).
 *
 * Leads with the asset list and an "Add media" toggle that reveals the upload
 * form (keeping the upload form visible in the empty state). When R2 (`MEDIA`)
 * is unbound, shows one "storage isn't connected" card instead.
 */
import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	EmptyState,
	PageHeader,
	controlClass,
	pageClass,
	staggerStyle,
} from "../../components/cms/analytics/Widgets";
import { useCmsSession, usePublicOrigin } from "../../components/cms/draft/context";
import { AssetCard } from "../../components/cms/library/AssetCard";
import { StorageDisconnectedCard } from "../../components/cms/library/StorageCard";
import { UploadPanel } from "../../components/cms/library/UploadPanel";
import {
	AlertTriangleIcon,
	MediaLibraryIcon,
	UploadIcon,
} from "../../components/cms/shell/cms-icons";
import { Button } from "../../components/ui/button";
import { listMedia } from "../../server/cms-history.functions";
import type { MediaLibraryItem } from "../../server/media.server";

const UPLOAD_PANEL_ID = "cms-library-upload";

export const Route = createFileRoute("/cms/library")({
	head: () => ({
		meta: [{ title: "Media library · Control plane" }],
	}),
	component: LibraryRoute,
});

function LibraryRoute() {
	const { csrfToken, mediaEnabled: sessionMediaEnabled } = useCmsSession();
	const publicOrigin = usePublicOrigin();
	const fetchMedia = useServerFn(listMedia);

	const [mediaEnabled, setMediaEnabled] = useState(sessionMediaEnabled);
	const [items, setItems] = useState<MediaLibraryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [uploadOpen, setUploadOpen] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await fetchMedia();
			setMediaEnabled(result.mediaEnabled);
			setItems(result.items);
		} catch {
			setError("Could not load media.");
		} finally {
			setLoading(false);
		}
	}, [fetchMedia]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleUpdated = (id: string, alt: string, updatedAt: string) => {
		setItems((prev) => prev.map((item) => (item.id === id ? { ...item, alt, updatedAt } : item)));
	};

	const isEmpty = !loading && !error && items.length === 0;
	const showUploadPanel = mediaEnabled && (uploadOpen || isEmpty);

	return (
		<div className={pageClass}>
			<PageHeader
				title="Media library"
				description="Images, PDFs, and default alt text for attachments."
				actions={
					mediaEnabled && !isEmpty ? (
						<Button
							type="button"
							variant={uploadOpen ? "outline" : "default"}
							size="sm"
							aria-expanded={uploadOpen}
							aria-controls={UPLOAD_PANEL_ID}
							onClick={() => setUploadOpen((open) => !open)}
							className="max-sm:min-h-11 pointer-coarse:min-h-11"
						>
							<UploadIcon className="size-3.5" />
							<span>{uploadOpen ? "Close upload" : "Add media"}</span>
						</Button>
					) : undefined
				}
			/>

			{!mediaEnabled ? (
				<StorageDisconnectedCard hasAssets={items.length > 0} />
			) : showUploadPanel ? (
				<UploadPanel
					id={UPLOAD_PANEL_ID}
					csrfToken={csrfToken}
					onUploaded={load}
					onClose={items.length > 0 ? () => setUploadOpen(false) : undefined}
				/>
			) : null}

			{error ? (
				<section className="cms-panel">
					<EmptyState
						icon={<AlertTriangleIcon className="size-4 text-destructive" />}
						title="Could not load the media library"
						description={error}
						action={
							<button type="button" className={controlClass} onClick={() => void load()}>
								Try again
							</button>
						}
					/>
				</section>
			) : loading && items.length === 0 ? (
				mediaEnabled ? (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{[0, 1, 2].map((slot) => (
							<div key={slot} className="cms-panel overflow-hidden">
								<div className="cms-skeleton aspect-[16/10] w-full rounded-none" />
								<div className="grid gap-3 p-4">
									<div className="cms-skeleton h-9 w-full" />
									<div className="cms-skeleton h-3.5 w-3/4" />
									<div className="cms-skeleton h-6 w-1/2" />
								</div>
							</div>
						))}
					</div>
				) : null
			) : items.length === 0 ? (
				mediaEnabled ? (
					<section style={staggerStyle(1)} className="cms-panel cms-enter">
						<EmptyState
							icon={<MediaLibraryIcon className="size-5" />}
							title="No media yet"
							description="Drop an image or PDF above to start your library."
						/>
					</section>
				) : null
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((asset, idx) => (
						<AssetCard
							key={asset.id}
							asset={asset}
							csrfToken={csrfToken}
							publicOrigin={publicOrigin}
							stagger={Math.min(idx, 8)}
							onUpdated={handleUpdated}
						/>
					))}
				</div>
			)}
		</div>
	);
}
