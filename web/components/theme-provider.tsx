"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

// MVP-1 is light-only per docs/FINTREST_UX_SPEC §03. The v2 sidebar +
// header use explicit ink-* tokens that ignore theme, while legacy
// shadcn components (bg-card, bg-muted, etc.) DO swap with .dark.
// Mixing those on the same screen produces the navy/white Markets
// page the user flagged. Until we do a full dark-mode audit, force
// light and ignore OS preference.
const DEFAULT_THEME: Theme = "light";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: DEFAULT_THEME, setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    // Ignore any stored theme preference for MVP-1 — force light so the
    // page renders consistently. Restore user choice in MVP-2 once dark
    // mode has been audited across all v2 + legacy components.
    document.documentElement.classList.remove("dark");
    setTheme("light");
  }, []);

  const handleSetTheme = (t: Theme) => {
    // Honor explicit toggle requests, but light remains default.
    setTheme(t);
    localStorage.setItem("theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
