import { useState, useEffect } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Check if the user has a saved preference
    const saved = localStorage.getItem("habit-theme");
    if (saved) return saved;
    // Otherwise, check if their OS is in dark mode
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove both classes to be safe, then add the active one
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    // Save the choice
    localStorage.setItem("habit-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return { theme, toggleTheme };
}