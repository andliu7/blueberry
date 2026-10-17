/**
 * Writes the shell header's height onto an element as --msg-top, so a phone
 * thread (Messages, Ask Blueberry) can be pinned between the header and the
 * tab bar and be the only thing that scrolls. The header's height moves with
 * the safe area and the HUD, so it is measured, never copied.
 */

import { useEffect, type RefObject } from "react";

export function useHeaderTop(root: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const header = document.querySelector("[data-app-header]");
    const element = root.current;
    if (header === null || element === null || typeof ResizeObserver === "undefined") return;
    const read = () => element.style.setProperty("--msg-top", `${Math.round(header.getBoundingClientRect().height)}px`);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(header);
    return () => observer.disconnect();
  }, [root]);
}
