import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";

// Visual-regression guard for the Caribbean theme.
// If anyone changes index.css and breaks the white-text / Caribbean-accent
// contract, these computed-style assertions fail at CI time.

beforeAll(async () => {
  // Load the project stylesheet into jsdom
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = await import("node:fs");
  const path = await import("node:path");
  const css = fs.readFileSync(
    path.resolve(__dirname, "../index.css"),
    "utf8"
  );
  // Strip @tailwind directives and @layer wrappers jsdom can't parse
  const cleaned = css
    .replace(/@tailwind[^;]+;/g, "")
    .replace(/@layer[^{]+\{([\s\S]*?)\n\}/g, "$1");
  const style = document.createElement("style");
  style.textContent = cleaned;
  document.head.appendChild(style);
});

const WHITE = "rgb(255, 255, 255)";

describe("Caribbean theme — locked white text", () => {
  it("forces headings, paragraphs, and spans to white", () => {
    const { getByTestId } = render(
      <div className="caribbean-accent" data-testid="root">
        <h1 data-testid="h">Heading</h1>
        <p data-testid="p">Paragraph</p>
        <span data-testid="s">Span</span>
      </div>
    );
    expect(getComputedStyle(getByTestId("h")).color).toBe(WHITE);
    expect(getComputedStyle(getByTestId("p")).color).toBe(WHITE);
    expect(getComputedStyle(getByTestId("s")).color).toBe(WHITE);
  });

  it("forces links and icons to white", () => {
    const { getByTestId } = render(
      <div className="caribbean-accent">
        <a href="#" data-testid="a">Link</a>
        <svg data-testid="svg"><circle /></svg>
      </div>
    );
    expect(getComputedStyle(getByTestId("a")).color).toBe(WHITE);
    expect(getComputedStyle(getByTestId("svg")).fill).toBe(WHITE);
  });

  it("keeps box borders Caribbean blue", () => {
    const { getByTestId } = render(
      <div className="caribbean-accent">
        <div className="veil-card" data-testid="card">card</div>
      </div>
    );
    const border = getComputedStyle(getByTestId("card")).borderColor;
    // Caribbean cyan family: high blue + green channel, low red
    expect(border).toMatch(/rgb\(\s*\d{1,2}\s*,\s*\d{2,3}\s*,\s*\d{2,3}\s*\)/);
  });
});
