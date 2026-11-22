import { createLink } from "@tanstack/react-router";
import type { ComponentPropsWithRef } from "react";

// The router derives its default aria-current from the requested location.
// The rail supplies it from the committed match instead.
export const RailRouterLink = createLink(function RailAnchor({
	currentPage,
	...props
}: ComponentPropsWithRef<"a"> & { currentPage?: boolean }) {
	return <a {...props} aria-current={currentPage ? "page" : undefined} />;
});
