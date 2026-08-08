import {useEffect, useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';

import type {CompleteUserProfileInput} from '@/api/profileRepository';
import {OnboardingChecklist, type OnboardingChecklistItem} from '@/components/OnboardingChecklist';
import {PageContainer} from '@/components/PageContainer';
import {SectionTitle} from '@/components/SectionTitle';
import {t} from '@/i18n';
import type {AppThemeColors} from '@/theme/colors';
import {createGlobalStyles} from '@/theme/globalStyles';
import {useAppTheme} from '@/theme/theme';
import type {UserProfile} from '@/types/domain';
import {getFriendlyErrorMessage} from '@/lib/errors';
import {
    getMissingProfileCompletionFields,
    isCityFormatValid,
    isProfileCompletionInputValid,
    normalizeProfileCompletionInput,
    type ProfileCompletionField
} from './profileCompletionValidation';

type CompleteProfileScreenProps = {
    initialProfile: Pick<UserProfile, 'firstName' | 'lastName' | 'club' | 'city'>;
    onSubmit: (input: CompleteUserProfileInput) => Promise<void>;
};

export function CompleteProfileScreen({initialProfile, onSubmit}: CompleteProfileScreenProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);
    const [firstName, setFirstName] = useState(initialProfile.firstName);
    const [lastName, setLastName] = useState(initialProfile.lastName);
    const [club, setClub] = useState(initialProfile.club);
    const [city, setCity] = useState(getInitialCityValue(initialProfile.city));
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setFirstName(initialProfile.firstName);
        setLastName(initialProfile.lastName);
        setClub(initialProfile.club);
        setCity(getInitialCityValue(initialProfile.city));
    }, [initialProfile]);

    // La checklist riusa la stessa validazione della submit, così non può
    // dichiarare completo un campo che poi il salvataggio rifiuta.
    const missingFields = getMissingProfileCompletionFields({firstName, lastName, club, city});
    const checklistItems: OnboardingChecklistItem[] = [
        {key: 'firstName', label: t.profile.labels.firstName},
        {key: 'lastName', label: t.profile.labels.lastName},
        {key: 'club', label: t.profile.labels.club},
        {key: 'city', label: t.profile.labels.city}
    ].map(item => ({
        ...item,
        done: !missingFields.includes(item.key as ProfileCompletionField)
    }));

    async function handleSubmit() {
        const normalizedInput = normalizeProfileCompletionInput({
            firstName,
            lastName,
            club,
            city
        });

        if (!isProfileCompletionInputValid(normalizedInput)) {
            setErrorMessage(t.profileCompletion.requiredError);
            return;
        }

        if (!isCityFormatValid(normalizedInput.city)) {
            setErrorMessage(t.profileCompletion.cityFormatError);
            return;
        }

        setSubmitting(true);
        setErrorMessage(null);

        try {
            await onSubmit(normalizedInput);
        } catch (error) {
            setErrorMessage(getFriendlyErrorMessage(error, t.profileCompletion.updateFailed));
        } finally {
            setSubmitting(false);
        }
    }

    return <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <PageContainer>
            <SectionTitle
                title={t.profileCompletion.title}
                subtitle={t.profileCompletion.subtitle}
                badge={t.profileCompletion.badge}
            />

            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
                <View style={[globalStyles.card, styles.checklistCard]}>
                    <OnboardingChecklist
                        title={t.profileCompletion.checklistTitle}
                        progressLabel={(completed, total) => `${completed} / ${total}`}
                        items={checklistItems}
                    />
                </View>

                <View style={[globalStyles.card, styles.formCard]}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t.profile.labels.firstName}</Text>
                        <TextInput
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder={t.profile.placeholders.firstName}
                            placeholderTextColor={colors.mutedText}
                            autoCapitalize="words"
                            autoCorrect={false}
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t.profile.labels.lastName}</Text>
                        <TextInput
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder={t.profile.placeholders.lastName}
                            placeholderTextColor={colors.mutedText}
                            autoCapitalize="words"
                            autoCorrect={false}
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t.profile.labels.club}</Text>
                        <TextInput
                            value={club}
                            onChangeText={setClub}
                            placeholder={t.profile.placeholders.club}
                            placeholderTextColor={colors.mutedText}
                            autoCapitalize="words"
                            autoCorrect={false}
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t.profile.labels.city}</Text>
                        <TextInput
                            value={city}
                            onChangeText={setCity}
                            placeholder={t.profile.placeholders.city}
                            placeholderTextColor={colors.mutedText}
                            autoCapitalize="words"
                            autoCorrect={false}
                            style={styles.input}
                        />
                        <Text style={styles.hintText}>{t.profileCompletion.cityHint}</Text>
                    </View>

                    {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                    <Pressable
                        accessibilityRole="button"
                        disabled={submitting}
                        onPress={() => void handleSubmit()}
                        style={[globalStyles.primaryButton, styles.submitButton, submitting && styles.disabledButton]}>
                        <Text style={globalStyles.primaryButtonText}>
                            {submitting ? t.profileCompletion.saving : t.profileCompletion.submit}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </PageContainer>
    </KeyboardAvoidingView>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        keyboardContainer: {
            flex: 1
        },
        formContent: {
            flexGrow: 1
        },
        formCard: {
            gap: 12
        },
        checklistCard: {
            marginBottom: 10
        },
        inputGroup: {
            gap: 6
        },
        inputLabel: {
            color: colors.subtleText,
            fontSize: 12,
            textTransform: 'uppercase'
        },
        input: {
            borderWidth: 1,
            borderColor: colors.borderStrong,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 11,
            color: colors.text,
            backgroundColor: colors.surface
        },
        errorText: {
            color: colors.danger,
            fontSize: 13
        },
        hintText: {
            color: colors.mutedText,
            fontSize: 12
        },
        submitButton: {
            marginTop: 4,
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center'
        },
        disabledButton: {
            opacity: 0.55
        }
    });

function getInitialCityValue(city: string): string {
    const normalizedCity = city.trim();
    if (!normalizedCity) {
        return '';
    }

    return normalizedCity.toLowerCase() === 'roma' ? '' : normalizedCity;
}
