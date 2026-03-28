export type AppThemeMode = 'light' | 'dark';

export type AppThemeColors = {
    background: string;
    backgroundAccent: string;
    surface: string;
    surfaceElevated: string;
    surfaceSecondary: string;
    primary: string;
    primarySoft: string;
    onPrimary: string;
    text: string;
    subtleText: string;
    mutedText: string;
    success: string;
    warning: string;
    danger: string;
    border: string;
    borderStrong: string;
    tabBarBackground: string;
    tabBarBorder: string;
    tabIconActive: string;
    tabIconInactive: string;
    skeletonBase: string;
    skeletonHighlight: string;
};

const sharedColors = {
    primary: '#3c43ff'
} as const;

export const lightColors: AppThemeColors = {
    background: '#f4f6fb',
    backgroundAccent: '#edf1ff',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    surfaceSecondary: '#eef2fa',
    primary: sharedColors.primary,
    primarySoft: '#e8ecff',
    onPrimary: '#ffffff',
    text: '#151b29',
    subtleText: '#5f6880',
    mutedText: '#8993a9',
    success: '#2e9b62',
    warning: '#c27a00',
    danger: '#c64545',
    border: '#e1e6f2',
    borderStrong: '#cfd7e8',
    tabBarBackground: '#ffffff',
    tabBarBorder: '#dce3f0',
    tabIconActive: sharedColors.primary,
    tabIconInactive: '#7b859d',
    skeletonBase: '#e7ebf4',
    skeletonHighlight: 'rgba(255,255,255,0.7)'
};

export const darkColors: AppThemeColors = {
    background: '#0e1320',
    backgroundAccent: '#16203a',
    surface: '#151d30',
    surfaceElevated: '#1b263d',
    surfaceSecondary: '#24324e',
    primary: '#7d8bff',
    primarySoft: '#2a3658',
    onPrimary: '#111a2f',
    text: '#edf2ff',
    subtleText: '#aab4cb',
    mutedText: '#7d89a5',
    success: '#58d49a',
    warning: '#f0bb5f',
    danger: '#f08f8f',
    border: '#2a3754',
    borderStrong: '#3b4b6d',
    tabBarBackground: '#121a2b',
    tabBarBorder: '#2d3b57',
    tabIconActive: '#97a5ff',
    tabIconInactive: '#7f8ba8',
    skeletonBase: '#2b3550',
    skeletonHighlight: 'rgba(255,255,255,0.24)'
};
