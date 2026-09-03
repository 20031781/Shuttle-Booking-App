import {Ionicons} from '@expo/vector-icons';
import {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';

import {
    checkApiReachability,
    getApiStatusSnapshot,
    subscribeToApiStatus,
    type ApiStatusSnapshot
} from '@/api/apiStatus';
import {isNetworkOnline, subscribeToNetworkChanges} from '@/api/networkStatus';
import {t} from '@/i18n';
import type {AppThemeColors} from '@/theme/colors';
import {useAppTheme} from '@/theme/theme';

/**
 * Stato di connessione visibile anche prima del login.
 *
 * Il banner non interpreta una risposta HTTP 4xx/5xx come rete assente: il
 * client aggiorna lo stato a "raggiungibile" per qualunque risposta ricevuta.
 * In questo modo segnala soltanto assenza di rete o backend non contattabile.
 */
export function ApiStatusBanner() {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const [apiStatus, setApiStatus] = useState<ApiStatusSnapshot>(getApiStatusSnapshot);
    const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
    const [retrying, setRetrying] = useState(false);

    useEffect(() => subscribeToApiStatus(setApiStatus), []);

    useEffect(() => {
        let mounted = true;
        void isNetworkOnline()
            .then(value => {
                if (mounted) {
                    setIsInternetReachable(value);
                }
            })
            .catch(() => {
                if (mounted) {
                    setIsInternetReachable(null);
                }
            });

        const unsubscribe = subscribeToNetworkChanges(value => {
            if (mounted) {
                setIsInternetReachable(value);
            }
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);

    const isOffline = isInternetReachable === false;
    const isApiUnavailable = !isOffline && apiStatus.isApiReachable === false;

    if (!isOffline && !isApiUnavailable) {
        return null;
    }

    const iconName = isOffline ? 'cloud-offline-outline' : 'server-outline';
    const title = isOffline ? t.api.offlineTitle : t.api.unavailableTitle;
    const message = isOffline ? t.api.offlineMessage : t.api.unavailableMessage;

    const handleRetry = async () => {
        if (retrying) {
            return;
        }

        setRetrying(true);
        try {
            const online = await isNetworkOnline().catch(() => false);
            setIsInternetReachable(online);
            await checkApiReachability(true);
        } finally {
            setRetrying(false);
        }
    };

    return <View accessibilityRole="alert" style={styles.banner}>
        <Ionicons name={iconName} size={21} color={colors.warning}/>
        <View style={styles.copy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
        </View>
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.api.retry}
            disabled={retrying}
            onPress={() => void handleRetry()}
            style={[styles.retryButton, retrying && styles.retryButtonDisabled]}>
            {retrying ? <ActivityIndicator size="small" color={colors.warning}/> :
                <Text style={styles.retryText}>{t.api.retry}</Text>}
        </Pressable>
    </View>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        banner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.warning,
            backgroundColor: colors.warningBackground
        },
        copy: {
            flex: 1,
            gap: 2
        },
        title: {
            color: colors.text,
            fontSize: 13,
            fontWeight: '700'
        },
        message: {
            color: colors.subtleText,
            fontSize: 12,
            lineHeight: 16
        },
        retryButton: {
            minHeight: 34,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.warning,
            paddingHorizontal: 10,
            alignItems: 'center',
            justifyContent: 'center'
        },
        retryButtonDisabled: {
            opacity: 0.6
        },
        retryText: {
            color: colors.warning,
            fontSize: 12,
            fontWeight: '700'
        }
    });
