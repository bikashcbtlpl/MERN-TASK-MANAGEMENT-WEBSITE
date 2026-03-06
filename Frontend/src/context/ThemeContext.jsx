import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

const getSystemTheme = () => {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const normalizePreference = (value) => {
  if (value === "dark" || value === "light" || value === "system") return value;
  return "system";
};

export const ThemeProvider = ({ children }) => {
  const [themePreference, setThemePreference] = useState(() => {
    try {
      return normalizePreference(localStorage.getItem("themePreference"));
    } catch {
      return "system";
    }
  });

  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const theme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (event) =>
      setSystemTheme(event.matches ? "dark" : "light");

    setSystemTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark-theme");
    else root.classList.remove("dark-theme");
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("themePreference", themePreference);
      localStorage.setItem("theme", theme);
    } catch {
      return;
    }
  }, [themePreference, theme]);

  const toggleTheme = () =>
    setThemePreference((prev) => {
      const currentTheme = prev === "system" ? getSystemTheme() : prev;
      return currentTheme === "dark" ? "light" : "dark";
    });

  const setTheme = (nextTheme) => setThemePreference(normalizePreference(nextTheme));

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, themePreference, setThemePreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
export { useTheme };
