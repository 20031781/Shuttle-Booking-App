import {createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {useColorScheme} from 'react-native';

import {loadThemePreference, saveThemePreference, type StoredThemePreference} from '@/api/appPreferences';
import {auroraGlassColors, type AppThemeColors, type AppThemeMode, darkColors, lightColors} from './colors';

export type AppThemePreference = StoredThemePreference;

export type AppTheme = {
    mode: AppThemeMode;
    colors: AppThemeColors;
    statusBarStyle: 'light' | 'dark';
    preference: AppThemePreference;
    isPreferenceLoaded: boolean;
    setPreference: (preference: AppThemePreference) => void;
};

const lightTheme: AppTheme = {
    mode: 'light',
    colors: lightColors,
    statusBarStyle: 'dark',
    preference: 'system',
    isPreferenceLoaded: false,
    setPreference: () => {}
};

const darkTheme: AppTheme = {
    mode: 'dark',
    colors: darkColors,
    statusBarStyle: 'light',
    preference: 'system',
    isPreferenceLoaded: false,
    setPreference: () => {}
};

const auroraTheme: AppTheme = {
    mode: 'aurora',
    colors: auroraGlassColors,
    statusBarStyle: 'light',
    preference: 'aurora-glass',
    isPreferenceLoaded: false,
    setPreference: () => {}
};

const ThemeContext = createContext<AppTheme>(lightTheme);

export function AppThemeProvider({children}: PropsWithChildren) {
    const colorScheme = useColorScheme();
    const [preference, setPreferenceState] = useState<AppThemePreference>('system');
    const [isPreferenceLoaded, setIsPreferenceLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;

        void loadThemePreference()
            .then(storedPreference => {
                if (!cancelled) {
                    setPreferenceState(storedPreference);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsPreferenceLoaded(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const setPreference = useCallback((nextPreference: AppThemePreference) => {
        setPreferenceState(nextPreference);
        void saveThemePreference(nextPreference);
    }, []);

    const theme = useMemo(() => {
        const baseTheme = preference === 'aurora-glass'
            ? auroraTheme
            : colorScheme === 'dark'
                ? darkTheme
                : lightTheme;

        return {
            ...baseTheme,
            preference,
            isPreferenceLoaded,
            setPreference
        } satisfies AppTheme;
    }, [colorScheme, isPreferenceLoaded, preference, setPreference]);

    return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
    return useContext(ThemeContext);
}
