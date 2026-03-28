import Constants from 'expo-constants';
import {StatusBar} from 'expo-status-bar';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Linking, Platform} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {hasActiveSession, registerDeviceToken, subscribeToSessionChanges} from './src/api/authSession';
import {apiConfig} from './src/api/config';
import {LoginScreen} from './src/features/auth/LoginScreen';
import {AppNavigator, type AppSection} from './src/features/navigation/AppNavigator';
import {AppThemeProvider, useAppTheme} from './src/theme/theme';
import {UpdateUi, useUpdateCheck} from './src/update';

function canUseNativePushNotifications(): boolean {
    if (Platform.OS === 'web') {
        return false;
    }

    return Constants.executionEnvironment === 'standalone' || Constants.executionEnvironment === 'bare';
}

function RootApp() {
    const [section, setSection] = useState<AppSection>('shuttle');
    const [isAuthenticated, setIsAuthenticated] = useState(hasActiveSession);
    const {statusBarStyle} = useAppTheme();
    const hasRegisteredPushToken = useRef(false);
    const nativePushSupported = canUseNativePushNotifications();
    const updateJsonUrl = (process.env.EXPO_PUBLIC_UPDATE_JSON_URL ?? `${apiConfig.baseUrl}/update.json`).trim();
    const {updateResult} = useUpdateCheck(updateJsonUrl);

    useEffect(() => subscribeToSessionChanges(setIsAuthenticated), []);

    useEffect(() => {
        if (!nativePushSupported) {
            return;
        }

        let cancelled = false;

        void import('expo-notifications')
            .then(Notifications => {
                if (cancelled) {
                    return;
                }

                Notifications.setNotificationHandler({
                    handleNotification: async () => ({
                        shouldShowAlert: true,
                        shouldPlaySound: false,
                        shouldSetBadge: false,
                        shouldShowBanner: true,
                        shouldShowList: true
                    })
                });
            })
            .catch(error => console.warn('Unable to initialize notifications module:', error));

        return () => {
            cancelled = true;
        };
    }, [nativePushSupported]);

    const handleUpdateNow = useCallback(async (updateUrl: string) => {
        try {
            const canOpen = await Linking.canOpenURL(updateUrl);
            if (!canOpen) {
                return;
            }

            await Linking.openURL(updateUrl);
        } catch (error) {
            console.warn('Unable to open update URL', error);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            hasRegisteredPushToken.current = false;
            return;
        }

        if (!nativePushSupported || hasRegisteredPushToken.current) {
            return;
        }

        let cancelled = false;

        async function registerPushToken() {
            try {
                const Notifications = await import('expo-notifications');
                const existingPermission = await Notifications.getPermissionsAsync();
                let finalStatus = existingPermission.status;

                if (finalStatus !== 'granted') {
                    const requestedPermission = await Notifications.requestPermissionsAsync();
                    finalStatus = requestedPermission.status;
                }

                if (finalStatus !== 'granted' || cancelled) {
                    return;
                }

                const token = await Notifications.getDevicePushTokenAsync();
                if (!token.data || cancelled) {
                    return;
                }

                await registerDeviceToken(token.data, Platform.OS === 'ios' ? 'ios' : 'android');
                if (!cancelled) {
                    hasRegisteredPushToken.current = true;
                }
            } catch (error) {
                console.warn('Push registration failed:', error);
            }
        }

        void registerPushToken();

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, nativePushSupported]);

    return <>
        {isAuthenticated ? <AppNavigator section={section} onSectionChange={setSection}/> : <LoginScreen/>}
        <StatusBar style={statusBarStyle}/>
        <UpdateUi updateResult={updateResult} onUpdateNow={handleUpdateNow}/>
    </>;
}

export default function App() {
    return <SafeAreaProvider>
        <AppThemeProvider>
            <RootApp/>
        </AppThemeProvider>
    </SafeAreaProvider>;
}
