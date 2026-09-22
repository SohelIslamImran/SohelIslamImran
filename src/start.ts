import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

const csrfMiddleware = createCsrfMiddleware({
	filter: (context) => context.handlerType === "serverFn",
});

/** Shared TanStack Start instance for server functions and middleware as routes migrate. */
export const startInstance = createStart(() => ({
	requestMiddleware: [csrfMiddleware],
}));
