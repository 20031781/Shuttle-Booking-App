import {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Switch, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

import {
    loadNotificationPreferences,
    loadUpdatePreviewMode,
    type NotificationPreferences,
    saveNotificationPreferences,
    saveUpdatePreviewMode
} from '@/api/appPreferences';
import {syncNotificationPreferences} from '@/api/notificationPreferencesRepository';
import {PageContainer} from '@/components/PageContainer';
import {SectionTitle} from '@/components/SectionTitle';
import {t} from '@/i18n';
import type {AppThemeColors} from '@/theme/colors';
import {createGlobalStyles} from '@/theme/globalStyles';
import {useAppTheme} from '@/theme/theme';
import type {UpdatePreviewMode} from '@/update';

type SettingsToggleKey = keyof NotificationPreferences;

type ProfileSettingsScreenProps = {
    onBack: () => void;
    isAdmin: boolean;
};

const updatePreviewOptions: Array<{mode: UpdatePreviewMode; label: string}> = [
    {mode: 'none', label: t.profileSettings.updatePreview.none},
    {mode: 'optional', label: t.profileSettings.updatePreview.optional},
    {mode: 'required', label: t.profileSettings.updatePreview.required}
];

type ToggleItem = {
    key: SettingsToggleKey;
    title: string;
    subtitle: string;
    iconName: keyof typeof Ionicons.glyphMap;
};

const toggleItems: ToggleItem[] = [
    {
        key: 'bookingConfirmations',
        title: t.profileSettings.items.bookingConfirmationsTitle,
        subtitle: t.profileSettings.items.bookingConfirmationsSubtitle,
        iconName: 'checkmark-done-circle-outline'
    },
    {
        key: 'bookingCancellations',
        title: t.profileSettings.items.bookingCancellationsTitle,
        subtitle: t.profileSettings.items.bookingCancellationsSubtitle,
        iconName: 'close-circle-outline'
    },
    {
        key: 'shuttleReminderOneHour',
        title: t.profileSettings.items.shuttleReminderOneHourTitle,
        subtitle: t.profileSettings.items.shuttleReminderOneHourSubtitle,
        iconName: 'time-outline'
    },
    {
        key: 'shuttleReminderDayBefore',
        title: t.profileSettings.items.shuttleReminderDayBeforeTitle,
        subtitle: t.profileSettings.items.shuttleReminderDayBeforeSubtitle,
        iconName: 'calendar-outline'
    },
    {
        key: 'seatAvailabilityAlerts',
        title: t.profileSettings.items.seatAvailabilityAlertsTitle,
        subtitle: t.profileSettings.items.seatAvailabilityAlertsSubtitle,
        iconName: 'notifications-outline'
    },
    {
        key: 'systemAnnouncements',
        title: t.profileSettings.items.systemAnnouncementsTitle,
        subtitle: t.profileSettings.items.systemAnnouncementsSubtitle,
        iconName: 'megaphone-outline'
    }
];

export function ProfileSettingsScreen({onBack, isAdmin}: ProfileSettingsScreenProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [updatePreviewMode, setUpdatePreviewMode] = useState<UpdatePreviewMode>('none');

    useEffect(() => {
        let cancelled = false;

        void loadNotificationPreferences()
            .then(value => {
                if (!cancelled) {
                    setPreferences(value);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError(t.profileSettings.loadError);
                }
            });

        void loadUpdatePreviewMode()
            .then(mode => {
                if (!cancelled) {
                    setUpdatePreviewMode(mode);
                }
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, []);

    async function changeUpdatePreviewMode(mode: UpdatePreviewMode) {
        setUpdatePreviewMode(mode);
        try {
            await saveUpdatePreviewMode(mode);
        } catch {
            setError(t.profileSettings.saveError);
        }
    }

    async function updatePreference(key: SettingsToggleKey, value: boolean) {
        if (!preferences) {
            return;
        }

        const nextPreferences = {
            ...preferences,
            [key]: value
        };
        setPreferences(nextPreferences);
        setSaving(true);
        setError(null);

        try {
            await saveNotificationPreferences(nextPreferences);
            await syncNotificationPreferences(nextPreferences);
        } catch {
            setError(t.profileSettings.saveError);
        } finally {
            setSaving(false);
        }
    }

    return <PageContainer>
        <View style={styles.headerRow}>
            <Pressable
                accessibilityRole="button"
                onPress={onBack}
                style={[globalStyles.outlineButton, styles.backButton]}>
                <Ionicons name="arrow-back" size={16} color={colors.text}/>
                <Text style={globalStyles.outlineButtonText}>{t.profileSettings.back}</Text>
            </Pressable>
        </View>

        <SectionTitle
            title={t.profileSettings.title}
            subtitle={t.profileSettings.subtitle}
            badge={t.profileSettings.badge}
        />

        <View style={[globalStyles.card, styles.settingsCard]}>
            {toggleItems.map(item => <View key={item.key} style={styles.settingRow}>
                <View style={styles.settingContent}>
                    <View style={styles.settingTitleRow}>
                        <Ionicons name={item.iconName} size={16} color={colors.subtleText}/>
                        <Text style={styles.settingTitle}>{item.title}</Text>
                    </View>
                    <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                </View>
                <Switch
                    value={Boolean(preferences?.[item.key])}
                    onValueChange={value => void updatePreference(item.key, value)}
                    disabled={!preferences || saving}
                    trackColor={{false: colors.borderStrong, true: colors.primary}}
                    thumbColor={colors.onPrimary}
                />
            </View>)}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {isAdmin ? <View style={[globalStyles.card, styles.settingsCard]}>
            <View style={styles.settingContent}>
                <View style={styles.settingTitleRow}>
                    <Ionicons name="construct-outline" size={16} color={colors.subtleText}/>
                    <Text style={styles.settingTitle}>{t.profileSettings.updatePreview.title}</Text>
                </View>
                <Text style={styles.settingSubtitle}>{t.profileSettings.updatePreview.subtitle}</Text>
            </View>
            <View style={styles.optionRow}>
                {updatePreviewOptions.map(option => {
                    const selected = updatePreviewMode === option.mode;

                    return <Pressable
                        key={option.mode}
                        accessibilityRole="button"
                        accessibilityState={selected ? {selected: true} : {}}
                        onPress={() => void changeUpdatePreviewMode(option.mode)}
                        style={[
                            selected ? globalStyles.primaryButton : globalStyles.outlineButton,
                            styles.optionButton
                        ]}>
                        <Text style={selected ? globalStyles.primaryButtonText : globalStyles.outlineButtonText}>
                            {option.label}
                        </Text>
                    </Pressable>;
                })}
            </View>
        </View> : null}
    </PageContainer>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        headerRow: {
            flexDirection: 'row',
            justifyContent: 'flex-start'
        },
        backButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 40
        },
        settingsCard: {
            gap: 12
        },
        settingRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingVertical: 4
        },
        settingContent: {
            flex: 1,
            gap: 3
        },
        settingTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6
        },
        settingTitle: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 14
        },
        settingSubtitle: {
            color: colors.subtleText,
            fontSize: 12
        },
        errorText: {
            color: colors.danger,
            fontSize: 12
        },
        optionRow: {
            flexDirection: 'row',
            gap: 8
        },
        optionButton: {
            flex: 1,
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center'
        }
    });
