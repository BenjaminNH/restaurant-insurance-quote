"use client";

import { useEffect, useState } from "react";

const KEYBOARD_THRESHOLD = 120;
const KEYBOARD_INPUT_TYPES = new Set([
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

function isEditable(element: Element | null): element is HTMLElement {
  return element instanceof HTMLTextAreaElement
    || (element instanceof HTMLInputElement && KEYBOARD_INPUT_TYPES.has(element.type));
}

export function useSoftKeyboard() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;

    function sync() {
      const active = document.activeElement;
      const focusWithinEditable = isEditable(active);
      const heightReduced = viewport
        ? window.innerHeight - viewport.height > KEYBOARD_THRESHOLD
        : focusWithinEditable;
      const nextOpen = focusWithinEditable && heightReduced;

      setIsOpen(nextOpen);

      if (nextOpen && active instanceof HTMLElement) {
        const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth";
        requestAnimationFrame(() => active.scrollIntoView({ block: "center", behavior }));
      }
    }

    function handleFocusOut() {
      requestAnimationFrame(sync);
    }

    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", handleFocusOut);
    viewport?.addEventListener("resize", sync);
    sync();

    return () => {
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", handleFocusOut);
      viewport?.removeEventListener("resize", sync);
    };
  }, []);

  return isOpen;
}
