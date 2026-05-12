import { useEffect } from "react";

/**
 * Apply <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
 * to admin / boardroom / analytics routes so search engines + AI crawlers
 * never index internal strategy or IP. Cleans up on unmount so public pages
 * stay indexable.
 *
 * Legal posture: protects PGVA Ventures LLC trade-secret material visible
 * only after authenticated admin login.
 */
export function useNoIndex() {
  useEffect(() => {
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex, nofollow, noarchive, nosnippet, noai, noimageai";
    document.head.appendChild(tag);
    return () => {
      try { document.head.removeChild(tag); } catch { /* ignore */ }
    };
  }, []);
}
