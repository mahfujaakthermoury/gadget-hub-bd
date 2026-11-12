import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getPublicSettings } from "../services/settingsService.js";

const ThemeContext = createContext(null);
const storageKey = "gadget-hub-theme";
const supportedThemes = new Set(["light", "dark", "system"]);

function readThemePreference() {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return supportedThemes.has(stored) ? stored : "system";
  } catch (error) {
    console.warn("Could not read the saved theme preference.", error);
    return "system";
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readThemePreference);
  const [storeSettings, setStoreSettings] = useState(null);
  const setTheme = useCallback((nextTheme) => {
    if (!supportedThemes.has(nextTheme)) {
      throw new Error("Choose light, dark, or system theme.");
    }
    setThemeState(nextTheme);
    try {
      window.localStorage.setItem(storageKey, nextTheme);
    } catch (error) {
      console.warn("Could not save the theme preference.", error);
    }
  }, []);
  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);
  const refreshStoreSettings = useCallback(async (forceRefresh = false) => {
    try {
      setStoreSettings(await getPublicSettings({ forceRefresh }));
    } catch (error) {
      console.warn("Could not load public store settings.", error);
    }
  }, []);

  useEffect(() => {
    void refreshStoreSettings();
  }, [refreshStoreSettings]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const effectiveTheme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      root.dataset.colorMode = effectiveTheme;
      root.dataset.theme = effectiveTheme === "dark" ? "dark" : "gadgethub";
      root.style.colorScheme = effectiveTheme;
    };
    applyTheme();
    if (theme !== "system") return undefined;
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  useEffect(() => {
    if (!storeSettings) return;
    const general = storeSettings.general || {};
    const appearance = storeSettings.appearance || {};
    const root = document.documentElement;
    if (appearance.primaryBrandColor) {
      root.style.setProperty("--brand-primary", appearance.primaryBrandColor);
    }
    if (appearance.secondaryBrandColor) {
      root.style.setProperty("--brand-secondary", appearance.secondaryBrandColor);
    }
    if (general.currency) root.dataset.currency = general.currency;
    if (general.websiteName) document.title = general.websiteName;
    if (general.favicon) {
      let icon = document.querySelector('link[rel="icon"]');
      if (!icon) {
        icon = document.createElement("link");
        icon.rel = "icon";
        document.head.append(icon);
      }
      icon.href = general.favicon;
    }
  }, [storeSettings]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, storeSettings, refreshStoreSettings }),
    [theme, setTheme, toggleTheme, storeSettings, refreshStoreSettings],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider.");
  return context;
}
