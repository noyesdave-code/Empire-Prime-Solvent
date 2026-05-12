import { useEffect } from "react";

/**
 * Inject one or more <script type="application/ld+json"> tags for SEO.
 * Cleans up on unmount so SPA navigation doesn't leave stale schema.
 */
export function useJsonLd(id: string, data: unknown | unknown[]) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const items = Array.isArray(data) ? data : [data];
    const tags: HTMLScriptElement[] = [];
    items.forEach((d, i) => {
      const tag = document.createElement("script");
      tag.type = "application/ld+json";
      tag.id = `${id}-${i}`;
      tag.text = JSON.stringify(d);
      document.head.appendChild(tag);
      tags.push(tag);
    });
    return () => { tags.forEach((t) => t.remove()); };
  }, [id, JSON.stringify(data)]);
}
