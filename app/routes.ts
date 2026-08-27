import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("work", "routes/work.tsx"),
  route("story", "routes/story.tsx"),
  route("field-notes", "routes/field-notes.tsx"),
  route("resume", "routes/resume.tsx"),
  route("links", "routes/links.tsx"),
  route("links/:linkId", "routes/link-redirect.tsx"),
  route("resume/edit", "routes/editor.tsx"),
  route("resume/edit/media", "routes/editor-media.tsx"),
  route("media/:assetId", "routes/media.tsx"),
  route("robots.txt", "routes/robots.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("rss.xml", "routes/rss.ts"),
] satisfies RouteConfig;
