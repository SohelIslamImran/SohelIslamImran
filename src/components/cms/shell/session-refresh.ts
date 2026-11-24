type RefreshResult<T> = { ok: true; owner: string; session: T } | { ok: false };

/** Share an owner session refresh across the draft API and its UI consumers. */
export function createSessionRefresh<T>(
	owner: string,
	read: () => Promise<RefreshResult<T>>,
	adopt: (session: T) => void,
): () => Promise<boolean> {
	let inFlight: Promise<boolean> | undefined;
	return () =>
		(inFlight ??= Promise.resolve()
			.then(read)
			.then((result) => {
				if (!result.ok || result.owner !== owner) return false;
				adopt(result.session);
				return true;
			})
			.catch(() => false)
			.finally(() => {
				inFlight = undefined;
			}));
}

export async function withCsrfRetry<T>(
	call: (csrfToken: string) => Promise<T>,
	readCsrfToken: () => string,
	refreshSession: () => Promise<boolean>,
): Promise<T> {
	const attempted = readCsrfToken();
	try {
		return await call(attempted);
	} catch (error) {
		if (
			!error ||
			typeof error !== "object" ||
			!("status" in error) ||
			error.status !== 403 ||
			(attempted === readCsrfToken() && !(await refreshSession()))
		) {
			throw error;
		}
	}
	return call(readCsrfToken());
}
