import {createContext, type PropsWithChildren, useContext} from 'react';
import {useColorScheme} from 'react-native';

import {type AppThemeColors, type AppThemeMode, darkColors, lightColors} from './colors';

export type AppTheme = {
    mode: AppThemeMode;
    colors: AppThemeColors;
    statusBarStyle: 'light' | 'dark';
};

const lightTheme: AppTheme = {
    mode: 'light',
    colors: lightColors,
    statusBarStyle: 'dark'
};

const darkTheme: AppTheme = {
    mode: 'dark',
    colors: darkColors,
    statusBarStyle: 'light'
};

const ThemeContext = createContext<AppTheme>(lightTheme);

export function AppThemeProvider({children}: PropsWithChildren) {
    const colorScheme = useColorScheme();
    const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

    return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
    return useContext(ThemeContext);
}
