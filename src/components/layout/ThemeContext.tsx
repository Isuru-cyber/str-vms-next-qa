"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "material" | "light" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "material",
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode; initialTheme?: string }> = ({
  children,
  initialTheme = "material",
}) => {
  const [theme, setThemeState] = useState<ThemeMode>((initialTheme as ThemeMode) || "material");

  const applyTheme = (t: ThemeMode) => {
    document.documentElement.setAttribute("data-theme", t);
    if (t === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("str_vms_theme") as ThemeMode;
    if (saved && ["material", "light", "dark"].includes(saved)) {
      setThemeState(saved);
      applyTheme(saved);
    } else {
      const defaultT = (initialTheme === "light" || initialTheme === "dark") ? initialTheme : "material";
      setThemeState(defaultT as ThemeMode);
      applyTheme(defaultT as ThemeMode);
    }
  }, [initialTheme]);

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem("str_vms_theme", t);
    applyTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
