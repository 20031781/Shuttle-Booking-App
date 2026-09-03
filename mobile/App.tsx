import {DefaultTheme, NavigationContainer, type Theme} from '@react-navigation/native';
import Constants from 'expo-constants';
import {StatusBar} from 'expo-status-bar';
import {type ReactNode, useCallback, useEffect, useRef, useState} from 'react';
import {AppState, Linking, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {
    getSessionSnapshot,
    initializeSessionOnAppStart,
    recoverSessionIfPossible,
    registerDeviceToken,
    subscribeToSessionState
} from '@/api/authSession';
import {checkApiReachability} from '@/api/apiStatus';
import {apiConfig} from '@/api/config';
import {subscribeToNetworkChanges} from '@/api/networkStatus';
import {type CompleteUserProfileInput, createProfileRepository} from '@/api/profileRepository';
import {DialogProvider} from '@/components/DialogProvider';
import {PageContainer} from '@/components/PageContainer';
import {SectionTitle} from '@/components/SectionTitle';
import {LoginScreen} from '@/features/auth/LoginScreen';
import {AppNavigator} from '@/features/navigation/AppNavigator';
import {navigateToTab, navigationRef} from '@/features/navigation/navigationRef';
import {CompleteProfileScreen} from '@/features/profile/CompleteProfileScreen';
import {t} from '@/i18n';
import type {AppThemeColors} from '@/theme/colors';
import {createGlobalStyles} from '@/theme/globalStyles';
import {AppThemeProvider, useAppTheme} from '@/theme/theme';
import type {UserAccess, UserProfile} from '@/types/domain';
import {UpdateUi, useUpdateCheck} from '@/update';
import {type AppResumeTrigger, runAppResumeRecovery} from '@/lib/app-resume';
import {getFriendlyErrorMessage} from '@/lib/errors';
import {resolveNotificationNavigationTarget} from '@/lib/notification-navigation';

const profileRepository = createProfileRepository();

type ProfileBootstrapState = 'idle' | 'loading' | 'required' | 'ready' | 'error';

function canUseNativePushNotifications(): boolean {
    if (Platform.OS === 'web') {
        return false;
    }

    return Constants.executionEnvironment === 'standalone' || Constants.executionEnvironment === 'bare';
}

function RootApp() {
    const [sessionSnapshot, setSessionSnapshot] = useState(getSessionSnapshot);
    const [sessionReady, setSessionReady] = useState(false);
    const [profileBootstrapState, setProfileBootstrapState] = useState<ProfileBootstrapState>('idle');
    const [profileBootstrapError, setProfileBootstrapError] = useState<string | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [access, setAccess] = useState<UserAccess>({isAdmin: false, isManager: false});
    const {colors, statusBarStyle} = useAppTheme();
    const globalStyles = createGlobalStyles(colors);
    const styles = createStyles(colors);
    // Allinea lo sfondo di React Navigation al tema dell'app: senza questo, durante
    // le transizioni si vede il bianco di default sotto le schermate.
    const navigationTheme: Theme = {
        ...DefaultTheme,
        colors: {
            ...DefaultTheme.colors,
            background: colors.background,
            card: colors.surface,
            text: colors.text,
            border: colors.border,
            primary: colors.primary
        }
    };
    const hasRegisteredPushToken = useRef(false);
    const nativePushSupported = canUseNativePushNotifications();
    const updateJsonUrl = (process.env.EXPO_PUBLIC_UPDATE_JSON_URL ?? `${apiConfig.baseUrl}/update.json`).trim();
    const {updateResult} = useUpdateCheck(updateJsonUrl);
    const isAuthenticated = sessionSnapshot.isAuthenticated;

    // Come in Split Expenses, il backend viene controllato anche prima del
    // login: in questo modo una API spenta è visibile nella schermata Google e
    // non resta un fallimento apparentemente silenzioso.
    useEffect(() => {
        void checkApiReachability();
        const intervalId = setInterval(() => {
            void checkApiReachability(true);
        }, 30_000);

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToSessionState(setSessionSnapshot);
        void initializeSessionOnAppStart()
            .catch(error => console.warn('Session bootstrap failed:', error))
            .finally(() => setSessionReady(true));

        return unsubscribe;
    }, []);

    const refreshProfileState = useCallback(async () => {
        setProfileBootstrapError(null);
        setProfileBootstrapState('loading');

        try {
            const [currentProfile, currentAccess] = await Promise.all([
                profileRepository.get(),
                sessionSnapshot.isOfflineMode
                    ? Promise.resolve({isAdmin: false, isManager: false})
                    : profileRepository.getAccess().catch(() => ({isAdmin: false, isManager: false}))
            ]);
            setProfile(currentProfile);
            setAccess(currentAccess);
            setProfileBootstrapState(currentProfile.isProfileCompleted ? 'ready' : 'required');
        } catch (error) {
            setProfileBootstrapError(getFriendlyErrorMessage(error, t.profileCompletion.loadErrorMessage));
            setProfileBootstrapState('error');
        }
    }, [sessionSnapshot.isOfflineMode]);

    useEffect(() => {
        if (!sessionReady) {
            return;
        }

        const recoverAndSync = (trigger: AppResumeTrigger) =>
            void runAppResumeRecovery(trigger, {
                recoverSession: recoverSessionIfPossible,
                refreshProfile: refreshProfileState,
                checkApiReachability,
                onError: (failedTrigger, error) => console.warn(`${failedTrigger} recovery failed:`, error)
            });

        const unsubscribeNetwork = subscribeToNetworkChanges(isOnline => {
            if (!isOnline) {
                return;
            }

            void checkApiReachability(true);
            recoverAndSync('network');
        });

        const appStateSubscription = AppState.addEventListener('change', nextState => {
            if (nextState !== 'active') {
                return;
            }

            void checkApiReachability(true);
            recoverAndSync('appState');
        });

        return () => {
            unsubscribeNetwork();
            appStateSubscription.remove();
        };
    }, [sessionReady, refreshProfileState]);

    const completeFirstAccessProfile = useCallback(async (input: CompleteUserProfileInput) => {
        const updatedProfile = await profileRepository.completeFirstAccessProfile(input);
        setProfile(updatedProfile);
        setProfileBootstrapState(updatedProfile.isProfileCompleted ? 'ready' : 'required');
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            setProfile(null);
            setAccess({isAdmin: false, isManager: false});
            setProfileBootstrapError(null);
            setProfileBootstrapState('idle');
            return;
        }

        void refreshProfileState();
    }, [isAuthenticated, refreshProfileState]);

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
                    // L'API richiede una funzione che restituisca una Promise.
                    handleNotification: () => Promise.resolve({
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

    // Tap su una notifica push: porta l'utente nella sezione pertinente invece di
    // limitarsi ad aprire l'app sull'ultima schermata usata.
    useEffect(() => {
        if (!nativePushSupported || !isAuthenticated) {
            return;
        }

        let cancelled = false;
        let subscription: {remove: () => void} | null = null;

        const handleResponse = (data: Record<string, unknown> | undefined) => {
            const target = resolveNotificationNavigationTarget(data);
            if (target) {
                navigateToTab(target.tab);
            }
        };

        void import('expo-notifications')
            .then(async Notifications => {
                if (cancelled) {
                    return;
                }

                subscription = Notifications.addNotificationResponseReceivedListener(response => {
                    handleResponse(response.notification.request.content.data);
                });

                // L'app può essere stata avviata proprio dal tap sulla notifica:
                // in quel caso il listener non scatta e va letta la risposta iniziale.
                const initialResponse = await Notifications.getLastNotificationResponseAsync();
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- `cancelled` è mutato dalla cleanup della closure: TypeScript non lo vede e lo restringe a `false`.
                if (!cancelled && initialResponse) {
                    handleResponse(initialResponse.notification.request.content.data);
                }
            })
            .catch(error => console.warn('Unable to handle notification taps:', error));

        return () => {
            cancelled = true;
            subscription?.remove();
        };
    }, [nativePushSupported, isAuthenticated]);

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

        if (!nativePushSupported || hasRegisteredPushToken.current || sessionSnapshot.isOfflineMode) {
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
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- `cancelled` è mutato dalla cleanup della closure: TypeScript non lo vede e lo restringe a `false`.
                if (!token.data || cancelled) {
                    return;
                }

                await registerDeviceToken(token.data, Platform.OS === 'ios' ? 'ios' : 'android');
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- come sopra: la guardia evita di scrivere lo stato dopo lo smontaggio.
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
    }, [isAuthenticated, nativePushSupported, sessionSnapshot.isOfflineMode]);

    let appContent: ReactNode;
    if (!sessionReady) {
        appContent = <PageContainer>
            <SectionTitle
                title={t.auth.title}
                subtitle={t.auth.subtitle}
                badge={t.auth.badge}
            />
            <View style={[globalStyles.card, styles.loadingCard]}>
                <Text style={styles.loadingText}>{t.auth.sessionRestoreInProgress}</Text>
            </View>
        </PageContainer>;
    } else if (!isAuthenticated) {
        appContent = <LoginScreen forcedMessage={sessionSnapshot.reloginMessage}/>;
    } else if (profileBootstrapState === 'loading' || profileBootstrapState === 'idle') {
        appContent = <PageContainer>
            <SectionTitle
                title={t.profileCompletion.title}
                subtitle={t.profileCompletion.subtitle}
                badge={t.profileCompletion.badge}
            />
            <View style={[globalStyles.card, styles.loadingCard]}>
                <Text style={styles.loadingText}>{t.profileCompletion.loading}</Text>
            </View>
        </PageContainer>;
    } else if (profileBootstrapState === 'error') {
        appContent = <PageContainer>
            <SectionTitle
                title={t.profileCompletion.title}
                subtitle={t.profileCompletion.subtitle}
                badge={t.profileCompletion.badge}
            />
            <View style={[globalStyles.card, styles.loadingCard]}>
                <Text style={styles.errorTitle}>{t.profileCompletion.loadErrorTitle}</Text>
                <Text style={styles.loadingText}>{profileBootstrapError ?? t.profileCompletion.loadErrorMessage}</Text>
                <Pressable
                    accessibilityRole="button"
                    onPress={() => void refreshProfileState()}
                    style={[globalStyles.primaryButton, styles.retryButton]}>
                    <Text style={globalStyles.primaryButtonText}>{t.profileCompletion.retry}</Text>
                </Pressable>
            </View>
        </PageContainer>;
    } else if (profileBootstrapState === 'required') {
        appContent = profile ? <CompleteProfileScreen
            initialProfile={profile}
            onSubmit={completeFirstAccessProfile}
        /> : <PageContainer>
            <SectionTitle
                title={t.profileCompletion.title}
                subtitle={t.profileCompletion.subtitle}
                badge={t.profileCompletion.badge}
            />
            <View style={[globalStyles.card, styles.loadingCard]}>
                <Text style={styles.loadingText}>{t.profileCompletion.loading}</Text>
            </View>
        </PageContainer>;
    } else {
        appContent = <NavigationContainer ref={navigationRef} theme={navigationTheme}>
            <AppNavigator showAdmin={access.isAdmin} showManager={access.isManager}/>
        </NavigationContainer>;
    }

    return <>
        {appContent}
        <StatusBar style={statusBarStyle}/>
        <UpdateUi updateResult={updateResult} onUpdateNow={handleUpdateNow}/>
    </>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        loadingCard: {
            gap: 8
        },
        loadingText: {
            color: colors.subtleText
        },
        errorTitle: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '700'
        },
        retryButton: {
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center'
        }
    });

export default function App() {
    return <SafeAreaProvider>
        <AppThemeProvider>
            <DialogProvider>
                <RootApp/>
            </DialogProvider>
        </AppThemeProvider>
    </SafeAreaProvider>;
}
