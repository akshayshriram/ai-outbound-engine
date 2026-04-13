import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeState = {
    theme: ThemePreference;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: ThemePreference) => void;
    setResolvedTheme: (resolvedTheme: ResolvedTheme) => void;
    toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: "system",
            resolvedTheme: "light",
            setTheme: (theme) => set({ theme }),
            setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
            toggleTheme: () =>
                set({ theme: get().theme === "dark" ? "light" : "dark" }),
        }),
        {
            name: "saas-theme",
            version: 1,
            partialize: (state) => ({ theme: state.theme }),
        },
    ),
);

