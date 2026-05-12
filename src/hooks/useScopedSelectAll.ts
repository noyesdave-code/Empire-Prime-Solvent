import { useEffect, RefObject } from "react";

/**
 * Scopes Cmd/Ctrl+A (and the resulting copy) to a single container.
 * When the user presses Select All while focus is inside `containerRef`,
 * we select only the text inside `targetRef` (the chat answer / input)
 * instead of the whole page.
 */
export function useScopedSelectAll(
  containerRef: RefObject<HTMLElement>,
  targetRef: RefObject<HTMLElement>,
) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSelectAll = (e.metaKey || e.ctrlKey) && (e.key === "a" || e.key === "A");
      if (!isSelectAll) return;
      const container = containerRef.current;
      const target = targetRef.current;
      if (!container || !target) return;
      const active = document.activeElement as HTMLElement | null;
      // Only intercept when focus / pointer is inside the chat container.
      // Skip when the user is inside an editable field (textarea/input) — let native select-all work there.
      const inside = active && container.contains(active);
      const inEditable =
        active &&
        (active.tagName === "TEXTAREA" ||
          active.tagName === "INPUT" ||
          active.isContentEditable);
      if (!inside || inEditable) return;
      e.preventDefault();
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [containerRef, targetRef]);
}
