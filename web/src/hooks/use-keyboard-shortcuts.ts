"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useKeyboardShortcuts(onHelpToggle: () => void) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (isInput) return;

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onHelpToggle();
        return;
      }

      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        router.push("/notes");
        return;
      }

      if (e.key === "j" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        router.push("/journal");
        return;
      }

      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        router.push("/search");
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router, onHelpToggle]);
}
