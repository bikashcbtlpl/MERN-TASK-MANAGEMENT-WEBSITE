import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "./AuthContext";

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
  const { user, loading: authLoading } = useAuth();
  const [themePreference, setThemePreferenceState] = useState("system");
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const saveTimeoutRef = useRef(null);

  const theme = themePreference === "system" ? systemTheme : themePreference;

  /* ── Listen to system dark-mode changes ── */
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => setSystemTheme(e.matches ? "dark" : "light");
    setSystemTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  /* ── Apply theme class to <html> ── */
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark-theme");
    else root.classList.remove("dark-theme");
  }, [theme]);

  /* ── Apply theme from user preferences once auth resolves ── */
  useEffect(() => {
    if (authLoading) return; // wait for auth verify to complete

    if (!user) {
      // Logged out — reset to system
      setThemePreferenceState("system");
      return;
    }

    // Apply the preference stored in the user's server profile
    const saved = normalizePreference(user?.preferences?.theme);
    setThemePreferenceState(saved);
  }, [user?._id, authLoading]); // only re-run when user identity changes

  /* ── Debounced API save ── */
  const persistTheme = useCallback((preference) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await axiosInstance.put("/settings/preferences", { theme: preference });
      } catch {
        // Silent fail — UI already updated
      }
    }, 400);
  }, []);

  const setTheme = useCallback(
    (nextTheme) => {
      const pref = normalizePreference(nextTheme);
      setThemePreferenceState(pref);
      persistTheme(pref);
    },
    [persistTheme],
  );

  const toggleTheme = useCallback(() => {
    setThemePreferenceState((prev) => {
      const currentTheme = prev === "system" ? getSystemTheme() : prev;
      const next = currentTheme === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, [persistTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        themePreference,
        setThemePreference: setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
export { useTheme };
