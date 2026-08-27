import { useState, type ChangeEvent } from "react";

import type { ProfileLinkContent } from "../types/content";
import "../styles/links-editor.css";

interface LinksEditorProps {
  links: ProfileLinkContent[];
}

type EditableLinkKey = keyof Pick<
  ProfileLinkContent,
  "id" | "platform" | "label" | "href" | "handle" | "description" | "kind" | "featured"
>;

const EMPTY_LINK: ProfileLinkContent = {
  id: "new-link",
  platform: "",
  label: "",
  href: "https://",
  description: "",
  kind: "social",
  featured: false,
};

function uniqueId(links: ProfileLinkContent[]): string {
  const taken = new Set(links.map((link) => link.id));
  let index = links.length + 1;
  let id = `new-link-${index}`;
  while (taken.has(id)) {
    index += 1;
    id = `new-link-${index}`;
  }
  return id;
}

export function LinksEditor({ links: initialLinks }: LinksEditorProps) {
  const [links, setLinks] = useState<ProfileLinkContent[]>(initialLinks);
  const [touched, setTouched] = useState(false);

  function updateLink(index: number, key: EditableLinkKey, value: string | boolean) {
    setLinks((current) =>
      current.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [key]: value } : link,
      ),
    );
    setTouched(true);
  }

  function addLink() {
    setLinks((current) => [...current, { ...EMPTY_LINK, id: uniqueId(current) }]);
    setTouched(true);
  }

  function removeLink(index: number) {
    setLinks((current) => current.filter((_, linkIndex) => linkIndex !== index));
    setTouched(true);
  }

  function moveLink(index: number, direction: -1 | 1) {
    setLinks((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (moved) next.splice(destination, 0, moved);
      return next;
    });
    setTouched(true);
  }

  return (
    <section className="links-editor" aria-labelledby="links-editor-title">
      <div className="links-editor__header">
        <div>
          <p className="eyebrow">Public profile surface</p>
          <h2 id="links-editor-title">Links, without the JSON ceremony</h2>
          <p>
            Keep stable IDs short and lowercase. Visitors use them as shareable paths such as
            <code>/links/github</code>. Changes here are folded into the document when you save;
            the JSON editor remains available below for everything else.
          </p>
        </div>
        <button className="links-editor__add" type="button" onClick={addLink}>
          Add link <span aria-hidden="true">+</span>
        </button>
      </div>

      <div className="links-editor__list">
        {links.length === 0 && (
          <p className="links-editor__empty">No public links yet. Add one or use the JSON fallback.</p>
        )}
        {links.map((link, index) => (
          <fieldset className="links-editor__item" key={`link-editor-${index}`}>
            <legend>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {link.label || "Untitled link"}
            </legend>
            <div className="links-editor__fields">
              <label>
                <span>Platform</span>
                <input
                  value={link.platform}
                  onChange={(event) => updateLink(index, "platform", event.target.value)}
                  maxLength={80}
                  placeholder="GitHub"
                />
              </label>
              <label>
                <span>Display label</span>
                <input
                  value={link.label}
                  onChange={(event) => updateLink(index, "label", event.target.value)}
                  maxLength={240}
                  placeholder="SohelIslamImran"
                />
              </label>
              <label>
                <span>Link ID</span>
                <input
                  value={link.id}
                  onChange={(event) => updateLink(index, "id", event.target.value)}
                  maxLength={80}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  spellCheck={false}
                  placeholder="github"
                />
              </label>
              <label className="links-editor__field--wide">
                <span>Destination</span>
                <input
                  value={link.href}
                  onChange={(event) => updateLink(index, "href", event.target.value)}
                  maxLength={2_000}
                  inputMode="url"
                  spellCheck={false}
                  placeholder="https://github.com/SohelIslamImran"
                />
              </label>
              <label>
                <span>Handle <small>(optional)</small></span>
                <input
                  value={link.handle ?? ""}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateLink(index, "handle", event.target.value)}
                  maxLength={160}
                  placeholder="@sohelislamimran"
                />
              </label>
              <label>
                <span>Kind</span>
                <select
                  value={link.kind ?? "other"}
                  onChange={(event) => updateLink(index, "kind", event.target.value)}
                >
                  <option value="social">Social</option>
                  <option value="contact">Contact</option>
                  <option value="story">Story</option>
                  <option value="work">Work</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="links-editor__field--wide">
                <span>Description <small>(optional)</small></span>
                <textarea
                  value={link.description ?? ""}
                  onChange={(event) => updateLink(index, "description", event.target.value)}
                  maxLength={600}
                  rows={2}
                  placeholder="One clear sentence about what visitors will find."
                />
              </label>
            </div>
            <div className="links-editor__controls">
              <label className="links-editor__featured">
                <input
                  type="checkbox"
                  checked={link.featured === true}
                  onChange={(event) => updateLink(index, "featured", event.target.checked)}
                />
                <span>Feature near the top</span>
              </label>
              <div className="links-editor__order" aria-label={`Reorder ${link.label || "link"}`}>
                <button type="button" onClick={() => moveLink(index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
                <button type="button" onClick={() => moveLink(index, 1)} disabled={index === links.length - 1} aria-label="Move down">↓</button>
                <button className="links-editor__remove" type="button" onClick={() => removeLink(index)}>Remove</button>
              </div>
            </div>
          </fieldset>
        ))}
      </div>

      {touched && (
        <>
          <input type="hidden" name="profileLinksTouched" value="true" />
          <input type="hidden" name="profileLinks" value={JSON.stringify(links)} />
        </>
      )}
      <p className="links-editor__help">
        Supported destinations: HTTPS, email, phone, and internal paths. The server validates every
        link and rejects duplicate IDs or unsafe protocols before a draft is stored.
      </p>
    </section>
  );
}
