"use client";

import * as React from "react";

import { useThemeStore } from "@/store/useThemeStore";

function resolveTheme(theme: "light" | "dark" | "system") {
  if (theme !== "system") return theme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function ThemeBridge() {
  const theme = useThemeStore((s) => s.theme);
  const setResolvedTheme = useThemeStore((s) => s.setResolvedTheme);

  React.useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");

    const apply = () => {
      const resolved = resolveTheme(theme);
      setResolvedTheme(resolved);
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };

    apply();

    if (!media?.addEventListener) return;
    const onChange = () => apply();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [setResolvedTheme, theme]);

  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeBridge />
      {children}
    </>
  );
}

