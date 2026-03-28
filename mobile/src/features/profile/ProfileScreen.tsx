import {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {logoutCurrentSession} from '../../api/authSession';
import {createProfileRepository} from '../../api/profileRepository';
import {PageContainer} from '../../components/PageContainer';
import {SectionTitle} from '../../components/SectionTitle';
import {SkeletonBlock} from '../../components/SkeletonBlock';
import {t} from '../../i18n';
import type {AppThemeColors} from '../../theme/colors';
import {createGlobalStyles} from '../../theme/globalStyles';
import {useAppTheme} from '../../theme/theme';
import type {UserProfile} from '../../types/domain';

const repository = createProfileRepository();

function getInitials(fullName: string): string {
    return fullName
        .split(' ')
        .filter(chunk => chunk.trim().length > 0)
        .slice(0, 2)
        .map(chunk => chunk[0]?.toUpperCase() ?? '')
        .join('');
}

function ProfileSkeleton() {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);

    return <View style={[globalStyles.card, styles.card]}>
        <View style={styles.row}>
            <SkeletonBlock style={styles.skeletonLabel}/>
            <SkeletonBlock style={styles.skeletonValueLong}/>
        </View>
        <View style={styles.row}>
            <SkeletonBlock style={styles.skeletonLabel}/>
            <SkeletonBlock style={styles.skeletonValueMedium}/>
        </View>
        <View style={styles.row}>
            <SkeletonBlock style={styles.skeletonLabel}/>
            <SkeletonBlock style={styles.skeletonValueShort}/>
        </View>
    </View>;
}

export function ProfileScreen() {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);

    async function loadProfile() {
        setError(null);

        try {
            const currentProfile = await repository.get();
            setProfile(currentProfile);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : t.profile.loadErrorMessage);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => void loadProfile(), []);

    return <PageContainer>
        <SectionTitle title={t.profile.title} subtitle={t.profile.subtitle} badge={t.profile.badge}/>
        {loading ? <ProfileSkeleton/> : error ? <View style={[globalStyles.card, styles.card]}>
            <Text style={styles.errorTitle}>{t.profile.loadErrorTitle}</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Pressable
                accessibilityRole="button"
                onPress={() => {
                    setLoading(true);
                    void loadProfile();
                }}
                style={globalStyles.primaryButton}>
                <Text style={globalStyles.primaryButtonText}>{t.profile.retry}</Text>
            </Pressable>
        </View> : profile ? <View style={styles.profileLayout}>
            <View style={[globalStyles.card, styles.heroCard]}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(profile.fullName)}</Text>
                </View>
                <View style={styles.heroText}>
                    <Text style={styles.heroTitle}>{profile.fullName}</Text>
                    <Text style={styles.heroSubtitle}>{profile.email}</Text>
                </View>
            </View>

            <View style={[globalStyles.card, styles.card]}>
                <View style={styles.row}>
                    <Text style={styles.label}>{t.profile.labels.fullName}</Text>
                    <Text style={styles.value}>{profile.fullName}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>{t.profile.labels.email}</Text>
                    <Text style={styles.value}>{profile.email}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>{t.profile.labels.company}</Text>
                    <Text style={styles.value}>{profile.company}</Text>
                </View>
            </View>

            <Pressable
                accessibilityRole="button"
                disabled={loggingOut}
                onPress={() => {
                    setLoggingOut(true);
                    void logoutCurrentSession().finally(() => setLoggingOut(false));
                }}
                style={[globalStyles.outlineButton, styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}>
                <Text style={globalStyles.outlineButtonText}>
                    {loggingOut ? t.profile.loggingOut : t.profile.logout}
                </Text>
            </Pressable>
        </View> : <Text style={styles.errorMessage}>{t.profile.unavailable}</Text>}
    </PageContainer>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        profileLayout: {
            gap: 10
        },
        heroCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12
        },
        avatar: {
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: colors.primarySoft,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            justifyContent: 'center',
            alignItems: 'center'
        },
        avatarText: {
            color: colors.primary,
            fontWeight: '700',
            fontSize: 18
        },
        heroText: {
            flex: 1,
            gap: 2
        },
        heroTitle: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '700'
        },
        heroSubtitle: {
            color: colors.subtleText,
            fontSize: 14
        },
        card: {
            gap: 12
        },
        row: {
            gap: 3
        },
        label: {
            color: colors.subtleText,
            fontSize: 12,
            textTransform: 'uppercase'
        },
        value: {
            color: colors.text,
            fontWeight: '600',
            fontSize: 16
        },
        skeletonLabel: {
            width: 64,
            height: 10,
            borderRadius: 5
        },
        skeletonValueLong: {
            width: '72%',
            height: 18,
            borderRadius: 9
        },
        skeletonValueMedium: {
            width: '58%',
            height: 18,
            borderRadius: 9
        },
        skeletonValueShort: {
            width: '40%',
            height: 18,
            borderRadius: 9
        },
        errorTitle: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '700'
        },
        errorMessage: {
            color: colors.subtleText
        },
        logoutButton: {
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center'
        },
        logoutButtonDisabled: {
            opacity: 0.55
        }
    });
