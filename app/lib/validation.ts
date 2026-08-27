import {
  CONTENT_SCHEMA_VERSION,
  type AboutContent,
  type CapabilityContent,
  type ContactContent,
  type ExperienceContent,
  type HeroContent,
  type IdentityContent,
  type LinkContent,
  type MediaAsset,
  type MetricContent,
  type PortfolioContent,
  type ProfileLinkContent,
  type ProjectContent,
  type ResumeContent,
  type SiteContent,
  type SocialLinkContent,
  type StoryChapterContent,
  type StoryContent,
  type TravelContent,
  type TravelEntryContent,
  type WritingContent,
} from "../types/content";

export const MAX_CONTENT_BYTES = 512_000;
export const MAX_COLLECTION_ITEMS = 100;

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: ValidationIssue[] };

export class ContentValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super("Portfolio content failed validation");
    this.name = "ContentValidationError";
    this.issues = issues;
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readRequiredString(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
  options: { allowEmpty?: boolean; maxLength?: number } = {},
): string {
  const value = object[key];
  const maxLength = options.maxLength ?? 4_000;

  if (typeof value !== "string") {
    issues.push({ path, message: "must be a string" });
    return "";
  }

  if (options.allowEmpty !== true && value.trim().length === 0) {
    issues.push({ path, message: "cannot be empty" });
  }

  if (value.length > maxLength) {
    issues.push({ path, message: `must be no longer than ${maxLength} characters` });
  }

  return value;
}

function readOptionalString(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
  options: { allowEmpty?: boolean; maxLength?: number } = {},
): string | undefined {
  const value = object[key];

  if (value === undefined || value === null) {
    return undefined;
  }

  const temporaryObject = { value };
  return readRequiredString(temporaryObject, "value", path, issues, {
    allowEmpty: options.allowEmpty ?? true,
    maxLength: options.maxLength,
  });
}

function readOptionalBoolean(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): boolean | undefined {
  const value = object[key];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    issues.push({ path, message: "must be a boolean" });
    return undefined;
  }

  return value;
}

function readOptionalInteger(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
  options: { min: number; max: number },
): number | undefined {
  const value = object[key];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < options.min ||
    value > options.max
  ) {
    issues.push({
      path,
      message: `must be an integer between ${options.min} and ${options.max}`,
    });
    return undefined;
  }

  return value;
}

function readOptionalNumber(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
  options: { min: number; max: number },
): number | undefined {
  const value = object[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < options.min || value > options.max) {
    issues.push({ path, message: `must be a number between ${options.min} and ${options.max}` });
    return undefined;
  }
  return value;
}

function readStringArray(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
  options: { maxItems?: number; maxLength?: number } = {},
): string[] {
  const value = object[key];
  const maxItems = options.maxItems ?? MAX_COLLECTION_ITEMS;
  const maxLength = options.maxLength ?? 240;

  if (!Array.isArray(value)) {
    issues.push({ path, message: "must be an array" });
    return [];
  }

  if (value.length > maxItems) {
    issues.push({ path, message: `must contain no more than ${maxItems} items` });
  }

  return value.slice(0, maxItems).map((item, index) => {
    if (typeof item !== "string") {
      issues.push({ path: `${path}[${index}]`, message: "must be a string" });
      return "";
    }

    if (item.length > maxLength) {
      issues.push({
        path: `${path}[${index}]`,
        message: `must be no longer than ${maxLength} characters`,
      });
    }

    return item;
  });
}

function isSafeHref(value: string): boolean {
  // Reject protocol-relative URLs (`//example.com`) even though they begin
  // with a slash. They can otherwise turn an internal-looking link into an
  // open redirect when used by /links/:linkId.
  if ((value.startsWith("/") && !value.startsWith("//")) || value.startsWith("#")) {
    return true;
  }

  if (/^(mailto|tel):/i.test(value)) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function readHref(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
  required = true,
): string {
  const value = required
    ? readRequiredString(object, key, path, issues, { maxLength: 2_000 })
    : (readOptionalString(object, key, path, issues, { maxLength: 2_000 }) ?? "");

  if (value.length > 0 && !isSafeHref(value)) {
    issues.push({ path, message: "must be an https, mailto, tel, root-relative, or hash link" });
  }

  return value;
}

function readLink(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): LinkContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path, message: "must be an object" });
    return { label: "", href: "" };
  }

  const label = readRequiredString(object, "label", `${path}.label`, issues, {
    maxLength: 120,
  });
  const href = readHref(object, "href", `${path}.href`, issues);
  const external = readOptionalBoolean(object, "external", `${path}.external`, issues);

  return external === undefined ? { label, href } : { label, href, external };
}

function readMetric(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): MetricContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path, message: "must be an object" });
    return { label: "", value: "" };
  }

  return {
    label: readRequiredString(object, "label", `${path}.label`, issues, {
      maxLength: 120,
    }),
    value: readRequiredString(object, "value", `${path}.value`, issues, {
      allowEmpty: true,
      maxLength: 240,
    }),
  };
}

function readLinkArray(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): LinkContent[] {
  const value = object[key];
  if (!Array.isArray(value)) {
    issues.push({ path, message: "must be an array" });
    return [];
  }

  if (value.length > MAX_COLLECTION_ITEMS) {
    issues.push({ path, message: `must contain no more than ${MAX_COLLECTION_ITEMS} items` });
  }

  return value
    .slice(0, MAX_COLLECTION_ITEMS)
    .map((item, index) => readLink(item, `${path}[${index}]`, issues));
}

function readMetricArray(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): MetricContent[] {
  const value = object[key];
  if (!Array.isArray(value)) {
    issues.push({ path, message: "must be an array" });
    return [];
  }

  if (value.length > MAX_COLLECTION_ITEMS) {
    issues.push({ path, message: `must contain no more than ${MAX_COLLECTION_ITEMS} items` });
  }

  return value
    .slice(0, MAX_COLLECTION_ITEMS)
    .map((item, index) => readMetric(item, `${path}[${index}]`, issues));
}

function readMedia(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): MediaAsset {
  const object = asObject(value);
  if (!object) {
    issues.push({ path, message: "must be an object" });
    return { id: "", key: "", alt: "" };
  }

  const mimeType = readOptionalString(object, "mimeType", `${path}.mimeType`, issues, {
    maxLength: 120,
  });
  const width = readOptionalInteger(object, "width", `${path}.width`, issues, {
    min: 1,
    max: 20_000,
  });
  const height = readOptionalInteger(object, "height", `${path}.height`, issues, {
    min: 1,
    max: 20_000,
  });
  const bytes = readOptionalInteger(object, "bytes", `${path}.bytes`, issues, {
    min: 0,
    max: MAX_CONTENT_BYTES * 100,
  });

  return {
    id: readRequiredString(object, "id", `${path}.id`, issues, { maxLength: 160 }),
    key: readRequiredString(object, "key", `${path}.key`, issues, { maxLength: 512 }),
    alt: readRequiredString(object, "alt", `${path}.alt`, issues, {
      allowEmpty: true,
      maxLength: 240,
    }),
    ...(mimeType === undefined ? {} : { mimeType }),
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
    ...(bytes === undefined ? {} : { bytes }),
  };
}

function readOptionalMedia(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): MediaAsset | null | undefined {
  const value = object[key];
  if (value === undefined || value === null) {
    return value === null ? null : undefined;
  }

  return readMedia(value, path, issues);
}

function readSite(value: unknown, issues: ValidationIssue[]): SiteContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path: "site", message: "must be an object" });
    return { title: "", description: "", locale: "en", theme: "ink" };
  }

  const url = readHref(object, "url", "site.url", issues, false);
  return {
    title: readRequiredString(object, "title", "site.title", issues, { maxLength: 160 }),
    description: readRequiredString(object, "description", "site.description", issues, {
      allowEmpty: true,
      maxLength: 320,
    }),
    ...(url.length === 0 ? {} : { url }),
    locale: readRequiredString(object, "locale", "site.locale", issues, { maxLength: 32 }),
    theme: readRequiredString(object, "theme", "site.theme", issues, { maxLength: 64 }),
  };
}

function readIdentity(value: unknown, issues: ValidationIssue[]): IdentityContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path: "identity", message: "must be an object" });
    return {
      name: "",
      handle: "",
      role: "",
      location: "",
      timezone: "",
      availability: "",
      email: "",
      avatar: null,
    };
  }

  const avatar = readOptionalMedia(object, "avatar", "identity.avatar", issues);
  const email = readRequiredString(object, "email", "identity.email", issues, {
    maxLength: 320,
  });
  if (email.length > 0 && !/^\S+@\S+\.\S+$/.test(email)) {
    issues.push({ path: "identity.email", message: "must be a valid email address" });
  }

  return {
    name: readRequiredString(object, "name", "identity.name", issues, { maxLength: 160 }),
    handle: readRequiredString(object, "handle", "identity.handle", issues, { maxLength: 160 }),
    role: readRequiredString(object, "role", "identity.role", issues, {
      allowEmpty: true,
      maxLength: 240,
    }),
    location: readRequiredString(object, "location", "identity.location", issues, {
      allowEmpty: true,
      maxLength: 160,
    }),
    timezone: readRequiredString(object, "timezone", "identity.timezone", issues, {
      allowEmpty: true,
      maxLength: 80,
    }),
    availability: readRequiredString(
      object,
      "availability",
      "identity.availability",
      issues,
      { allowEmpty: true, maxLength: 240 },
    ),
    email,
    ...(avatar === undefined ? {} : { avatar }),
  };
}

function readHero(value: unknown, issues: ValidationIssue[]): HeroContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path: "hero", message: "must be an object" });
    return { eyebrow: "", title: "", intro: "", actions: [], metrics: [] };
  }

  return {
    eyebrow: readRequiredString(object, "eyebrow", "hero.eyebrow", issues, {
      allowEmpty: true,
      maxLength: 160,
    }),
    title: readRequiredString(object, "title", "hero.title", issues, {
      allowEmpty: true,
      maxLength: 240,
    }),
    intro: readRequiredString(object, "intro", "hero.intro", issues, {
      allowEmpty: true,
      maxLength: 1_200,
    }),
    actions: readLinkArray(object, "actions", "hero.actions", issues),
    metrics: readMetricArray(object, "metrics", "hero.metrics", issues),
  };
}

function readAbout(value: unknown, issues: ValidationIssue[]): AboutContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path: "about", message: "must be an object" });
    return { title: "", paragraphs: [], facts: [] };
  }

  return {
    title: readRequiredString(object, "title", "about.title", issues, {
      allowEmpty: true,
      maxLength: 240,
    }),
    paragraphs: readStringArray(object, "paragraphs", "about.paragraphs", issues, {
      maxItems: 20,
      maxLength: 2_000,
    }),
    facts: readMetricArray(object, "facts", "about.facts", issues),
  };
}

function readExperienceItem(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): ExperienceContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path, message: "must be an object" });
    return {
      id: "",
      company: "",
      role: "",
      period: "",
      summary: "",
      highlights: [],
      technologies: [],
    };
  }

  const location = readOptionalString(object, "location", `${path}.location`, issues, {
    maxLength: 160,
  });
  const href = readHref(object, "href", `${path}.href`, issues, false);
  const current = readOptionalBoolean(object, "current", `${path}.current`, issues);

  return {
    id: readRequiredString(object, "id", `${path}.id`, issues, { maxLength: 160 }),
    company: readRequiredString(object, "company", `${path}.company`, issues, {
      maxLength: 240,
    }),
    role: readRequiredString(object, "role", `${path}.role`, issues, { maxLength: 240 }),
    period: readRequiredString(object, "period", `${path}.period`, issues, {
      allowEmpty: true,
      maxLength: 120,
    }),
    ...(location === undefined ? {} : { location }),
    summary: readRequiredString(object, "summary", `${path}.summary`, issues, {
      allowEmpty: true,
      maxLength: 1_200,
    }),
    highlights: readStringArray(object, "highlights", `${path}.highlights`, issues, {
      maxLength: 600,
    }),
    technologies: readStringArray(object, "technologies", `${path}.technologies`, issues),
    ...(current === undefined ? {} : { current }),
    ...(href.length === 0 ? {} : { href }),
  };
}

function readExperience(value: unknown, issues: ValidationIssue[]): ExperienceContent[] {
  if (!Array.isArray(value)) {
    issues.push({ path: "experience", message: "must be an array" });
    return [];
  }

  if (value.length > MAX_COLLECTION_ITEMS) {
    issues.push({ path: "experience", message: `must contain no more than ${MAX_COLLECTION_ITEMS} items` });
  }

  return value
    .slice(0, MAX_COLLECTION_ITEMS)
    .map((item, index) => readExperienceItem(item, `experience[${index}]`, issues));
}

function readProjectItem(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): ProjectContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path, message: "must be an object" });
    return {
      id: "",
      title: "",
      slug: "",
      summary: "",
      description: "",
      year: "",
      role: "",
      status: "",
      tags: [],
      highlights: [],
      cover: null,
    };
  }

  const href = readHref(object, "href", `${path}.href`, issues, false);
  const repository = readHref(object, "repository", `${path}.repository`, issues, false);
  const cover = readOptionalMedia(object, "cover", `${path}.cover`, issues);
  const featured = readOptionalBoolean(object, "featured", `${path}.featured`, issues);

  return {
    id: readRequiredString(object, "id", `${path}.id`, issues, { maxLength: 160 }),
    title: readRequiredString(object, "title", `${path}.title`, issues, { maxLength: 240 }),
    slug: readRequiredString(object, "slug", `${path}.slug`, issues, { maxLength: 160 }),
    summary: readRequiredString(object, "summary", `${path}.summary`, issues, {
      allowEmpty: true,
      maxLength: 600,
    }),
    description: readRequiredString(object, "description", `${path}.description`, issues, {
      allowEmpty: true,
      maxLength: 2_000,
    }),
    year: readRequiredString(object, "year", `${path}.year`, issues, {
      allowEmpty: true,
      maxLength: 32,
    }),
    role: readRequiredString(object, "role", `${path}.role`, issues, {
      allowEmpty: true,
      maxLength: 240,
    }),
    status: readRequiredString(object, "status", `${path}.status`, issues, {
      allowEmpty: true,
      maxLength: 120,
    }),
    tags: readStringArray(object, "tags", `${path}.tags`, issues),
    highlights: readStringArray(object, "highlights", `${path}.highlights`, issues, {
      maxLength: 600,
    }),
    ...(href.length === 0 ? {} : { href }),
    ...(repository.length === 0 ? {} : { repository }),
    ...(cover === undefined ? {} : { cover }),
    ...(featured === undefined ? {} : { featured }),
  };
}

function readProjects(value: unknown, issues: ValidationIssue[]): ProjectContent[] {
  if (!Array.isArray(value)) {
    issues.push({ path: "projects", message: "must be an array" });
    return [];
  }

  if (value.length > MAX_COLLECTION_ITEMS) {
    issues.push({ path: "projects", message: `must contain no more than ${MAX_COLLECTION_ITEMS} items` });
  }

  return value
    .slice(0, MAX_COLLECTION_ITEMS)
    .map((item, index) => readProjectItem(item, `projects[${index}]`, issues));
}

function readCapabilityItem(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): CapabilityContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path, message: "must be an object" });
    return { id: "", title: "", description: "", tools: [] };
  }

  return {
    id: readRequiredString(object, "id", `${path}.id`, issues, { maxLength: 160 }),
    title: readRequiredString(object, "title", `${path}.title`, issues, { maxLength: 240 }),
    description: readRequiredString(object, "description", `${path}.description`, issues, {
      allowEmpty: true,
      maxLength: 1_200,
    }),
    tools: readStringArray(object, "tools", `${path}.tools`, issues),
  };
}

function readCapabilities(value: unknown, issues: ValidationIssue[]): CapabilityContent[] {
  if (!Array.isArray(value)) {
    issues.push({ path: "capabilities", message: "must be an array" });
    return [];
  }

  if (value.length > MAX_COLLECTION_ITEMS) {
    issues.push({
      path: "capabilities",
      message: `must contain no more than ${MAX_COLLECTION_ITEMS} items`,
    });
  }

  return value
    .slice(0, MAX_COLLECTION_ITEMS)
    .map((item, index) => readCapabilityItem(item, `capabilities[${index}]`, issues));
}

function readWritingItem(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): WritingContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path, message: "must be an object" });
    return {
      id: "",
      title: "",
      excerpt: "",
      publishedAt: "",
      href: "",
      tags: [],
    };
  }

  const readingTime = readOptionalString(object, "readingTime", `${path}.readingTime`, issues, {
    maxLength: 64,
  });

  return {
    id: readRequiredString(object, "id", `${path}.id`, issues, { maxLength: 160 }),
    title: readRequiredString(object, "title", `${path}.title`, issues, { maxLength: 240 }),
    excerpt: readRequiredString(object, "excerpt", `${path}.excerpt`, issues, {
      allowEmpty: true,
      maxLength: 1_200,
    }),
    publishedAt: readRequiredString(object, "publishedAt", `${path}.publishedAt`, issues, {
      allowEmpty: true,
      maxLength: 80,
    }),
    readingTime,
    href: readHref(object, "href", `${path}.href`, issues),
    tags: readStringArray(object, "tags", `${path}.tags`, issues),
  };
}

function readWriting(value: unknown, issues: ValidationIssue[]): WritingContent[] {
  if (!Array.isArray(value)) {
    issues.push({ path: "writing", message: "must be an array" });
    return [];
  }

  if (value.length > MAX_COLLECTION_ITEMS) {
    issues.push({ path: "writing", message: `must contain no more than ${MAX_COLLECTION_ITEMS} items` });
  }

  return value
    .slice(0, MAX_COLLECTION_ITEMS)
    .map((item, index) => readWritingItem(item, `writing[${index}]`, issues));
}

function readContact(value: unknown, issues: ValidationIssue[]): ContactContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path: "contact", message: "must be an object" });
    return { title: "", intro: "", email: "", links: [] };
  }

  const email = readRequiredString(object, "email", "contact.email", issues, {
    maxLength: 320,
  });
  if (email.length > 0 && !/^\S+@\S+\.\S+$/.test(email)) {
    issues.push({ path: "contact.email", message: "must be a valid email address" });
  }
  const responseTime = readOptionalString(object, "responseTime", "contact.responseTime", issues, {
    maxLength: 160,
  });

  return {
    title: readRequiredString(object, "title", "contact.title", issues, {
      allowEmpty: true,
      maxLength: 240,
    }),
    intro: readRequiredString(object, "intro", "contact.intro", issues, {
      allowEmpty: true,
      maxLength: 1_200,
    }),
    email,
    ...(responseTime === undefined ? {} : { responseTime }),
    links: readLinkArray(object, "links", "contact.links", issues),
  };
}

function readSocialItem(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): SocialLinkContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path, message: "must be an object" });
    return { platform: "", label: "", href: "" };
  }

  const handle = readOptionalString(object, "handle", `${path}.handle`, issues, {
    maxLength: 160,
  });

  return {
    platform: readRequiredString(object, "platform", `${path}.platform`, issues, {
      maxLength: 80,
    }),
    label: readRequiredString(object, "label", `${path}.label`, issues, { maxLength: 160 }),
    href: readHref(object, "href", `${path}.href`, issues),
    ...(handle === undefined ? {} : { handle }),
  };
}

function readSocial(value: unknown, issues: ValidationIssue[]): SocialLinkContent[] {
  if (!Array.isArray(value)) {
    issues.push({ path: "social", message: "must be an array" });
    return [];
  }

  if (value.length > MAX_COLLECTION_ITEMS) {
    issues.push({ path: "social", message: `must contain no more than ${MAX_COLLECTION_ITEMS} items` });
  }

  return value
    .slice(0, MAX_COLLECTION_ITEMS)
    .map((item, index) => readSocialItem(item, `social[${index}]`, issues));
}

const PROFILE_LINK_KINDS = ["social", "contact", "story", "work", "other"] as const;
type ProfileLinkKind = (typeof PROFILE_LINK_KINDS)[number];

function readProfileLinkItem(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): ProfileLinkContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path, message: "must be an object" });
    return { id: "", platform: "", label: "", href: "" };
  }

  const id = readRequiredString(object, "id", `${path}.id`, issues, {
    maxLength: 80,
  });
  if (id.length > 0 && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    issues.push({
      path: `${path}.id`,
      message: "must contain only lowercase letters, numbers, and single hyphens",
    });
  }

  const handle = readOptionalString(object, "handle", `${path}.handle`, issues, {
    maxLength: 160,
  });
  const description = readOptionalString(object, "description", `${path}.description`, issues, {
    maxLength: 600,
  });
  const rawKind = object.kind;
  let kind: ProfileLinkKind | undefined;
  if (rawKind !== undefined && rawKind !== null) {
    if (typeof rawKind !== "string" || !(PROFILE_LINK_KINDS as readonly string[]).includes(rawKind)) {
      issues.push({
        path: `${path}.kind`,
        message: `must be one of ${PROFILE_LINK_KINDS.join(", ")}`,
      });
    } else {
      kind = rawKind as ProfileLinkKind;
    }
  }
  const featured = readOptionalBoolean(object, "featured", `${path}.featured`, issues);

  return {
    id,
    platform: readRequiredString(object, "platform", `${path}.platform`, issues, {
      maxLength: 80,
    }),
    label: readRequiredString(object, "label", `${path}.label`, issues, {
      maxLength: 240,
    }),
    href: readHref(object, "href", `${path}.href`, issues),
    ...(handle === undefined ? {} : { handle }),
    ...(description === undefined ? {} : { description }),
    ...(kind === undefined ? {} : { kind }),
    ...(featured === undefined ? {} : { featured }),
  };
}

function readProfileLinks(value: unknown, issues: ValidationIssue[]): ProfileLinkContent[] {
  if (!Array.isArray(value)) {
    issues.push({ path: "profileLinks", message: "must be an array" });
    return [];
  }

  if (value.length > MAX_COLLECTION_ITEMS) {
    issues.push({
      path: "profileLinks",
      message: `must contain no more than ${MAX_COLLECTION_ITEMS} items`,
    });
  }

  const links = value
    .slice(0, MAX_COLLECTION_ITEMS)
    .map((item, index) => readProfileLinkItem(item, `profileLinks[${index}]`, issues));
  const seen = new Set<string>();
  links.forEach((link, index) => {
    if (link.id.length > 0 && seen.has(link.id)) {
      issues.push({
        path: `profileLinks[${index}].id`,
        message: "must be unique",
      });
    }
    if (link.id.length > 0) seen.add(link.id);
  });
  return links;
}

function readResume(value: unknown, issues: ValidationIssue[]): ResumeContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path: "resume", message: "must be an object" });
    return { label: "Résumé", href: "/resume", updatedAt: null };
  }

  const updatedAt = readOptionalString(object, "updatedAt", "resume.updatedAt", issues, {
    maxLength: 80,
  });
  const summary = readOptionalString(object, "summary", "resume.summary", issues, {
    maxLength: 1_200,
  });

  return {
    label: readRequiredString(object, "label", "resume.label", issues, { maxLength: 120 }),
    href: readHref(object, "href", "resume.href", issues),
    ...(updatedAt === undefined ? {} : { updatedAt }),
    ...(summary === undefined ? {} : { summary }),
  };
}

function readStoryChapter(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): StoryChapterContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path, message: "must be an object" });
    return { id: "", eyebrow: "", title: "", paragraphs: [] };
  }

  const artifact = readOptionalString(object, "artifact", `${path}.artifact`, issues, {
    maxLength: 500,
  });
  return {
    id: readRequiredString(object, "id", `${path}.id`, issues, { maxLength: 120 }),
    eyebrow: readRequiredString(object, "eyebrow", `${path}.eyebrow`, issues, {
      allowEmpty: true,
      maxLength: 160,
    }),
    title: readRequiredString(object, "title", `${path}.title`, issues, { maxLength: 240 }),
    paragraphs: readStringArray(object, "paragraphs", `${path}.paragraphs`, issues, {
      maxItems: 20,
      maxLength: 4_000,
    }),
    ...(artifact === undefined ? {} : { artifact }),
  };
}

function readStory(value: unknown, issues: ValidationIssue[]): StoryContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path: "story", message: "must be an object" });
    return {
      eyebrow: "",
      title: "",
      intro: "",
      quote: "",
      chapters: [],
      sourceLabel: "",
      sourceHref: "/story",
    };
  }

  const rawChapters = object.chapters;
  const chapters = Array.isArray(rawChapters)
    ? rawChapters.slice(0, 30).map((item, index) => readStoryChapter(item, `story.chapters[${index}]`, issues))
    : (issues.push({ path: "story.chapters", message: "must be an array" }), []);

  return {
    eyebrow: readRequiredString(object, "eyebrow", "story.eyebrow", issues, { allowEmpty: true, maxLength: 160 }),
    title: readRequiredString(object, "title", "story.title", issues, { allowEmpty: true, maxLength: 240 }),
    intro: readRequiredString(object, "intro", "story.intro", issues, { allowEmpty: true, maxLength: 1_200 }),
    quote: readRequiredString(object, "quote", "story.quote", issues, { allowEmpty: true, maxLength: 800 }),
    chapters,
    sourceLabel: readRequiredString(object, "sourceLabel", "story.sourceLabel", issues, { allowEmpty: true, maxLength: 160 }),
    sourceHref: readHref(object, "sourceHref", "story.sourceHref", issues),
  };
}

function readTravelEntry(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): TravelEntryContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path, message: "must be an object" });
    return { id: "", place: "", region: "", season: "", summary: "", reflection: "", visibility: "private", mediaIds: [] };
  }

  const latitude = readOptionalNumber(object, "latitude", `${path}.latitude`, issues, { min: -90, max: 90 });
  const longitude = readOptionalNumber(object, "longitude", `${path}.longitude`, issues, { min: -180, max: 180 });
  const visibilityValue = object.visibility;
  const visibility = visibilityValue === "public" || visibilityValue === "unlisted" || visibilityValue === "private"
    ? visibilityValue
    : (issues.push({ path: `${path}.visibility`, message: "must be public, unlisted, or private" }), "private" as const);

  return {
    id: readRequiredString(object, "id", `${path}.id`, issues, { maxLength: 120 }),
    place: readRequiredString(object, "place", `${path}.place`, issues, { maxLength: 160 }),
    region: readRequiredString(object, "region", `${path}.region`, issues, { allowEmpty: true, maxLength: 160 }),
    season: readRequiredString(object, "season", `${path}.season`, issues, { allowEmpty: true, maxLength: 120 }),
    summary: readRequiredString(object, "summary", `${path}.summary`, issues, { allowEmpty: true, maxLength: 1_200 }),
    reflection: readRequiredString(object, "reflection", `${path}.reflection`, issues, { allowEmpty: true, maxLength: 2_400 }),
    ...(latitude === undefined ? {} : { latitude }),
    ...(longitude === undefined ? {} : { longitude }),
    visibility,
    mediaIds: readStringArray(object, "mediaIds", `${path}.mediaIds`, issues, { maxItems: 30, maxLength: 160 }),
  };
}

function readTravel(value: unknown, issues: ValidationIssue[]): TravelContent {
  const object = asObject(value);
  if (!object) {
    issues.push({ path: "travel", message: "must be an object" });
    return { eyebrow: "", title: "", intro: "", origin: "", entries: [] };
  }
  const rawEntries = object.entries;
  const entries = Array.isArray(rawEntries)
    ? rawEntries.slice(0, MAX_COLLECTION_ITEMS).map((item, index) => readTravelEntry(item, `travel.entries[${index}]`, issues))
    : (issues.push({ path: "travel.entries", message: "must be an array" }), []);
  return {
    eyebrow: readRequiredString(object, "eyebrow", "travel.eyebrow", issues, { allowEmpty: true, maxLength: 160 }),
    title: readRequiredString(object, "title", "travel.title", issues, { allowEmpty: true, maxLength: 240 }),
    intro: readRequiredString(object, "intro", "travel.intro", issues, { allowEmpty: true, maxLength: 1_200 }),
    origin: readRequiredString(object, "origin", "travel.origin", issues, { allowEmpty: true, maxLength: 160 }),
    entries,
  };
}

function readMediaArray(value: unknown, issues: ValidationIssue[]): MediaAsset[] {
  if (!Array.isArray(value)) {
    issues.push({ path: "media", message: "must be an array" });
    return [];
  }

  if (value.length > MAX_COLLECTION_ITEMS) {
    issues.push({ path: "media", message: `must contain no more than ${MAX_COLLECTION_ITEMS} items` });
  }

  return value.slice(0, MAX_COLLECTION_ITEMS).map((item, index) => {
    return readMedia(item, `media[${index}]`, issues);
  });
}

export function validatePortfolioContent(value: unknown): ValidationResult<PortfolioContent> {
  try {
    return { ok: true, value: parsePortfolioContent(value) };
  } catch (error) {
    if (error instanceof ContentValidationError) {
      return { ok: false, issues: error.issues };
    }

    return {
      ok: false,
      issues: [{ path: "$", message: "could not validate content" }],
    };
  }
}

export function parsePortfolioContent(value: unknown): PortfolioContent {
  const issues: ValidationIssue[] = [];
  const object = asObject(value);

  if (!object) {
    throw new ContentValidationError([{ path: "$", message: "must be an object" }]);
  }

  if (object.schemaVersion !== CONTENT_SCHEMA_VERSION) {
    issues.push({
      path: "schemaVersion",
      message: `must equal ${CONTENT_SCHEMA_VERSION}`,
    });
  }

  const result: PortfolioContent = {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    site: readSite(object.site, issues),
    identity: readIdentity(object.identity, issues),
    hero: readHero(object.hero, issues),
    about: readAbout(object.about, issues),
    experience: readExperience(object.experience, issues),
    projects: readProjects(object.projects, issues),
    capabilities: readCapabilities(object.capabilities, issues),
    writing: readWriting(object.writing, issues),
    contact: readContact(object.contact, issues),
    social: readSocial(object.social, issues),
    profileLinks: readProfileLinks(object.profileLinks, issues),
    resume: readResume(object.resume, issues),
    story: readStory(object.story, issues),
    travel: readTravel(object.travel, issues),
    media: readMediaArray(object.media, issues),
  };

  if (issues.length > 0) {
    throw new ContentValidationError(issues);
  }

  return result;
}

export function parseStoredContent(json: string): PortfolioContent {
  if (new TextEncoder().encode(json).byteLength > MAX_CONTENT_BYTES) {
    throw new ContentValidationError([
      { path: "$", message: `must be no larger than ${MAX_CONTENT_BYTES} bytes` },
    ]);
  }

  try {
    return parsePortfolioContent(JSON.parse(json) as unknown);
  } catch (error) {
    if (error instanceof ContentValidationError) {
      throw error;
    }

    throw new ContentValidationError([{ path: "$", message: "must contain valid JSON" }]);
  }
}

export function serializePortfolioContent(value: unknown): string {
  const content = parsePortfolioContent(value);
  const json = JSON.stringify(content);

  if (new TextEncoder().encode(json).byteLength > MAX_CONTENT_BYTES) {
    throw new ContentValidationError([
      { path: "$", message: `must be no larger than ${MAX_CONTENT_BYTES} bytes` },
    ]);
  }

  return json;
}
