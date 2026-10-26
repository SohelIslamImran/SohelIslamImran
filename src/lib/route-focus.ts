/**
 * Route transition helpers.
 *
 * The root route keys its outlet on the deepest *committed* match rather than on
 * `location.pathname`. The location updates the instant navigation starts, but
 * async loaders have not resolved yet, so keying on it remounts the outlet while
 * the outgoing page is still mounted — the focus effect then lands on the
 * outgoing <main>, which unmounts a frame later and drops focus to <body>.
 * The committed match id only changes once the incoming route has rendered.
 */

interface CommittedMatchLike {
	id: string;
}

/**
 * Stable key for the rendered route. Falls back to the pathname when no match
 * is committed (first render on the server, or before the router has matched).
 */
export function resolveCommittedRouteKey(
	matches: readonly CommittedMatchLike[],
	pathname: string,
): string {
	return matches[matches.length - 1]?.id ?? pathname;
}
