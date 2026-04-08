import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  type ThemeAccent,
  type ThemeColors,
  type ThemeMode,
  getThemeColors,
} from '@/utils/theme';

interface ThemeContextType {
  mode: ThemeMode;
  accent: ThemeAccent;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: ThemeAccent) => void;
  toggleMode: () => void;
}

const STORAGE_MODE_KEY = 'candor-mode';
const STORAGE_ACCENT_KEY = 'candor-accent';
const VALID_MODES: ThemeMode[] = ['light', 'dark'];
const VALID_ACCENTS: ThemeAccent[] = ['sand', 'rose', 'sky', 'lavender', 'honey'];
const defaultColors = getThemeColors('dark', 'sand');

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  accent: 'sand',
  colors: defaultColors,
  setMode: () => {},
  setAccent: () => {},
  toggleMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

async function loadPreference(key: string, fallback: string) {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) || fallback;
    }

    return fallback;
  }

  return (await SecureStore.getItemAsync(key)) || fallback;
}

async function savePreference(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }

    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [accent, setAccentState] = useState<ThemeAccent>('sand');

  useEffect(() => {
    let isMounted = true;

    const hydrateTheme = async () => {
      const [storedMode, storedAccent] = await Promise.all([
        loadPreference(STORAGE_MODE_KEY, 'dark'),
        loadPreference(STORAGE_ACCENT_KEY, 'sand'),
      ]);

      if (!isMounted) {
        return;
      }

      if (VALID_MODES.includes(storedMode as ThemeMode)) {
        setModeState(storedMode as ThemeMode);
      }

      if (VALID_ACCENTS.includes(storedAccent as ThemeAccent)) {
        setAccentState(storedAccent as ThemeAccent);
      }
    };

    void hydrateTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    void savePreference(STORAGE_MODE_KEY, nextMode);
  }, []);

  const setAccent = useCallback((nextAccent: ThemeAccent) => {
    setAccentState(nextAccent);
    void savePreference(STORAGE_ACCENT_KEY, nextAccent);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        accent,
        colors: getThemeColors(mode, accent),
        setMode,
        setAccent,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
