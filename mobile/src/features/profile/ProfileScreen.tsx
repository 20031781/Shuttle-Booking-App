import {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

import {logoutCurrentSession} from '@/api/authSession';
import {createProfileRepository} from '@/api/profileRepository';
import {PageContainer} from '@/components/PageContainer';
import {SectionTitle} from '@/components/SectionTitle';
import {SkeletonBlock} from '@/components/SkeletonBlock';
import {t} from '@/i18n';
import type {AppThemeColors} from '@/theme/colors';
import {createGlobalStyles} from '@/theme/globalStyles';
import {useAppTheme} from '@/theme/theme';
import type {UserProfile} from '@/types/domain';
import {getFriendlyErrorMessage} from '@/lib/errors';

const repository = createProfileRepository();

function getFullName(profile: UserProfile): string {
    return `${profile.firstName} ${profile.lastName}`.trim();
}

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

type ProfileScreenProps = {
    isAdmin: boolean;
    onOpenSettings: () => void;
};

type ThemeOption = {
    id: 'system' | 'aurora-glass';
    label: string;
};

export function ProfileScreen({isAdmin, onOpenSettings}: ProfileScreenProps) {
    const {colors, preference, isPreferenceLoaded, setPreference} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [nameError, setNameError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [savingName, setSavingName] = useState(false);
    const [firstNameInput, setFirstNameInput] = useState('');
    const [lastNameInput, setLastNameInput] = useState('');
    const [usernameInput, setUsernameInput] = useState('');
    const themeOptions: ThemeOption[] = [
        {
            id: 'system',
            label: t.profile.themeOptions.system
        },
        {
            id: 'aurora-glass',
            label: t.profile.themeOptions.auroraGlass
        }
    ];

    async function loadProfile() {
        setLoadError(null);

        try {
            const currentProfile = await repository.get();
            setProfile(currentProfile);
            setFirstNameInput(currentProfile.firstName);
            setLastNameInput(currentProfile.lastName);
            setUsernameInput(currentProfile.username);
        } catch (requestError) {
            setLoadError(getFriendlyErrorMessage(requestError, t.profile.loadErrorMessage));
        } finally {
            setLoading(false);
        }
    }

    async function saveName() {
        const firstName = firstNameInput.trim();
        const lastName = lastNameInput.trim();

        const username = usernameInput.trim();

        if (!firstName || !lastName || !username) {
            setNameError(t.profile.nameOrUsernameRequired);
            return;
        }

        setSavingName(true);
        setNameError(null);

        try {
            const updatedProfile = await repository.updateProfile(firstName, lastName, username);
            setProfile(updatedProfile);
            setFirstNameInput(updatedProfile.firstName);
            setLastNameInput(updatedProfile.lastName);
            setUsernameInput(updatedProfile.username);
            setIsEditingName(false);
        } catch (requestError) {
            setNameError(getFriendlyErrorMessage(requestError, t.profile.updateProfileFailed));
        } finally {
            setSavingName(false);
        }
    }

    useEffect(() => void loadProfile(), []);

    return <PageContainer>
        <SectionTitle title={t.profile.title} subtitle={t.profile.subtitle} badge={t.profile.badge}/>
        {loading ? <ProfileSkeleton/> : loadError ? <View style={[globalStyles.card, styles.card]}>
            <Text style={styles.errorTitle}>{t.profile.loadErrorTitle}</Text>
            <Text style={styles.errorMessage}>{loadError}</Text>
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
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.profileSettings.title}
                    onPress={onOpenSettings}
                    hitSlop={12}
                    style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={18} color={colors.subtleText}/>
                </Pressable>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(getFullName(profile))}</Text>
                </View>
                <View style={styles.heroText}>
                    <Text style={styles.heroTitle}>{getFullName(profile)}</Text>
                    <Text style={styles.heroSubtitle}>{profile.email}</Text>
                </View>
            </View>

            <View style={[globalStyles.card, styles.card]}>
                {!isEditingName ? <View style={styles.row}>
                    <Text style={styles.label}>{t.profile.labels.fullName}</Text>
                    <Text style={styles.value}>{getFullName(profile)}</Text>
                </View> : <>
                    <View style={styles.row}>
                        <Text style={styles.label}>{t.profile.labels.firstName}</Text>
                        <TextInput
                            value={firstNameInput}
                            onChangeText={setFirstNameInput}
                            placeholder={t.profile.placeholders.firstName}
                            placeholderTextColor={colors.mutedText}
                            style={styles.nameInput}
                            autoCapitalize="words"
                            autoCorrect={false}
                        />
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>{t.profile.labels.lastName}</Text>
                        <TextInput
                            value={lastNameInput}
                            onChangeText={setLastNameInput}
                            placeholder={t.profile.placeholders.lastName}
                            placeholderTextColor={colors.mutedText}
                            style={styles.nameInput}
                            autoCapitalize="words"
                            autoCorrect={false}
                        />
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>{t.profile.labels.username}</Text>
                        <TextInput
                            value={usernameInput}
                            onChangeText={setUsernameInput}
                            placeholder={t.profile.placeholders.username}
                            placeholderTextColor={colors.mutedText}
                            style={styles.nameInput}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="username"
                            textContentType="username"
                        />
                    </View>
                </>}
                <View style={styles.row}>
                    <Text style={styles.label}>{t.profile.labels.email}</Text>
                    <Text style={styles.value}>{profile.email}</Text>
                </View>
                {!isEditingName ? <View style={styles.row}>
                    <Text style={styles.label}>{t.profile.labels.username}</Text>
                    <Text style={styles.value}>{profile.username || t.profile.missingValue}</Text>
                </View> : null}
                <View style={styles.row}>
                    <Text style={styles.label}>{t.profile.labels.city}</Text>
                    <Text style={styles.value}>{profile.city || t.profile.missingValue}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>{t.profile.labels.club}</Text>
                    <Text style={styles.value}>{profile.club || t.profile.missingValue}</Text>
                </View>

                {nameError ? <Text style={styles.nameError}>{nameError}</Text> : null}

                {!isEditingName ? <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                        setFirstNameInput(profile.firstName);
                        setLastNameInput(profile.lastName);
                        setUsernameInput(profile.username);
                        setNameError(null);
                        setIsEditingName(true);
                    }}
                    style={[globalStyles.outlineButton, styles.fullWidthActionButton]}>
                    <Text style={globalStyles.outlineButtonText}>{t.profile.editName}</Text>
                </Pressable> : <View style={styles.actionsRow}>
                    <Pressable
                        accessibilityRole="button"
                        disabled={savingName}
                        onPress={() => void saveName()}
                        style={[
                            globalStyles.primaryButton,
                            styles.splitActionButton,
                            savingName && styles.disabledButton
                        ]}>
                        <Text style={globalStyles.primaryButtonText}>
                            {savingName ? t.profile.savingName : t.profile.saveName}
                        </Text>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        disabled={savingName}
                        onPress={() => {
                            setFirstNameInput(profile.firstName);
                            setLastNameInput(profile.lastName);
                            setUsernameInput(profile.username);
                            setNameError(null);
                            setIsEditingName(false);
                        }}
                        style={[
                            globalStyles.outlineButton,
                            styles.splitActionButton,
                            savingName && styles.disabledButton
                        ]}>
                        <Text style={globalStyles.outlineButtonText}>{t.profile.cancelEdit}</Text>
                    </Pressable>
                </View>}
            </View>

            {isAdmin ? <View style={[globalStyles.card, styles.themeCard]}>
                <Text style={styles.themeTitle}>{t.profile.themeSelectorTitle}</Text>
                <Text style={styles.themeSubtitle}>{t.profile.themeSelectorSubtitle}</Text>
                {!isPreferenceLoaded ? <Text style={styles.themeLoadingText}>{t.profile.themeLoading}</Text> :
                    <View style={styles.themeOptionsRow}>
                        {themeOptions.map(option => {
                            const active = preference === option.id;

                            return <Pressable
                                key={option.id}
                                accessibilityRole="button"
                                onPress={() => setPreference(option.id)}
                                style={[styles.themeOption, active && styles.themeOptionActive]}>
                                <Text style={[styles.themeOptionText, active && styles.themeOptionTextActive]}>
                                    {option.label}
                                </Text>
                            </Pressable>;
                        })}
                    </View>}
            </View> : null}

            <Pressable
                accessibilityRole="button"
                disabled={loggingOut}
                onPress={() => {
                    setLoggingOut(true);
                    void logoutCurrentSession().finally(() => setLoggingOut(false));
                }}
                style={[globalStyles.outlineButton, styles.logoutButton, loggingOut && styles.disabledButton]}>
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
            gap: 12,
            position: 'relative'
        },
        settingsButton: {
            position: 'absolute',
            top: 8,
            right: 8,
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceSecondary,
            borderWidth: 1,
            borderColor: colors.border,
            zIndex: 2
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
        themeCard: {
            gap: 8
        },
        themeTitle: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 15
        },
        themeSubtitle: {
            color: colors.subtleText,
            fontSize: 13
        },
        themeLoadingText: {
            color: colors.subtleText,
            fontSize: 12
        },
        themeOptionsRow: {
            flexDirection: 'row',
            gap: 8
        },
        themeOption: {
            flex: 1,
            minHeight: 42,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            backgroundColor: colors.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 10
        },
        themeOptionActive: {
            borderColor: colors.primary,
            backgroundColor: colors.primarySoft
        },
        themeOptionText: {
            color: colors.text,
            fontWeight: '600',
            fontSize: 13
        },
        themeOptionTextActive: {
            color: colors.primary
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
        nameInput: {
            borderWidth: 1,
            borderColor: colors.borderStrong,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: colors.text,
            backgroundColor: colors.surface
        },
        nameError: {
            color: colors.danger,
            fontSize: 13
        },
        actionsRow: {
            flexDirection: 'row',
            gap: 8
        },
        fullWidthActionButton: {
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center'
        },
        splitActionButton: {
            flex: 1,
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center'
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
        disabledButton: {
            opacity: 0.55
        }
    });
