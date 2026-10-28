import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import NotFoundPage from "@/components/ui/404-page-not-found";
import { NotOpenYet } from "@/game/app/ui/NotOpenYet";
import { NOT_FOUND_TITLE, NOT_OPEN_COPY, notFoundLine } from "@/lib/statusCopy";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("the 'not here' screens share one voice", () => {
  // The renderer writes an apostrophe as &#x27;; compare the text a person reads.
  const decode = (html: string) => html.replace(/&#x27;/g, "'");
  const notFound = decode(renderToStaticMarkup(createElement(NotFoundPage, { what: "That deck", detail: "#/deck/x" })));

  it("the 404 uses the shared title and line, and the glitch only wraps the number", () => {
    expect(notFound).toContain(NOT_FOUND_TITLE);
    expect(notFound).toContain(notFoundLine("That deck"));
    expect(notFound).toContain('data-text="404"');
    expect(notFound).not.toContain("Looks like you");
    expect(notFound).not.toContain("Grignard deck");
  });

  it("the 404 offers a way home and a way to the path", () => {
    expect(notFound).toContain('href="#/"');
    expect(notFound).toContain('href="#/app"');
  });

  it("every flagged surface has a title, one line and one kept line, in the same shape", () => {
    for (const surface of Object.keys(NOT_OPEN_COPY) as (keyof typeof NOT_OPEN_COPY)[]) {
      const copy = NOT_OPEN_COPY[surface];
      expect(copy.title, surface).toMatch(/n't open yet$/);
      expect(copy.title.endsWith("."), surface).toBe(false);
      expect(copy.line.length, surface).toBeLessThan(140);
      expect(copy.kept.length, surface).toBeLessThan(120);
      const html = renderToStaticMarkup(createElement(NotOpenYet, { surface }));
      expect(html, surface).toContain("<svg");
      expect(html.replace(/&#x27;/g, "'"), surface).toContain(copy.title);
    }
  });

  it("uses no em dash and keeps the glitch off under reduced motion", () => {
    for (const file of ["../lib/statusCopy.ts", "../components/ui/glitch-text.tsx", "../components/ui/glitch-text.css"]) {
      expect(read(file), file).not.toContain("—");
    }
    expect(read("../components/ui/glitch-text.css")).toContain('html:not([data-motion="reduced"])');
  });
});
